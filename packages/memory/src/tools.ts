import { tool } from "ai";
import { z } from "zod";
import type { Memory } from "./memory.js";

export function createMemoryTools(memory: Memory) {
	return {
		memory_view: tool({
			description:
				"View memory directory contents or read a memory file with line numbers. Use this to check /memories for earlier progress or to read specific memory files.",
			inputSchema: z.object({
				path: z
					.string()
					.describe("Absolute path within /memories to view (e.g., /memories or /memories/notes.md)"),
				view_range: z
					.array(z.number())
					.optional()
					.describe("Optional [start, end] line range (1-indexed). Use -1 for end of file."),
			}),
			execute: async ({ path, view_range }) => {
				try {
					const result = await memory.view(path, view_range);
					return { success: true, result };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		memory_create: tool({
			description:
				"Create a new memory file. Use this to persist information, progress, or context across conversations. The file must not already exist.",
			inputSchema: z.object({
				path: z
					.string()
					.describe("Absolute path for the new file (e.g., /memories/project-notes.md)"),
				file_text: z
					.string()
					.describe("The content to write to the new memory file"),
			}),
			execute: async ({ path, file_text }) => {
				try {
					const result = await memory.createFile(path, file_text);
					return { success: true, result };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		memory_str_replace: tool({
			description:
				"Replace an exact string in a memory file with new text. The old_str must appear exactly once in the file.",
			inputSchema: z.object({
				path: z
					.string()
					.describe("Absolute path to the memory file to edit"),
				old_str: z
					.string()
					.describe("The exact text to replace (must appear exactly once in the file)"),
				new_str: z
					.string()
					.describe("The new text to replace old_str with"),
			}),
			execute: async ({ path, old_str, new_str }) => {
				try {
					const result = await memory.strReplace(path, old_str, new_str);
					return { success: true, result };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		memory_insert: tool({
			description:
				"Insert text at a specific line number in a memory file. Line 0 inserts at the beginning of the file.",
			inputSchema: z.object({
				path: z
					.string()
					.describe("Absolute path to the memory file to edit"),
				insert_line: z
					.number()
					.int()
					.describe("Line number to insert text at (0-indexed). 0 inserts at the beginning."),
				new_str: z
					.string()
					.describe("The text to insert at the specified line"),
			}),
			execute: async ({ path, insert_line, new_str }) => {
				try {
					const result = await memory.insert(path, insert_line, new_str);
					return { success: true, result };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		memory_delete: tool({
			description:
				"Delete a memory file or directory. Directories are deleted recursively.",
			inputSchema: z.object({
				path: z
					.string()
					.describe("Absolute path to the memory file or directory to delete"),
			}),
			execute: async ({ path }) => {
				try {
					const result = await memory.delete(path);
					return { success: true, result };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		memory_rename: tool({
			description:
				"Rename or move a memory file or directory. Both paths must be under /memories.",
			inputSchema: z.object({
				old_path: z
					.string()
					.describe("Current absolute path of the file or directory"),
				new_path: z
					.string()
					.describe("New absolute path for the file or directory"),
			}),
			execute: async ({ old_path, new_path }) => {
				try {
					const result = await memory.rename(old_path, new_path);
					return { success: true, result };
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

export type MemoryTools = ReturnType<typeof createMemoryTools>;
