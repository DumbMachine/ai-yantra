import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import { PgFileSystem } from "./db-fs.js";
import { createFileSystemTools } from "./tools.js";
import { Database, initializeDatabase, FileSystemUtils } from "./utils.js";
import { systemPrompt } from "./system-prompt.js";

export * from "./schema.js";
export * from "./db-fs.js";
export * from "./tools.js";
export * from "./utils.js";

/**
 * Configuration options for PgFs
 */
export interface PgFsConfig {
	pool: Pool;
	autoInitialize?: boolean;
}

/**
 * Main PgFs class - PostgreSQL-backed filesystem with AI SDK tools
 *
 * @example
 * ```typescript
 * import { Pool } from 'pg';
 * import { PgFs } from 'pg-fs';
 * import { ToolLoopAgent } from 'ai';
 * import { openai } from '@ai-sdk/openai';
 *
 * const pool = new Pool({
 *   connectionString: process.env.DATABASE_URL,
 * });
 *
 * const pgfs = await PgFs.create({ pool });
 *
 * const agent = new ToolLoopAgent({
 *   model: openai('gpt-4'),
 *   instructions: 'You are a helpful file manager assistant.',
 *   tools: pgfs.tools,
 * });
 *
 * const result = await agent.generate({
 *   prompt: 'Create a file at /notes/todo.txt with my tasks',
 * });
 * ```
 */
export class PgFs {
	public readonly db: Database;
	public readonly fs: PgFileSystem;
	public readonly tools: ReturnType<typeof createFileSystemTools>;
	public readonly utils: typeof FileSystemUtils;

	private constructor(pool: Pool) {
		this.db = drizzle(pool, { schema });
		this.fs = new PgFileSystem(this.db);
		this.tools = createFileSystemTools(this.fs);
		this.utils = FileSystemUtils;
	}

	/**
	 * Create and initialize a new PgFs instance
	 */
	static async create(config: PgFsConfig): Promise<PgFs> {
		const instance = new PgFs(config.pool);

		if (config.autoInitialize !== false) {
			await initializeDatabase(config.pool);
			await instance.fs.initialize();
		}

		return instance;
	}

	/**
	 * Create instance without auto-initialization
	 */
	static createSync(pool: Pool): PgFs {
		return new PgFs(pool);
	}

	/**
	 * Initialize database and filesystem (if not auto-initialized)
	 */
	async initialize(): Promise<void> {
		await this.fs.initialize();
	}

	/**
	 * Garbage collect unreferenced content blocks
	 */
	async garbageCollect(): Promise<number> {
		const utils = new FileSystemUtils(this.db);
		return await utils.garbageCollect();
	}
}

/**
 * Quick start helper - creates PgFs with minimal config
 */
export async function createPgFs(connectionString: string): Promise<PgFs> {
	const pool = new Pool({ connectionString });
	return await PgFs.create({ pool });
}

export const TestSystemPrompt = systemPrompt;
