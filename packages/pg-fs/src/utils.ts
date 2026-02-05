import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql, eq, and, like, desc } from "drizzle-orm";
import * as schema from "./schema.js";
import { Pool } from "pg";
import crypto from "crypto";

export type Database = NodePgDatabase<typeof schema>;

/**
 * Initialize the pg-fs database with required extensions and tables
 */
export async function initializeDatabase(pool: Pool): Promise<Database> {
	const db = drizzle(pool, { schema });

	// Create required PostgreSQL extensions
	await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

	// Note: ltree extension for hierarchical paths
	// Uncomment if you want to use ltree (requires PostgreSQL ltree extension)
	// await pool.query(`CREATE EXTENSION IF NOT EXISTS "ltree"`);

	// Create full-text search configuration
	await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'pgfs_search') THEN
        CREATE TEXT SEARCH CONFIGURATION pgfs_search (COPY = english);
      END IF;
    END $$;
  `);

	return db;
}

/**
 * Utility functions for filesystem operations
 */
export class FileSystemUtils {
	constructor(private db: Database) {}

	/**
	 * Generate a content hash for deduplication
	 */
	static hashContent(content: string): string {
		return crypto.createHash("sha256").update(content).digest("hex");
	}

	/**
	 * Generate UUID for node IDs
	 */
	static generateId(): string {
		return crypto.randomUUID();
	}

	/**
	 * Convert file path to tree path format
	 * /home/user/file.txt -> home.user.file_txt
	 */
	static pathToTreePath(path: string): string {
		return path
			.split("/")
			.filter(Boolean)
			.map((segment) => segment.replace(/[^a-zA-Z0-9]/g, "_"))
			.join(".");
	}

	/**
	 * Normalize path (remove trailing slashes, resolve ..)
	 */
	static normalizePath(path: string): string {
		const parts = path.split("/").filter(Boolean);
		const normalized: string[] = [];

		for (const part of parts) {
			if (part === "..") {
				normalized.pop();
			} else if (part !== ".") {
				normalized.push(part);
			}
		}

		return "/" + normalized.join("/");
	}

	/**
	 * Get parent path
	 */
	static getParentPath(path: string): string | null {
		const normalized = FileSystemUtils.normalizePath(path);
		if (normalized === "/") return null;

		const lastSlash = normalized.lastIndexOf("/");
		return lastSlash === 0 ? "/" : normalized.substring(0, lastSlash);
	}

	/**
	 * Get filename from path
	 */
	static getFileName(path: string): string {
		const normalized = FileSystemUtils.normalizePath(path);
		const lastSlash = normalized.lastIndexOf("/");
		return normalized.substring(lastSlash + 1);
	}

	/**
	 * Check if path is valid
	 */
	static isValidPath(path: string): boolean {
		if (!path.startsWith("/")) return false;
		if (path.includes("//")) return false;
		return true;
	}

	/**
	 * Increment content block reference count
	 */
	async incrementRefCount(hash: string): Promise<void> {
		await this.db
			.update(schema.contentBlocks)
			.set({
				refCount: sql`${schema.contentBlocks.refCount} + 1`,
				lastAccessedAt: new Date(),
			})
			.where(eq(schema.contentBlocks.hash, hash));
	}

	/**
	 * Decrement content block reference count
	 */
	async decrementRefCount(hash: string): Promise<void> {
		await this.db
			.update(schema.contentBlocks)
			.set({
				refCount: sql`${schema.contentBlocks.refCount} - 1`,
			})
			.where(eq(schema.contentBlocks.hash, hash));
	}

	/**
	 * Garbage collect unreferenced content blocks
	 */
	async garbageCollect(): Promise<number> {
		const result = await this.db
			.delete(schema.contentBlocks)
			.where(eq(schema.contentBlocks.refCount, 0))
			.returning();

		return result.length;
	}

	/**
	 * Get or create content block (deduplication)
	 */
	async getOrCreateContent(content: string): Promise<string> {
		const hash = FileSystemUtils.hashContent(content);
		const size = Buffer.byteLength(content, "utf8");

		// Check if content already exists
		const existing = await this.db.query.contentBlocks.findFirst({
			where: eq(schema.contentBlocks.hash, hash),
		});

		if (existing) {
			// Increment reference count
			await this.incrementRefCount(hash);
			return hash;
		}

		// Create new content block
		await this.db.insert(schema.contentBlocks).values({
			hash,
			data: content,
			size,
			refCount: 1,
		});

		return hash;
	}

	/**
	 * Update search index for a node
	 */
	async updateSearchIndex(
		nodeId: string,
		path: string,
		content?: string,
	): Promise<void> {
		const textContent = content || "";
		const searchText = `${path} ${textContent}`;

		// Use PostgreSQL's to_tsvector for full-text search
		await this.db
			.insert(schema.searchIndex)
			.values({
				nodeId,
				textContent,
				searchVector: searchText, // In production, use to_tsvector
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: schema.searchIndex.nodeId,
				set: {
					textContent,
					searchVector: searchText,
					updatedAt: new Date(),
				},
			});
	}

	/**
	 * Find node by path
	 */
	async findNodeByPath(path: string): Promise<schema.Node | undefined> {
		const normalized = FileSystemUtils.normalizePath(path);
		return await this.db.query.nodes.findFirst({
			where: eq(schema.nodes.path, normalized),
		});
	}

	/**
	 * List directory contents
	 */
	async listDirectory(path: string): Promise<schema.Node[]> {
		const node = await this.findNodeByPath(path);
		if (!node) {
			throw new Error(`Directory not found: ${path}`);
		}
		if (!node.isDirectory) {
			throw new Error(`Not a directory: ${path}`);
		}

		return await this.db.query.nodes.findMany({
			where: eq(schema.nodes.parentId, node.id),
			orderBy: [desc(schema.nodes.isDirectory), schema.nodes.name],
		});
	}

	/**
	 * Get file content
	 */
	async getContent(hash: string): Promise<string> {
		const block = await this.db.query.contentBlocks.findFirst({
			where: eq(schema.contentBlocks.hash, hash),
		});

		if (!block) {
			throw new Error(`Content not found: ${hash}`);
		}

		// Update last accessed time
		await this.db
			.update(schema.contentBlocks)
			.set({ lastAccessedAt: new Date() })
			.where(eq(schema.contentBlocks.hash, hash));

		return block.data;
	}
}
