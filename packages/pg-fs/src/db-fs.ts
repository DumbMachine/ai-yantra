import type { DatabaseDriver } from "./drivers/types.js";
import { FileSystemUtils } from "./utils.js";

export interface FileStats {
	path: string;
	name: string;
	isDirectory: boolean;
	size: number;
	mimeType?: string;
	createdAt: Date;
	modifiedAt: Date;
	accessedAt: Date;
	mode: string;
	owner: string;
}

export interface WriteOptions {
	mode?: string;
	owner?: string;
	mimeType?: string;
	metadata?: Record<string, any>;
	createParents?: boolean;
}

export interface ReadOptions {
	encoding?: "utf8" | "base64";
	offset?: number;
	limit?: number;
}

export interface ListOptions {
	recursive?: boolean;
	pattern?: string;
	sortBy?: "name" | "modified" | "size" | "created";
	order?: "asc" | "desc";
	limit?: number;
	offset?: number;
}

const MAX_FILE_SIZE_BYTES = 100_000;
const MAX_LINES_PER_READ = 1000;
const MAX_LIST_ITEMS = 500;
const MAX_SEARCH_RESULTS = 100;

export class DbFileSystem {
	constructor(private driver: DatabaseDriver) {}

	async initialize(): Promise<void> {
		await this.driver.initialize();
	}

	async writeFile(
		path: string,
		content: string,
		options: WriteOptions = {},
	): Promise<void> {
		const normalized = FileSystemUtils.normalizePath(path);

		if (!FileSystemUtils.isValidPath(normalized)) {
			throw new Error(`Invalid path: ${path}`);
		}

		const parentPath = FileSystemUtils.getParentPath(normalized);
		if (parentPath && options.createParents) {
			await this.mkdir(parentPath, { recursive: true });
		}

		if (parentPath) {
			const parent = await this.driver.findNodeByPath(parentPath);
			if (!parent) {
				throw new Error(`Parent directory not found: ${parentPath}`);
			}
		}

		const existing = await this.driver.findNodeByPath(normalized);

		const contentHash = await this.driver.getOrCreateContent(content);
		const size = Buffer.byteLength(content, "utf8");
		const fileName = FileSystemUtils.getFileName(normalized);
		const treePath = FileSystemUtils.pathToTreePath(normalized);

		const parent = parentPath
			? await this.driver.findNodeByPath(parentPath)
			: null;

		if (existing) {
			if (existing.isDirectory) {
				throw new Error(`Cannot write to directory: ${path}`);
			}

			if (existing.contentHash) {
				await this.driver.decrementRefCount(existing.contentHash);
			}

			await this.driver.updateNode(existing.id, {
				contentHash,
				size,
				modifiedAt: new Date(),
				mimeType: options.mimeType || existing.mimeType,
				metadata: (options.metadata || existing.metadata) as Record<
					string,
					unknown
				> | null,
			});

			await this.driver.updateSearchIndex(existing.id, normalized, content);
		} else {
			const nodeId = FileSystemUtils.generateId();

			await this.driver.insertNode({
				id: nodeId,
				path: normalized,
				name: fileName,
				treePath,
				parentId: parent?.id || null,
				isDirectory: false,
				contentHash,
				size,
				mode: options.mode || "0644",
				owner: options.owner || "default",
				mimeType: options.mimeType,
				metadata: options.metadata || {},
			});

			await this.driver.updateSearchIndex(nodeId, normalized, content);
		}
	}

	async readFile(path: string, options: ReadOptions = {}): Promise<{
		content: string;
		totalLines?: number;
		totalSize: number;
		hasMore?: boolean;
		offset?: number;
		limit?: number;
	}> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.driver.findNodeByPath(normalized);

		if (!node) {
			throw new Error(`File not found: ${path}`);
		}

		if (node.isDirectory) {
			throw new Error(`Cannot read directory as file: ${path}`);
		}

		if (!node.contentHash) {
			return {
				content: "",
				totalSize: 0,
				totalLines: 0,
			};
		}

		await this.driver.updateNode(node.id, { accessedAt: new Date() });

		const fullContent = await this.driver.getContent(node.contentHash);

		if (options.encoding === "base64") {
			const encoded = Buffer.from(fullContent).toString("base64");
			return {
				content: encoded,
				totalSize: encoded.length,
			};
		}

		const totalSize = Buffer.byteLength(fullContent, "utf8");
		const lines = fullContent.split("\n");
		const totalLines = lines.length;

		if (!options.offset && !options.limit && totalSize <= MAX_FILE_SIZE_BYTES) {
			return {
				content: fullContent,
				totalSize,
				totalLines,
			};
		}

		const offset = Math.max(0, (options.offset || 1) - 1);
		const limit = Math.min(
			options.limit || MAX_LINES_PER_READ,
			MAX_LINES_PER_READ,
		);

		const paginatedLines = lines.slice(offset, offset + limit);
		const content = paginatedLines.join("\n");
		const hasMore = offset + limit < totalLines;

		return {
			content,
			totalLines,
			totalSize,
			hasMore,
			offset: offset + 1,
			limit,
		};
	}

	async mkdir(
		path: string,
		options: { recursive?: boolean; mode?: string; owner?: string } = {},
	): Promise<void> {
		const normalized = FileSystemUtils.normalizePath(path);

		if (!FileSystemUtils.isValidPath(normalized)) {
			throw new Error(`Invalid path: ${path}`);
		}

		const existing = await this.driver.findNodeByPath(normalized);
		if (existing) {
			if (existing.isDirectory) {
				return;
			}
			throw new Error(`File exists at path: ${path}`);
		}

		const parentPath = FileSystemUtils.getParentPath(normalized);

		if (parentPath && parentPath !== "/") {
			const parent = await this.driver.findNodeByPath(parentPath);
			if (!parent) {
				if (options.recursive) {
					await this.mkdir(parentPath, options);
				} else {
					throw new Error(`Parent directory not found: ${parentPath}`);
				}
			}
		}

		const parent = parentPath
			? await this.driver.findNodeByPath(parentPath)
			: null;
		const fileName = FileSystemUtils.getFileName(normalized);
		const treePath = FileSystemUtils.pathToTreePath(normalized);
		const nodeId = FileSystemUtils.generateId();

		await this.driver.insertNode({
			id: nodeId,
			path: normalized,
			name: fileName,
			treePath,
			parentId: parent?.id || null,
			isDirectory: true,
			size: 0,
			mode: options.mode || "0755",
			owner: options.owner || "default",
		});
	}

	async readdir(path: string, options: ListOptions = {}): Promise<{
		items: string[];
		total: number;
		hasMore: boolean;
		offset: number;
		limit: number;
	}> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.driver.findNodeByPath(normalized);

		if (!node) {
			throw new Error(`Directory not found: ${path}`);
		}
		if (!node.isDirectory) {
			throw new Error(`Not a directory: ${path}`);
		}

		const allNodes = await this.driver.findChildNodes(node.id);
		const total = allNodes.length;

		const offset = options.offset || 0;
		const limit = Math.min(
			options.limit || MAX_LIST_ITEMS,
			MAX_LIST_ITEMS,
		);

		const paginatedNodes = allNodes.slice(offset, offset + limit);
		const hasMore = offset + limit < total;

		return {
			items: paginatedNodes.map((n) => n.name),
			total,
			hasMore,
			offset,
			limit,
		};
	}

	async readdirStats(
		path: string,
		options: ListOptions = {},
	): Promise<{
		items: FileStats[];
		total: number;
		hasMore: boolean;
		offset: number;
		limit: number;
	}> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.driver.findNodeByPath(normalized);

		if (!node) {
			throw new Error(`Directory not found: ${path}`);
		}
		if (!node.isDirectory) {
			throw new Error(`Not a directory: ${path}`);
		}

		const allNodes = await this.driver.findChildNodes(node.id);
		const total = allNodes.length;

		const offset = options.offset || 0;
		const limit = Math.min(
			options.limit || MAX_LIST_ITEMS,
			MAX_LIST_ITEMS,
		);

		const paginatedNodes = allNodes.slice(offset, offset + limit);
		const hasMore = offset + limit < total;

		return {
			items: paginatedNodes.map((n) => ({
				path: n.path,
				name: n.name,
				isDirectory: n.isDirectory,
				size: n.size,
				mimeType: n.mimeType || undefined,
				createdAt: n.createdAt,
				modifiedAt: n.modifiedAt,
				accessedAt: n.accessedAt,
				mode: n.mode,
				owner: n.owner,
			})),
			total,
			hasMore,
			offset,
			limit,
		};
	}

	async stat(path: string): Promise<FileStats> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.driver.findNodeByPath(normalized);

		if (!node) {
			throw new Error(`Path not found: ${path}`);
		}

		return {
			path: node.path,
			name: node.name,
			isDirectory: node.isDirectory,
			size: node.size,
			mimeType: node.mimeType || undefined,
			createdAt: node.createdAt,
			modifiedAt: node.modifiedAt,
			accessedAt: node.accessedAt,
			mode: node.mode,
			owner: node.owner,
		};
	}

	async exists(path: string): Promise<boolean> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.driver.findNodeByPath(normalized);
		return node !== undefined;
	}

	async unlink(
		path: string,
		options: { recursive?: boolean } = {},
	): Promise<void> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.driver.findNodeByPath(normalized);

		if (!node) {
			throw new Error(`Path not found: ${path}`);
		}

		if (node.isDirectory) {
			const result = await this.readdir(normalized, { limit: 1 });
			if (result.total > 0 && !options.recursive) {
				throw new Error(`Directory not empty: ${path}`);
			}
		}

		if (node.contentHash) {
			await this.driver.decrementRefCount(node.contentHash);
		}

		await this.driver.deleteNode(node.id);
	}

	async rename(oldPath: string, newPath: string): Promise<void> {
		const normalizedOld = FileSystemUtils.normalizePath(oldPath);
		const normalizedNew = FileSystemUtils.normalizePath(newPath);

		const node = await this.driver.findNodeByPath(normalizedOld);
		if (!node) {
			throw new Error(`Source path not found: ${oldPath}`);
		}

		const existingNew = await this.driver.findNodeByPath(normalizedNew);
		if (existingNew) {
			throw new Error(`Destination path already exists: ${newPath}`);
		}

		const newParentPath = FileSystemUtils.getParentPath(normalizedNew);
		const newParent = newParentPath
			? await this.driver.findNodeByPath(newParentPath)
			: null;

		if (newParentPath && !newParent) {
			throw new Error(
				`Destination parent directory not found: ${newParentPath}`,
			);
		}

		const newFileName = FileSystemUtils.getFileName(normalizedNew);
		const newTreePath = FileSystemUtils.pathToTreePath(normalizedNew);

		await this.driver.updateNode(node.id, {
			path: normalizedNew,
			name: newFileName,
			treePath: newTreePath,
			parentId: newParent?.id || null,
			modifiedAt: new Date(),
		});

		if (node.isDirectory) {
			const descendants =
				await this.driver.findDescendantsByPathPrefix(normalizedOld);

			for (const desc of descendants) {
				const newDescPath = desc.path.replace(normalizedOld, normalizedNew);
				const newDescTreePath = FileSystemUtils.pathToTreePath(newDescPath);

				await this.driver.updateNode(desc.id, {
					path: newDescPath,
					treePath: newDescTreePath,
				});
			}
		}
	}

	async copy(
		sourcePath: string,
		destPath: string,
		options: { recursive?: boolean } = {},
	): Promise<void> {
		const normalizedSource = FileSystemUtils.normalizePath(sourcePath);
		const normalizedDest = FileSystemUtils.normalizePath(destPath);

		const sourceNode = await this.driver.findNodeByPath(normalizedSource);
		if (!sourceNode) {
			throw new Error(`Source path not found: ${sourcePath}`);
		}

		if (sourceNode.isDirectory && !options.recursive) {
			throw new Error(
				`Cannot copy directory without recursive option: ${sourcePath}`,
			);
		}

		if (sourceNode.isDirectory) {
			await this.mkdir(normalizedDest);
			const result = await this.readdir(normalizedSource);

			for (const childName of result.items) {
				const childSourcePath = `${normalizedSource}/${childName}`;
				const childDestPath = `${normalizedDest}/${childName}`;
				await this.copy(childSourcePath, childDestPath, options);
			}
		} else {
			const fileData = await this.readFile(normalizedSource);
			await this.writeFile(normalizedDest, fileData.content, {
				mode: sourceNode.mode,
				owner: sourceNode.owner,
				mimeType: sourceNode.mimeType || undefined,
				createParents: true,
			});
		}
	}

	async glob(
		pattern: string,
		basePath: string = "/",
		limit: number = MAX_SEARCH_RESULTS,
	): Promise<{ matches: string[]; total: number; hasMore: boolean }> {
		const normalizedBase = FileSystemUtils.normalizePath(basePath);
		const likePattern = pattern.replace(/\*/g, "%").replace(/\?/g, "_");

		const nodes = await this.driver.findNodesByGlob(
			normalizedBase,
			likePattern,
			limit + 1,
		);

		const hasMore = nodes.length > limit;
		const matches = nodes.slice(0, limit).map((node) => node.path);

		return {
			matches,
			total: nodes.length,
			hasMore,
		};
	}

	async search(
		query: string,
		basePath: string = "/",
		limit: number = MAX_SEARCH_RESULTS,
	): Promise<{
		results: Array<{ path: string; score: number }>;
		total: number;
		hasMore: boolean;
	}> {
		const normalizedBase = FileSystemUtils.normalizePath(basePath);

		const results = await this.driver.searchContent(
			query,
			normalizedBase,
			limit + 1,
		);

		const hasMore = results.length > limit;
		const filteredResults = results.slice(0, limit).map((r) => ({
			path: r.path,
			score: 1.0,
		}));

		return {
			results: filteredResults,
			total: results.length,
			hasMore,
		};
	}
}

export { DbFileSystem as PgFileSystem };
