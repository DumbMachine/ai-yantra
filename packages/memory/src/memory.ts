import type { DbFileSystem } from "@ai-yantra/pg-fs";
import { createSqliteFs, type DbFs } from "@ai-yantra/pg-fs";
import { validateMemoryPath } from "./path-validation.js";
import {
	formatFileContent,
	formatDirectoryListing,
	formatEditSnippet,
} from "./formatters.js";
import type { MemoryConfig } from "./types.js";

export class Memory {
	private fs: DbFileSystem;
	private dbFs: DbFs;

	private constructor(dbFs: DbFs) {
		this.dbFs = dbFs;
		this.fs = dbFs.fs;
	}

	static async create(config?: MemoryConfig): Promise<{ memory: Memory; dbFs: DbFs }> {
		let dbFs: DbFs;

		if (config?.sqliteDatabase) {
			const { DbFs: DbFsClass } = await import("@ai-yantra/pg-fs");
			dbFs = await DbFsClass.create({
				dialect: "sqlite",
				sqliteDatabase: config.sqliteDatabase,
			});
		} else {
			dbFs = await createSqliteFs(config?.filename || ":memory:");
		}

		await dbFs.fs.mkdir("/memories", { recursive: true });

		return { memory: new Memory(dbFs), dbFs };
	}

	getDbFs(): DbFs {
		return this.dbFs;
	}

	async view(path: string, viewRange?: number[]): Promise<string> {
		const normalized = validateMemoryPath(path);

		const exists = await this.fs.exists(normalized);
		if (!exists) {
			throw new Error(`Path not found: ${normalized}`);
		}

		const stats = await this.fs.stat(normalized);

		if (stats.isDirectory) {
			const result = await this.fs.readdirStats(normalized);
			const entries: Array<{
				name: string;
				isDirectory: boolean;
				size: number;
				children?: Array<{ name: string; isDirectory: boolean; size: number }>;
			}> = [];

			for (const item of result.items) {
				const entry: typeof entries[number] = {
					name: item.name,
					isDirectory: item.isDirectory,
					size: item.size,
				};

				if (item.isDirectory) {
					try {
						const childResult = await this.fs.readdirStats(item.path);
						entry.children = childResult.items.map((c) => ({
							name: c.name,
							isDirectory: c.isDirectory,
							size: c.size,
						}));
					} catch {
						entry.children = [];
					}
				}

				entries.push(entry);
			}

			return formatDirectoryListing(normalized, entries);
		}

		const fileResult = await this.fs.readFile(normalized);
		return formatFileContent(normalized, fileResult.content, viewRange);
	}

	async createFile(path: string, fileText: string): Promise<string> {
		const normalized = validateMemoryPath(path);

		const exists = await this.fs.exists(normalized);
		if (exists) {
			throw new Error(`Error: File ${normalized} already exists. Use memory_str_replace to edit existing files.`);
		}

		await this.fs.writeFile(normalized, fileText, { createParents: true });
		return `File created successfully at: ${normalized}`;
	}

	async strReplace(path: string, oldStr: string, newStr: string): Promise<string> {
		const normalized = validateMemoryPath(path);

		const result = await this.fs.readFile(normalized);
		const content = result.content;

		const occurrences = content.split(oldStr).length - 1;

		if (occurrences === 0) {
			throw new Error(
				`No replacement was performed, old_str \`${oldStr}\` did not appear verbatim in ${normalized}.`,
			);
		}

		if (occurrences > 1) {
			throw new Error(
				`No replacement was performed. Multiple (${occurrences}) parsing of old_str \`${oldStr}\` in lines of ${normalized}. Please ensure it is unique.`,
			);
		}

		const newContent = content.replace(oldStr, newStr);
		await this.fs.writeFile(normalized, newContent);

		const lines = newContent.split("\n");
		let editLine = 1;
		const idx = newContent.indexOf(newStr);
		if (idx !== -1) {
			editLine = newContent.substring(0, idx).split("\n").length;
		}

		const snippet = formatEditSnippet(normalized, newContent, editLine);
		return `The memory file ${normalized} has been edited.\n${snippet}`;
	}

	async insert(path: string, insertLine: number, insertText: string): Promise<string> {
		const normalized = validateMemoryPath(path);

		const result = await this.fs.readFile(normalized);
		const lines = result.content.split("\n");

		if (insertLine < 0 || insertLine > lines.length) {
			throw new Error(
				`Invalid insert_line: ${insertLine}. Must be between 0 and ${lines.length}.`,
			);
		}

		const newLines = insertText.split("\n");
		lines.splice(insertLine, 0, ...newLines);

		const newContent = lines.join("\n");
		await this.fs.writeFile(normalized, newContent);

		const snippet = formatEditSnippet(normalized, newContent, insertLine + 1);
		return `The file ${normalized} has been edited.\n${snippet}`;
	}

	async delete(path: string): Promise<string> {
		const normalized = validateMemoryPath(path);

		const exists = await this.fs.exists(normalized);
		if (!exists) {
			throw new Error(`Error: Path ${normalized} does not exist.`);
		}

		await this.fs.unlink(normalized, { recursive: true });
		return `Successfully deleted ${normalized}`;
	}

	async rename(oldPath: string, newPath: string): Promise<string> {
		const normalizedOld = validateMemoryPath(oldPath);
		const normalizedNew = validateMemoryPath(newPath);

		const oldExists = await this.fs.exists(normalizedOld);
		if (!oldExists) {
			throw new Error(`Error: Source path ${normalizedOld} does not exist.`);
		}

		const newExists = await this.fs.exists(normalizedNew);
		if (newExists) {
			throw new Error(`Error: Destination path ${normalizedNew} already exists.`);
		}

		const parentPath = normalizedNew.substring(0, normalizedNew.lastIndexOf("/"));
		if (parentPath && parentPath !== "/memories") {
			const parentExists = await this.fs.exists(parentPath);
			if (!parentExists) {
				await this.fs.mkdir(parentPath, { recursive: true });
			}
		}

		await this.fs.rename(normalizedOld, normalizedNew);
		return `Successfully renamed ${normalizedOld} to ${normalizedNew}`;
	}
}
