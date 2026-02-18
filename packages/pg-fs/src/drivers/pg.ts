import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, like, sql, desc } from "drizzle-orm";
import type { Pool } from "pg";
import * as schema from "../schema/pg.js";
import type { DatabaseDriver } from "./types.js";
import type { NodeRecord, NewNodeRecord } from "../schema/types.js";
import { FileSystemUtils } from "../utils.js";

export class PostgresDriver implements DatabaseDriver {
	private db: NodePgDatabase<typeof schema>;

	constructor(private pool: Pool) {
		this.db = drizzle(pool, { schema });
	}

	async initialize(): Promise<void> {
		await this.pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

		await this.pool.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'pgfs_search') THEN
					CREATE TEXT SEARCH CONFIGURATION pgfs_search (COPY = english);
				END IF;
			END $$;
		`);

		const root = await this.findNodeByPath("/");
		if (!root) {
			const rootId = FileSystemUtils.generateId();
			await this.db.insert(schema.nodes).values({
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

		await this.db
			.insert(schema.searchIndex)
			.values({
				nodeId,
				textContent,
				searchVector: searchText,
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
