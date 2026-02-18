import type { Pool } from "pg";
import { DbFileSystem } from "./db-fs.js";
import { createFileSystemTools } from "./tools.js";
import { FileSystemUtils } from "./utils.js";
import { systemPrompt } from "./system-prompt.js";
import type { DatabaseDriver } from "./drivers/types.js";

export * from "./schema.js";
export * from "./db-fs.js";
export * from "./tools.js";
export * from "./utils.js";
export * from "./drivers/types.js";
export * from "./schema/types.js";

export interface DbFsConfig {
	dialect: "postgresql" | "sqlite";
	pool?: Pool;
	connectionString?: string;
	filename?: string;
	sqliteDatabase?: any;
	autoInitialize?: boolean;
}

export interface PgFsConfig {
	pool: Pool;
	autoInitialize?: boolean;
}

export class DbFs {
	public readonly driver: DatabaseDriver;
	public readonly fs: DbFileSystem;
	public readonly tools: ReturnType<typeof createFileSystemTools>;
	public readonly utils: typeof FileSystemUtils;

	private constructor(driver: DatabaseDriver) {
		this.driver = driver;
		this.fs = new DbFileSystem(driver);
		this.tools = createFileSystemTools(this.fs);
		this.utils = FileSystemUtils;
	}

	static async create(config: DbFsConfig): Promise<DbFs> {
		let driver: DatabaseDriver;

		if (config.dialect === "postgresql") {
			const { PostgresDriver } = await import("./drivers/pg.js");

			let pool: Pool;
			if (config.pool) {
				pool = config.pool;
			} else if (config.connectionString) {
				const pg = await import("pg");
				pool = new pg.default.Pool({
					connectionString: config.connectionString,
				});
			} else {
				throw new Error(
					"PostgreSQL backend requires either 'pool' or 'connectionString' in config",
				);
			}

			driver = new PostgresDriver(pool);
		} else if (config.dialect === "sqlite") {
			const { SqliteDriver } = await import("./drivers/sqlite.js");

			let database: any;
			if (config.sqliteDatabase) {
				database = config.sqliteDatabase;
			} else {
				try {
					const BetterSqlite3 = await import("better-sqlite3");
					database = new BetterSqlite3.default(
						config.filename || ":memory:",
					);
				} catch {
					throw new Error(
						"SQLite backend requires 'better-sqlite3' package. Install it: npm install better-sqlite3",
					);
				}
			}

			driver = new SqliteDriver(database);
		} else {
			throw new Error(`Unsupported dialect: ${config.dialect}`);
		}

		const instance = new DbFs(driver);

		if (config.autoInitialize !== false) {
			await instance.fs.initialize();
		}

		return instance;
	}

	async initialize(): Promise<void> {
		await this.fs.initialize();
	}

	async garbageCollect(): Promise<number> {
		return await this.driver.garbageCollect();
	}
}

export async function createDbFs(config: DbFsConfig): Promise<DbFs> {
	return await DbFs.create(config);
}

export async function createPgFs(connectionString: string): Promise<DbFs> {
	return await DbFs.create({
		dialect: "postgresql",
		connectionString,
	});
}

export async function createSqliteFs(filename?: string): Promise<DbFs> {
	return await DbFs.create({
		dialect: "sqlite",
		filename: filename || ":memory:",
	});
}

export { DbFs as PgFs };

export const TestSystemPrompt = systemPrompt;
