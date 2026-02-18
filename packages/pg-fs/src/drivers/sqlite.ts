import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq, and, like, sql, desc } from "drizzle-orm";
import type BetterSqlite3 from "better-sqlite3";
import * as schema from "../schema/sqlite.js";
import type { DatabaseDriver } from "./types.js";
import type { NodeRecord, NewNodeRecord } from "../schema/types.js";
import { FileSystemUtils } from "../utils.js";

export class SqliteDriver implements DatabaseDriver {
	private db: BetterSQLite3Database<typeof schema>;

	constructor(database: BetterSqlite3.Database) {
		this.db = drizzle(database, { schema });
		database.pragma("journal_mode = WAL");
		database.pragma("foreign_keys = ON");
	}

	async initialize(): Promise<void> {
		this.db.run(sql`CREATE TABLE IF NOT EXISTS nodes (
			id TEXT PRIMARY KEY,
			path TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			tree_path TEXT NOT NULL,
			parent_id TEXT REFERENCES nodes(id) ON DELETE CASCADE,
			is_directory INTEGER NOT NULL DEFAULT 0,
			size INTEGER NOT NULL DEFAULT 0,
			mime_type TEXT,
			content_hash TEXT,
			created_at INTEGER NOT NULL,
			modified_at INTEGER NOT NULL,
			accessed_at INTEGER NOT NULL,
			mode TEXT NOT NULL DEFAULT '0644',
			owner TEXT NOT NULL DEFAULT 'default',
			metadata TEXT DEFAULT '{}'
		)`);

		this.db.run(sql`CREATE TABLE IF NOT EXISTS content_blocks (
			hash TEXT PRIMARY KEY,
			data TEXT NOT NULL,
			size INTEGER NOT NULL,
			ref_count INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL,
			last_accessed_at INTEGER NOT NULL
		)`);

		this.db.run(sql`CREATE TABLE IF NOT EXISTS search_index (
			node_id TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
			search_vector TEXT,
			text_content TEXT,
			updated_at INTEGER NOT NULL
		)`);

		this.db.run(sql`CREATE TABLE IF NOT EXISTS versions (
			id TEXT PRIMARY KEY,
			node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
			version INTEGER NOT NULL,
			content_hash TEXT NOT NULL REFERENCES content_blocks(hash),
			size INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			created_by TEXT NOT NULL,
			comment TEXT,
			UNIQUE(node_id, version)
		)`);

		this.db.run(
			sql`CREATE INDEX IF NOT EXISTS path_idx ON nodes(path)`,
		);
		this.db.run(
			sql`CREATE INDEX IF NOT EXISTS parent_idx ON nodes(parent_id)`,
		);
		this.db.run(
			sql`CREATE INDEX IF NOT EXISTS tree_path_idx ON nodes(tree_path)`,
		);
		this.db.run(
			sql`CREATE INDEX IF NOT EXISTS name_idx ON nodes(name)`,
		);
		this.db.run(
			sql`CREATE INDEX IF NOT EXISTS parent_name_idx ON nodes(parent_id, name)`,
		);
		this.db.run(
			sql`CREATE INDEX IF NOT EXISTS modified_idx ON nodes(modified_at)`,
		);
		this.db.run(
			sql`CREATE INDEX IF NOT EXISTS ref_count_idx ON content_blocks(ref_count)`,
		);
		this.db.run(
			sql`CREATE INDEX IF NOT EXISTS last_access_idx ON content_blocks(last_accessed_at)`,
		);
		this.db.run(
			sql`CREATE INDEX IF NOT EXISTS search_vector_idx ON search_index(search_vector)`,
		);

		const root = await this.findNodeByPath("/");
		if (!root) {
			const rootId = FileSystemUtils.generateId();
			await this.insertNode({
				id: rootId,
				path: "/",
				name: "",
				treePath: "root",
				parentId: null,
				isDirectory: true,
				size: 0,
				mode: "0755",
				owner: "system",
			});
		}
	}

	async findNodeByPath(path: string): Promise<NodeRecord | undefined> {
		const normalized = FileSystemUtils.normalizePath(path);
		const result = await this.db.query.nodes.findFirst({
			where: eq(schema.nodes.path, normalized),
		});
		return result as NodeRecord | undefined;
	}

	async insertNode(node: NewNodeRecord): Promise<void> {
		await this.db.insert(schema.nodes).values(node);
	}

	async updateNode(id: string, data: Partial<NodeRecord>): Promise<void> {
		await this.db
			.update(schema.nodes)
			.set(data)
			.where(eq(schema.nodes.id, id));
	}

	async deleteNode(id: string): Promise<void> {
		await this.db.delete(schema.nodes).where(eq(schema.nodes.id, id));
	}

	async findChildNodes(parentId: string): Promise<NodeRecord[]> {
		const results = await this.db.query.nodes.findMany({
			where: eq(schema.nodes.parentId, parentId),
			orderBy: [desc(schema.nodes.isDirectory), schema.nodes.name],
		});
		return results as NodeRecord[];
	}

	async findDescendantsByPathPrefix(
		pathPrefix: string,
	): Promise<NodeRecord[]> {
		const results = await this.db.query.nodes.findMany({
			where: like(schema.nodes.path, `${pathPrefix}/%`),
		});
		return results as NodeRecord[];
	}

	async findNodesByGlob(
		basePath: string,
		namePattern: string,
		limit: number,
	): Promise<NodeRecord[]> {
		const results = await this.db.query.nodes.findMany({
			where: and(
				like(schema.nodes.path, `${basePath}%`),
				like(schema.nodes.name, namePattern),
			),
			limit,
		});
		return results as NodeRecord[];
	}

	async getContent(hash: string): Promise<string> {
		const block = await this.db.query.contentBlocks.findFirst({
			where: eq(schema.contentBlocks.hash, hash),
		});

		if (!block) {
			throw new Error(`Content not found: ${hash}`);
		}

		await this.db
			.update(schema.contentBlocks)
			.set({ lastAccessedAt: new Date() })
			.where(eq(schema.contentBlocks.hash, hash));

		return block.data;
	}

	async getOrCreateContent(content: string): Promise<string> {
		const hash = FileSystemUtils.hashContent(content);
		const size = Buffer.byteLength(content, "utf8");

		const existing = await this.db.query.contentBlocks.findFirst({
			where: eq(schema.contentBlocks.hash, hash),
		});

		if (existing) {
			await this.incrementRefCount(hash);
			return hash;
		}

		await this.db.insert(schema.contentBlocks).values({
			hash,
			data: content,
			size,
			refCount: 1,
		});

		return hash;
	}

	async incrementRefCount(hash: string): Promise<void> {
		await this.db
			.update(schema.contentBlocks)
			.set({
				refCount: sql`${schema.contentBlocks.refCount} + 1`,
				lastAccessedAt: new Date(),
			})
			.where(eq(schema.contentBlocks.hash, hash));
	}

	async decrementRefCount(hash: string): Promise<void> {
		await this.db
			.update(schema.contentBlocks)
			.set({
				refCount: sql`${schema.contentBlocks.refCount} - 1`,
			})
			.where(eq(schema.contentBlocks.hash, hash));
	}

	async garbageCollect(): Promise<number> {
		const result = await this.db
			.delete(schema.contentBlocks)
			.where(eq(schema.contentBlocks.refCount, 0))
			.returning();

		return result.length;
	}

	async updateSearchIndex(
		nodeId: string,
		path: string,
		content?: string,
	): Promise<void> {
		const textContent = content || "";
		const searchText = `${path} ${textContent}`;

		const existing = await this.db.query.searchIndex.findFirst({
			where: eq(schema.searchIndex.nodeId, nodeId),
		});

		if (existing) {
			await this.db
				.update(schema.searchIndex)
				.set({
					textContent,
					searchVector: searchText,
					updatedAt: new Date(),
				})
				.where(eq(schema.searchIndex.nodeId, nodeId));
		} else {
			await this.db.insert(schema.searchIndex).values({
				nodeId,
				textContent,
				searchVector: searchText,
				updatedAt: new Date(),
			});
		}
	}

	async searchContent(
		query: string,
		basePath: string,
		limit: number,
	): Promise<Array<{ nodeId: string; path: string }>> {
		const results = await this.db
			.select({
				nodeId: schema.searchIndex.nodeId,
				path: schema.nodes.path,
			})
			.from(schema.searchIndex)
			.innerJoin(
				schema.nodes,
				eq(schema.searchIndex.nodeId, schema.nodes.id),
			)
			.where(
				and(
					like(schema.nodes.path, `${basePath}%`),
					like(schema.searchIndex.textContent, `%${query}%`),
				),
			)
			.limit(limit);

		return results;
	}
}
