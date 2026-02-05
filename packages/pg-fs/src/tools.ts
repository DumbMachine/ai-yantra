import { tool } from "ai";
import { z } from "zod";
import type { PgFileSystem } from "./db-fs.js";

/**
 * Create AI SDK tools for pg-fs filesystem operations
 */
export function createFileSystemTools(fs: PgFileSystem) {
	return {
		/**
		 * Read file contents with pagination support for large files
		 */
		read: tool({
			description:
				"Reads a file from the filesystem and returns its contents. For large files, use offset and limit to read in chunks. Returns metadata about pagination.",
			inputSchema: z.object({
				file_path: z
					.string()
					.describe(
						"The absolute path to the file to read (e.g., /home/user/document.txt)",
					),
				encoding: z
					.enum(["utf8", "base64"])
					.optional()
					.describe("Encoding format for the file content"),
				offset: z
					.number()
					.int()
					.positive()
					.optional()
					.describe(
						"Line number to start reading from (1-indexed). Use for large files to read in chunks.",
					),
				limit: z
					.number()
					.int()
					.positive()
					.optional()
					.describe(
						"Number of lines to read. Use for large files to avoid context overflow. Max 1000 lines per read.",
					),
			}),
			execute: async ({ file_path, encoding, offset, limit }) => {
				try {
					const result = await fs.readFile(file_path, {
						encoding,
						offset,
						limit,
					});

					return {
						success: true,
						content: result.content,
						totalSize: result.totalSize,
						totalLines: result.totalLines,
						hasMore: result.hasMore,
						offset: result.offset,
						limit: result.limit,
						message: result.hasMore
							? `File is large. Use offset=${(result.offset || 0) + (result.limit || 0)} to read more.`
							: undefined,
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Write file contents
		 */
		write: tool({
			description:
				"Writes content to a file. Creates the file if it does not exist, overwrites if it does. Use this to create or update files.",
			inputSchema: z.object({
				file_path: z
					.string()
					.describe("The absolute path where the file should be written"),
				content: z.string().describe("The content to write to the file"),
				mime_type: z
					.string()
					.optional()
					.describe(
						"MIME type of the file (e.g., text/plain, application/json)",
					),
				create_parents: z
					.boolean()
					.optional()
					.default(false)
					.describe("Create parent directories if they do not exist"),
			}),
			execute: async ({ file_path, content, mime_type, create_parents }) => {
				try {
					await fs.writeFile(file_path, content, {
						mimeType: mime_type,
						createParents: create_parents,
					});

					const stats = await fs.stat(file_path);

					return {
						success: true,
						path: file_path,
						size: stats.size,
						modifiedAt: stats.modifiedAt.toISOString(),
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Edit file using string replacement
		 */
		edit: tool({
			description:
				"Edits an existing file by replacing exact text. The old_string must match the file contents exactly. For large files, read the relevant section first using offset/limit.",
			inputSchema: z.object({
				file_path: z
					.string()
					.describe("The absolute path to the file to modify"),
				old_string: z
					.string()
					.describe(
						"The exact text to replace (must match the file contents exactly and appear only once)",
					),
				new_string: z.string().describe("The text to replace it with"),
			}),
			execute: async ({ file_path, old_string, new_string }) => {
				try {
					// Read full file for edit operation
					const result = await fs.readFile(file_path);
					const content = result.content;

					if (!content.includes(old_string)) {
						return {
							success: false,
							error: "old_string not found in file",
						};
					}

					if (content.split(old_string).length - 1 > 1) {
						return {
							success: false,
							error:
								"old_string appears multiple times in file. Use a more specific string.",
						};
					}

					const newContent = content.replace(old_string, new_string);
					await fs.writeFile(file_path, newContent);

					return {
						success: true,
						path: file_path,
						message: "File edited successfully",
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * List directory contents with pagination
		 */
		ls: tool({
			description:
				"Lists files and directories in a given path. For large directories, use offset and limit for pagination. Returns names and metadata.",
			inputSchema: z.object({
				path: z.string().describe("The absolute path to the directory to list"),
				detailed: z
					.boolean()
					.optional()
					.default(false)
					.describe("Return detailed file information"),
				offset: z
					.number()
					.int()
					.nonnegative()
					.optional()
					.describe("Number of items to skip (for pagination)"),
				limit: z
					.number()
					.int()
					.positive()
					.optional()
					.describe(
						"Maximum number of items to return (max 500, for large directories)",
					),
			}),
			execute: async ({ path, detailed, offset, limit }) => {
				try {
					if (detailed) {
						const result = await fs.readdirStats(path, { offset, limit });
						return {
							success: true,
							path,
							items: result.items.map((s) => ({
								name: s.name,
								type: s.isDirectory ? "directory" : "file",
								size: s.size,
								modified: s.modifiedAt.toISOString(),
								mimeType: s.mimeType,
							})),
							total: result.total,
							hasMore: result.hasMore,
							offset: result.offset,
							limit: result.limit,
							message: result.hasMore
								? `Directory has more items. Use offset=${result.offset + result.limit} to see more.`
								: undefined,
						};
					} else {
						const result = await fs.readdir(path, { offset, limit });
						return {
							success: true,
							path,
							items: result.items,
							total: result.total,
							hasMore: result.hasMore,
							offset: result.offset,
							limit: result.limit,
							message: result.hasMore
								? `Directory has more items. Use offset=${result.offset + result.limit} to see more.`
								: undefined,
						};
					}
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Create directory
		 */
		mkdir: tool({
			description: "Creates a new directory at the specified path.",
			inputSchema: z.object({
				path: z
					.string()
					.describe("The absolute path of the directory to create"),
				recursive: z
					.boolean()
					.optional()
					.default(false)
					.describe("Create parent directories if they do not exist"),
			}),
			execute: async ({ path, recursive }) => {
				try {
					await fs.mkdir(path, { recursive });
					return {
						success: true,
						path,
						message: "Directory created successfully",
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Delete file or directory
		 */
		unlink: tool({
			description:
				"Deletes a file or directory. Use recursive option for non-empty directories.",
			inputSchema: z.object({
				path: z.string().describe("The absolute path to delete"),
				recursive: z
					.boolean()
					.optional()
					.default(false)
					.describe("Delete directory and all its contents"),
			}),
			execute: async ({ path, recursive }) => {
				try {
					await fs.unlink(path, { recursive });
					return {
						success: true,
						path,
						message: "Deleted successfully",
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Move/rename file or directory
		 */
		rename: tool({
			description:
				"Moves or renames a file or directory from one path to another.",
			inputSchema: z.object({
				old_path: z.string().describe("The current path"),
				new_path: z.string().describe("The new path"),
			}),
			execute: async ({ old_path, new_path }) => {
				try {
					await fs.rename(old_path, new_path);
					return {
						success: true,
						oldPath: old_path,
						newPath: new_path,
						message: "Renamed successfully",
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Copy file or directory
		 */
		copy: tool({
			description: "Copies a file or directory from one location to another.",
			inputSchema: z.object({
				source_path: z.string().describe("The source path to copy from"),
				dest_path: z.string().describe("The destination path to copy to"),
				recursive: z
					.boolean()
					.optional()
					.default(false)
					.describe("Copy directory and all its contents"),
			}),
			execute: async ({ source_path, dest_path, recursive }) => {
				try {
					await fs.copy(source_path, dest_path, { recursive });
					return {
						success: true,
						sourcePath: source_path,
						destPath: dest_path,
						message: "Copied successfully",
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Get file/directory stats
		 */
		stat: tool({
			description: "Gets detailed information about a file or directory.",
			inputSchema: z.object({
				path: z.string().describe("The absolute path to get information about"),
			}),
			execute: async ({ path }) => {
				try {
					const stats = await fs.stat(path);
					return {
						success: true,
						...stats,
						createdAt: stats.createdAt.toISOString(),
						modifiedAt: stats.modifiedAt.toISOString(),
						accessedAt: stats.accessedAt.toISOString(),
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Check if path exists
		 */
		exists: tool({
			description:
				"Checks whether a file or directory exists at the given path.",
			inputSchema: z.object({
				path: z.string().describe("The absolute path to check"),
			}),
			execute: async ({ path }) => {
				try {
					const exists = await fs.exists(path);
					return {
						success: true,
						path,
						exists,
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Search files by pattern with result limit
		 */
		glob: tool({
			description:
				"Searches for files matching a glob pattern. Supports * (any chars) and ? (single char). Returns up to 100 matches by default.",
			inputSchema: z.object({
				pattern: z
					.string()
					.describe("Glob pattern to match (e.g., *.txt, file?.md)"),
				base_path: z
					.string()
					.optional()
					.default("/")
					.describe("Base directory to search from"),
				limit: z
					.number()
					.int()
					.positive()
					.optional()
					.describe("Maximum number of results to return (default 100)"),
			}),
			execute: async ({ pattern, base_path, limit }) => {
				try {
					const result = await fs.glob(pattern, base_path, limit);
					return {
						success: true,
						pattern,
						basePath: base_path,
						matches: result.matches,
						count: result.matches.length,
						hasMore: result.hasMore,
						message: result.hasMore
							? "More matches exist. Refine your pattern or increase limit."
							: undefined,
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		/**
		 * Search file contents with result limit
		 */
		grep: tool({
			description:
				"Searches file contents for text matching a query. Returns matching file paths with relevance scores. Limited to 100 results by default.",
			inputSchema: z.object({
				query: z.string().describe("Text to search for in file contents"),
				base_path: z
					.string()
					.optional()
					.default("/")
					.describe("Base directory to search from"),
				limit: z
					.number()
					.int()
					.positive()
					.optional()
					.describe("Maximum number of results to return (default 100)"),
			}),
			execute: async ({ query, base_path, limit }) => {
				try {
					const result = await fs.search(query, base_path, limit);
					return {
						success: true,
						query,
						basePath: base_path,
						results: result.results.map((r) => ({
							path: r.path,
							score: r.score,
						})),
						count: result.results.length,
						hasMore: result.hasMore,
						message: result.hasMore
							? "More matches exist. Refine your query or increase limit."
							: undefined,
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),
	};
}

export type FileSystemTools = ReturnType<typeof createFileSystemTools>;