import { describe, it, expect, beforeEach } from "vitest";
import { Memory } from "../src/memory.js";

describe("Memory", () => {
	let memory: Memory;

	beforeEach(async () => {
		const result = await Memory.create();
		memory = result.memory;
	});

	describe("createFile", () => {
		it("creates a new file", async () => {
			const result = await memory.createFile("/memories/notes.md", "Hello world");
			expect(result).toContain("File created successfully");
			expect(result).toContain("/memories/notes.md");
		});

		it("rejects creating a file that already exists", async () => {
			await memory.createFile("/memories/notes.md", "Hello");
			await expect(memory.createFile("/memories/notes.md", "Again")).rejects.toThrow(
				"already exists",
			);
		});

		it("creates parent directories automatically", async () => {
			const result = await memory.createFile("/memories/deep/nested/file.md", "content");
			expect(result).toContain("File created successfully");
		});

		it("rejects paths outside /memories", async () => {
			await expect(memory.createFile("/other/file.md", "content")).rejects.toThrow(
				"must be under /memories",
			);
		});
	});

	describe("view", () => {
		it("views a file with line numbers", async () => {
			await memory.createFile("/memories/test.md", "line one\nline two");
			const result = await memory.view("/memories/test.md");
			expect(result).toContain("     1\tline one");
			expect(result).toContain("     2\tline two");
		});

		it("views a directory listing", async () => {
			await memory.createFile("/memories/a.md", "content a");
			await memory.createFile("/memories/b.md", "content b");
			const result = await memory.view("/memories");
			expect(result).toContain("a.md");
			expect(result).toContain("b.md");
		});

		it("supports view_range", async () => {
			await memory.createFile("/memories/test.md", "a\nb\nc\nd\ne");
			const result = await memory.view("/memories/test.md", [2, 4]);
			expect(result).toContain("     2\tb");
			expect(result).toContain("     3\tc");
			expect(result).toContain("     4\td");
			expect(result).not.toContain("     1\ta");
		});

		it("throws for non-existent path", async () => {
			await expect(memory.view("/memories/nope.md")).rejects.toThrow("not found");
		});
	});

	describe("strReplace", () => {
		it("replaces text in a file", async () => {
			await memory.createFile("/memories/test.md", "Hello world");
			const result = await memory.strReplace("/memories/test.md", "world", "universe");
			expect(result).toContain("has been edited");
		});

		it("throws when old_str not found", async () => {
			await memory.createFile("/memories/test.md", "Hello world");
			await expect(
				memory.strReplace("/memories/test.md", "nonexistent", "new"),
			).rejects.toThrow("did not appear verbatim");
		});

		it("throws when old_str appears multiple times", async () => {
			await memory.createFile("/memories/test.md", "aaa");
			await expect(
				memory.strReplace("/memories/test.md", "a", "b"),
			).rejects.toThrow("Multiple");
		});
	});

	describe("insert", () => {
		it("inserts text at a specific line", async () => {
			await memory.createFile("/memories/test.md", "line 1\nline 3");
			const result = await memory.insert("/memories/test.md", 1, "line 2");
			expect(result).toContain("has been edited");

			const view = await memory.view("/memories/test.md");
			expect(view).toContain("     1\tline 1");
			expect(view).toContain("     2\tline 2");
			expect(view).toContain("     3\tline 3");
		});

		it("inserts at the beginning with line 0", async () => {
			await memory.createFile("/memories/test.md", "line 2");
			await memory.insert("/memories/test.md", 0, "line 1");

			const view = await memory.view("/memories/test.md");
			expect(view).toContain("     1\tline 1");
			expect(view).toContain("     2\tline 2");
		});

		it("throws for invalid insert_line", async () => {
			await memory.createFile("/memories/test.md", "content");
			await expect(memory.insert("/memories/test.md", -1, "text")).rejects.toThrow(
				"Invalid insert_line",
			);
		});
	});

	describe("delete", () => {
		it("deletes a file", async () => {
			await memory.createFile("/memories/test.md", "content");
			const result = await memory.delete("/memories/test.md");
			expect(result).toContain("Successfully deleted");

			await expect(memory.view("/memories/test.md")).rejects.toThrow("not found");
		});

		it("deletes a directory recursively", async () => {
			await memory.createFile("/memories/dir/file.md", "content");
			const result = await memory.delete("/memories/dir");
			expect(result).toContain("Successfully deleted");
		});

		it("throws for non-existent path", async () => {
			await expect(memory.delete("/memories/nope.md")).rejects.toThrow("does not exist");
		});
	});

	describe("rename", () => {
		it("renames a file", async () => {
			await memory.createFile("/memories/old.md", "content");
			const result = await memory.rename("/memories/old.md", "/memories/new.md");
			expect(result).toContain("Successfully renamed");

			const view = await memory.view("/memories/new.md");
			expect(view).toContain("content");
		});

		it("throws when source doesn't exist", async () => {
			await expect(
				memory.rename("/memories/nope.md", "/memories/new.md"),
			).rejects.toThrow("does not exist");
		});

		it("throws when destination already exists", async () => {
			await memory.createFile("/memories/a.md", "a");
			await memory.createFile("/memories/b.md", "b");
			await expect(
				memory.rename("/memories/a.md", "/memories/b.md"),
			).rejects.toThrow("already exists");
		});

		it("creates parent directories for new path", async () => {
			await memory.createFile("/memories/file.md", "content");
			const result = await memory.rename("/memories/file.md", "/memories/sub/dir/file.md");
			expect(result).toContain("Successfully renamed");
		});

		it("rejects renaming outside /memories", async () => {
			await memory.createFile("/memories/file.md", "content");
			await expect(
				memory.rename("/memories/file.md", "/other/file.md"),
			).rejects.toThrow("must be under /memories");
		});
	});

	describe("full lifecycle", () => {
		it("create → view → str_replace → insert → view range → rename → delete", async () => {
			await memory.createFile("/memories/lifecycle.md", "Hello\nWorld\nTest");

			let view = await memory.view("/memories/lifecycle.md");
			expect(view).toContain("     1\tHello");
			expect(view).toContain("     2\tWorld");

			await memory.strReplace("/memories/lifecycle.md", "World", "Earth");
			view = await memory.view("/memories/lifecycle.md");
			expect(view).toContain("     2\tEarth");

			await memory.insert("/memories/lifecycle.md", 1, "New Line");
			view = await memory.view("/memories/lifecycle.md");
			expect(view).toContain("     2\tNew Line");

			view = await memory.view("/memories/lifecycle.md", [2, 3]);
			expect(view).toContain("     2\tNew Line");
			expect(view).toContain("     3\tEarth");

			await memory.rename("/memories/lifecycle.md", "/memories/renamed.md");
			view = await memory.view("/memories/renamed.md");
			expect(view).toContain("Hello");

			await memory.delete("/memories/renamed.md");
			await expect(memory.view("/memories/renamed.md")).rejects.toThrow("not found");
		});
	});
});
