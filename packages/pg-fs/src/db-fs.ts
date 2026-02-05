import { eq, and, like, sql } from "drizzle-orm";
import * as schema from "./schema.js";
import { Database, FileSystemUtils } from "./utils.js";

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
	offset?: number; // Line number to start from (1-indexed)
	limit?: number; // Number of lines to read
}

export interface ListOptions {
	recursive?: boolean;
	pattern?: string;
	sortBy?: "name" | "modified" | "size" | "created";
	order?: "asc" | "desc";
	limit?: number; // Maximum number of items to return
	offset?: number; // Number of items to skip
}

// Constants for output size management
const MAX_FILE_SIZE_BYTES = 100_000; // ~100KB for single read
const MAX_LINES_PER_READ = 1000; // Max lines to return at once
const MAX_LIST_ITEMS = 500; // Max directory items to return
const MAX_SEARCH_RESULTS = 100; // Max search results to return

/**
 * Core filesystem operations using PostgreSQL as storage
 */
export class PgFileSystem {
	private utils: FileSystemUtils;

	constructor(private db: Database) {
		this.utils = new FileSystemUtils(db);
	}

	/**
	 * Initialize the filesystem with root directory
	 */
	async initialize(): Promise<void> {
		// Create root directory if it doesn't exist
		const root = await this.utils.findNodeByPath("/");
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

	/**
	 * Write file content
	 */
	async writeFile(
		path: string,
		content: string,
		options: WriteOptions = {},
	): Promise<void> {
		const normalized = FileSystemUtils.normalizePath(path);

		if (!FileSystemUtils.isValidPath(normalized)) {
			throw new Error(`Invalid path: ${path}`);
		}

		// Ensure parent directory exists
		const parentPath = FileSystemUtils.getParentPath(normalized);
		if (parentPath && options.createParents) {
			await this.mkdir(parentPath, { recursive: true });
		}

		if (parentPath) {
			const parent = await this.utils.findNodeByPath(parentPath);
			if (!parent) {
				throw new Error(`Parent directory not found: ${parentPath}`);
			}
		}

		// Check if file already exists
		const existing = await this.utils.findNodeByPath(normalized);

		// Create or get content block
		const contentHash = await this.utils.getOrCreateContent(content);
		const size = Buffer.byteLength(content, "utf8");
		const fileName = FileSystemUtils.getFileName(normalized);
		const treePath = FileSystemUtils.pathToTreePath(normalized);

		const parent = parentPath
			? await this.utils.findNodeByPath(parentPath)
			: null;

		if (existing) {
			// Update existing file
			if (existing.isDirectory) {
				throw new Error(`Cannot write to directory: ${path}`);
			}

			// Decrement old content ref count
			if (existing.contentHash) {
				await this.utils.decrementRefCount(existing.contentHash);
			}

			await this.db
				.update(schema.nodes)
				.set({
					contentHash,
					size,
					modifiedAt: new Date(),
					mimeType: options.mimeType || existing.mimeType,
					metadata: options.metadata || existing.metadata,
				})
				.where(eq(schema.nodes.id, existing.id));

			// Update search index
			await this.utils.updateSearchIndex(existing.id, normalized, content);
		} else {
			// Create new file
			const nodeId = FileSystemUtils.generateId();

			await this.db.insert(schema.nodes).values({
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

			// Create search index
			await this.utils.updateSearchIndex(nodeId, normalized, content);
		}
	}

	/**
	 * Read file content with pagination support
	 */
	async readFile(path: string, options: ReadOptions = {}): Promise<{
		content: string;
		totalLines?: number;
		totalSize: number;
		hasMore?: boolean;
		offset?: number;
		limit?: number;
	}> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.utils.findNodeByPath(normalized);

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

		// Update access time
		await this.db
			.update(schema.nodes)
			.set({ accessedAt: new Date() })
			.where(eq(schema.nodes.id, node.id));

		const fullContent = await this.utils.getContent(node.contentHash);

		// Handle base64 encoding without pagination
		if (options.encoding === "base64") {
			const encoded = Buffer.from(fullContent).toString("base64");
			return {
				content: encoded,
				totalSize: encoded.length,
			};
		}

		// Check if file is too large and pagination is needed
		const totalSize = Buffer.byteLength(fullContent, "utf8");
		const lines = fullContent.split("\n");
		const totalLines = lines.length;

		// If no pagination requested and file is small enough, return all
		if (!options.offset && !options.limit && totalSize <= MAX_FILE_SIZE_BYTES) {
			return {
				content: fullContent,
				totalSize,
				totalLines,
			};
		}

		// Apply pagination
		const offset = Math.max(0, (options.offset || 1) - 1); // Convert to 0-indexed
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
			offset: offset + 1, // Return as 1-indexed
			limit,
		};
	}

	/**
	 * Create directory
	 */
	async mkdir(
		path: string,
		options: { recursive?: boolean; mode?: string; owner?: string } = {},
	): Promise<void> {
		const normalized = FileSystemUtils.normalizePath(path);

		if (!FileSystemUtils.isValidPath(normalized)) {
			throw new Error(`Invalid path: ${path}`);
		}

		// Check if already exists
		const existing = await this.utils.findNodeByPath(normalized);
		if (existing) {
			if (existing.isDirectory) {
				return; // Already exists
			}
			throw new Error(`File exists at path: ${path}`);
		}

		const parentPath = FileSystemUtils.getParentPath(normalized);

		if (parentPath && parentPath !== "/") {
			const parent = await this.utils.findNodeByPath(parentPath);
			if (!parent) {
				if (options.recursive) {
					await this.mkdir(parentPath, options);
				} else {
					throw new Error(`Parent directory not found: ${parentPath}`);
				}
			}
		}

		const parent = parentPath
			? await this.utils.findNodeByPath(parentPath)
			: null;
		const fileName = FileSystemUtils.getFileName(normalized);
		const treePath = FileSystemUtils.pathToTreePath(normalized);
		const nodeId = FileSystemUtils.generateId();

		await this.db.insert(schema.nodes).values({
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

	/**
	 * List directory contents with pagination
	 */
	async readdir(path: string, options: ListOptions = {}): Promise<{
		items: string[];
		total: number;
		hasMore: boolean;
		offset: number;
		limit: number;
	}> {
		const allNodes = await this.utils.listDirectory(path);
		const total = allNodes.length;

		// Apply pagination
		const offset = options.offset || 0;
		const limit = Math.min(
			options.limit || MAX_LIST_ITEMS,
			MAX_LIST_ITEMS,
		);

		const paginatedNodes = allNodes.slice(offset, offset + limit);
		const hasMore = offset + limit < total;

		return {
			items: paginatedNodes.map((node) => node.name),
			total,
			hasMore,
			offset,
			limit,
		};
	}

	/**
	 * List directory with detailed stats and pagination
	 */
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
		const allNodes = await this.utils.listDirectory(path);
		const total = allNodes.length;

		// Apply pagination
		const offset = options.offset || 0;
		const limit = Math.min(
			options.limit || MAX_LIST_ITEMS,
			MAX_LIST_ITEMS,
		);

		const paginatedNodes = allNodes.slice(offset, offset + limit);
		const hasMore = offset + limit < total;

		return {
			items: paginatedNodes.map((node) => ({
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
			})),
			total,
			hasMore,
			offset,
			limit,
		};
	}

	/**
	 * Get file/directory stats
	 */
	async stat(path: string): Promise<FileStats> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.utils.findNodeByPath(normalized);

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

	/**
	 * Check if path exists
	 */
	async exists(path: string): Promise<boolean> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.utils.findNodeByPath(normalized);
		return node !== undefined;
	}

	/**
	 * Delete file or directory
	 */
	async unlink(
		path: string,
		options: { recursive?: boolean } = {},
	): Promise<void> {
		const normalized = FileSystemUtils.normalizePath(path);
		const node = await this.utils.findNodeByPath(normalized);

		if (!node) {
			throw new Error(`Path not found: ${path}`);
		}

		if (node.isDirectory) {
			const result = await this.readdir(normalized, { limit: 1 });
			if (result.total > 0 && !options.recursive) {
				throw new Error(`Directory not empty: ${path}`);
			}
		}

		// Decrement content reference count
		if (node.contentHash) {
			await this.utils.decrementRefCount(node.contentHash);
		}

		// Delete node (cascade will handle children if recursive)
		await this.db.delete(schema.nodes).where(eq(schema.nodes.id, node.id));
	}

	/**
	 * Move/rename file or directory
	 */
	async rename(oldPath: string, newPath: string): Promise<void> {
		const normalizedOld = FileSystemUtils.normalizePath(oldPath);
		const normalizedNew = FileSystemUtils.normalizePath(newPath);

		const node = await this.utils.findNodeByPath(normalizedOld);
		if (!node) {
			throw new Error(`Source path not found: ${oldPath}`);
		}

		const existingNew = await this.utils.findNodeByPath(normalizedNew);
		if (existingNew) {
			throw new Error(`Destination path already exists: ${newPath}`);
		}

		const newParentPath = FileSystemUtils.getParentPath(normalizedNew);
		const newParent = newParentPath
			? await this.utils.findNodeByPath(newParentPath)
			: null;

		if (newParentPath && !newParent) {
			throw new Error(
				`Destination parent directory not found: ${newParentPath}`,
			);
		}

		const newFileName = FileSystemUtils.getFileName(normalizedNew);
		const newTreePath = FileSystemUtils.pathToTreePath(normalizedNew);

		await this.db
			.update(schema.nodes)
			.set({
				path: normalizedNew,
				name: newFileName,
				treePath: newTreePath,
				parentId: newParent?.id || null,
				modifiedAt: new Date(),
			})
			.where(eq(schema.nodes.id, node.id));

		// Update all descendant paths if directory
		if (node.isDirectory) {
			const descendants = await this.db.query.nodes.findMany({
				where: like(schema.nodes.path, `${normalizedOld}/%`),
			});

			for (const desc of descendants) {
				const newDescPath = desc.path.replace(normalizedOld, normalizedNew);
				const newDescTreePath = FileSystemUtils.pathToTreePath(newDescPath);

				await this.db
					.update(schema.nodes)
					.set({
						path: newDescPath,
						treePath: newDescTreePath,
					})
					.where(eq(schema.nodes.id, desc.id));
			}
		}
	}

	/**
	 * Copy file or directory
	 */
	async copy(
		sourcePath: string,
		destPath: string,
		options: { recursive?: boolean } = {},
	): Promise<void> {
		const normalizedSource = FileSystemUtils.normalizePath(sourcePath);
		const normalizedDest = FileSystemUtils.normalizePath(destPath);

		const sourceNode = await this.utils.findNodeByPath(normalizedSource);
		if (!sourceNode) {
			throw new Error(`Source path not found: ${sourcePath}`);
		}

		if (sourceNode.isDirectory && !options.recursive) {
			throw new Error(
				`Cannot copy directory without recursive option: ${sourcePath}`,
			);
		}

		if (sourceNode.isDirectory) {
			// Copy directory recursively
			await this.mkdir(normalizedDest);
			const result = await this.readdir(normalizedSource);

			for (const childName of result.items) {
				const childSourcePath = `${normalizedSource}/${childName}`;
				const childDestPath = `${normalizedDest}/${childName}`;
				await this.copy(childSourcePath, childDestPath, options);
			}
		} else {
			// Copy file - read with no limit to get full content
			const fileData = await this.readFile(normalizedSource);
			await this.writeFile(normalizedDest, fileData.content, {
				mode: sourceNode.mode,
				owner: sourceNode.owner,
				mimeType: sourceNode.mimeType || undefined,
				createParents: true,
			});
		}
	}

	/**
	 * Search files by pattern (glob-like) with limit
	 */
	async glob(
		pattern: string,
		basePath: string = "/",
		limit: number = MAX_SEARCH_RESULTS,
	): Promise<{ matches: string[]; total: number; hasMore: boolean }> {
		const normalizedBase = FileSystemUtils.normalizePath(basePath);

		// Convert glob pattern to SQL LIKE pattern
		const likePattern = pattern.replace(/\*/g, "%").replace(/\?/g, "_");

		const nodes = await this.db.query.nodes.findMany({
			where: and(
				like(schema.nodes.path, `${normalizedBase}%`),
				like(schema.nodes.name, likePattern),
			),
			limit: limit + 1, // Fetch one extra to check if there are more
		});

		const hasMore = nodes.length > limit;
		const matches = nodes.slice(0, limit).map((node: typeof schema.nodes.$inferSelect) => node.path);

		return {
			matches,
			total: nodes.length,
			hasMore,
		};
	}

	/**
	 * Search file contents using full-text search with limit
	 */
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

		// Simple text search (in production, use PostgreSQL's ts_rank)
		const results = await this.db
			.select({
				nodeId: schema.searchIndex.nodeId,
				textContent: schema.searchIndex.textContent,
			})
			.from(schema.searchIndex)
			.innerJoin(schema.nodes, eq(schema.searchIndex.nodeId, schema.nodes.id))
			.where(
				and(
					like(schema.nodes.path, `${normalizedBase}%`),
					like(schema.searchIndex.textContent, `%${query}%`),
				),
			)
			.limit(limit + 1); // Fetch one extra to check if there are more

		const nodes = await Promise.all(
			results.slice(0, limit).map(async (r) => {
				const node = await this.db.query.nodes.findFirst({
					where: eq(schema.nodes.id, r.nodeId),
				});
				return node;
			}),
		);

		const hasMore = results.length > limit;
		const filteredResults = nodes
			.filter((n: typeof schema.nodes.$inferSelect | undefined): n is typeof schema.nodes.$inferSelect => n !== undefined)
			.map((node: typeof schema.nodes.$inferSelect) => ({
				path: node.path,
				score: 1.0, // In production, use ts_rank
			}));

		return {
			results: filteredResults,
			total: results.length,
			hasMore,
		};
	}
}