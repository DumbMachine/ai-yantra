import { describe, it, expect } from "vitest";
import {
	formatFileContent,
	formatDirectoryListing,
	formatHumanSize,
	formatEditSnippet,
} from "../src/formatters.js";

describe("formatHumanSize", () => {
	it("formats bytes", () => {
		expect(formatHumanSize(500)).toBe("500B");
		expect(formatHumanSize(0)).toBe("0B");
	});

	it("formats kilobytes", () => {
		expect(formatHumanSize(1024)).toBe("1.0K");
		expect(formatHumanSize(1536)).toBe("1.5K");
		expect(formatHumanSize(4096)).toBe("4.0K");
	});

	it("formats megabytes", () => {
		expect(formatHumanSize(1024 * 1024)).toBe("1.0M");
	});

	it("formats gigabytes", () => {
		expect(formatHumanSize(1024 * 1024 * 1024)).toBe("1.0G");
	});
});

describe("formatFileContent", () => {
	it("formats file with 6-char right-aligned line numbers", () => {
		const result = formatFileContent("/memories/test.md", "line one\nline two\nline three");
		expect(result).toContain("Here's the content of /memories/test.md:");
		expect(result).toContain("     1\tline one");
		expect(result).toContain("     2\tline two");
		expect(result).toContain("     3\tline three");
	});

	it("handles empty file", () => {
		const result = formatFileContent("/memories/empty.md", "");
		expect(result).toContain("Here's the content of /memories/empty.md:");
	});

	it("handles single line", () => {
		const result = formatFileContent("/memories/one.md", "hello");
		expect(result).toContain("     1\thello");
	});

	it("applies view_range correctly", () => {
		const content = "a\nb\nc\nd\ne";
		const result = formatFileContent("/memories/test.md", content, [2, 4]);
		expect(result).toContain("     2\tb");
		expect(result).toContain("     3\tc");
		expect(result).toContain("     4\td");
		expect(result).not.toContain("     1\ta");
		expect(result).not.toContain("     5\te");
	});

	it("supports view_range with -1 for end of file", () => {
		const content = "a\nb\nc\nd\ne";
		const result = formatFileContent("/memories/test.md", content, [3, -1]);
		expect(result).toContain("     3\tc");
		expect(result).toContain("     4\td");
		expect(result).toContain("     5\te");
	});

	it("throws on invalid view_range", () => {
		const content = "a\nb\nc";
		expect(() => formatFileContent("/test", content, [0, 2])).toThrow("start line must be >= 1");
		expect(() => formatFileContent("/test", content, [2, 1])).toThrow("start line 2 is greater than end line 1");
		expect(() => formatFileContent("/test", content, [1, 10])).toThrow("exceeds file length");
	});
});

describe("formatDirectoryListing", () => {
	it("formats files with sizes", () => {
		const entries = [
			{ name: "notes.md", isDirectory: false, size: 1024 },
			{ name: "todo.md", isDirectory: false, size: 512 },
		];
		const result = formatDirectoryListing("/memories", entries);
		expect(result).toContain("notes.md (1.0K)");
		expect(result).toContain("todo.md (512B)");
	});

	it("formats directories with trailing slash", () => {
		const entries = [
			{ name: "tasks", isDirectory: true, size: 0, children: [] },
		];
		const result = formatDirectoryListing("/memories", entries);
		expect(result).toContain("tasks/");
	});

	it("shows 2-level deep listing for directories", () => {
		const entries = [
			{
				name: "tasks",
				isDirectory: true,
				size: 0,
				children: [
					{ name: "done.md", isDirectory: false, size: 256 },
					{ name: "pending", isDirectory: true, size: 0 },
				],
			},
		];
		const result = formatDirectoryListing("/memories", entries);
		expect(result).toContain("tasks/");
		expect(result).toContain("  done.md (256B)");
		expect(result).toContain("  pending/");
	});

	it("excludes hidden items and node_modules", () => {
		const entries = [
			{ name: ".hidden", isDirectory: false, size: 0 },
			{ name: "node_modules", isDirectory: true, size: 0 },
			{ name: "visible.md", isDirectory: false, size: 100 },
		];
		const result = formatDirectoryListing("/memories", entries);
		expect(result).not.toContain(".hidden");
		expect(result).not.toContain("node_modules");
		expect(result).toContain("visible.md");
	});
});

describe("formatEditSnippet", () => {
	it("shows context lines around edit", () => {
		const content = "a\nb\nc\nd\ne\nf\ng\nh\ni\nj";
		const result = formatEditSnippet("/memories/test.md", content, 5);
		expect(result).toContain("Here's the result of running the command on /memories/test.md:");
		expect(result).toContain("     1\ta");
		expect(result).toContain("     5\te");
		expect(result).toContain("     8\th");
	});
});
