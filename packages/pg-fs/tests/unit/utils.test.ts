import { describe, it, expect } from "vitest";
import { FileSystemUtils } from "../../src/utils.js";

describe("FileSystemUtils", () => {
	describe("normalizePath", () => {
		it("should normalize simple paths", () => {
			expect(FileSystemUtils.normalizePath("/home/user/file.txt")).toBe(
				"/home/user/file.txt",
			);
		});

		it("should handle trailing slashes", () => {
			expect(FileSystemUtils.normalizePath("/home/user/")).toBe("/home/user");
		});

		it("should handle double slashes", () => {
			expect(FileSystemUtils.normalizePath("/home//user/file.txt")).toBe(
				"/home/user/file.txt",
			);
		});

		it("should resolve parent directory references", () => {
			expect(FileSystemUtils.normalizePath("/home/user/../other")).toBe(
				"/home/other",
			);
		});

		it("should handle current directory references", () => {
			expect(FileSystemUtils.normalizePath("/home/./user")).toBe("/home/user");
		});

		it("should handle root path", () => {
			expect(FileSystemUtils.normalizePath("/")).toBe("/");
		});

		it("should handle empty path", () => {
			expect(FileSystemUtils.normalizePath("")).toBe("/");
		});
	});

	describe("getParentPath", () => {
		it("should get parent of file", () => {
			expect(FileSystemUtils.getParentPath("/home/user/file.txt")).toBe(
				"/home/user",
			);
		});

		it("should get parent of directory", () => {
			expect(FileSystemUtils.getParentPath("/home/user")).toBe("/home");
		});

		it("should return null for root", () => {
			expect(FileSystemUtils.getParentPath("/")).toBeNull();
		});

		it("should return root for top-level path", () => {
			expect(FileSystemUtils.getParentPath("/home")).toBe("/");
		});
	});

	describe("getFileName", () => {
		it("should extract filename from path", () => {
			expect(FileSystemUtils.getFileName("/home/user/file.txt")).toBe(
				"file.txt",
			);
		});

		it("should extract directory name from path", () => {
			expect(FileSystemUtils.getFileName("/home/user")).toBe("user");
		});

		it("should return empty for root", () => {
			expect(FileSystemUtils.getFileName("/")).toBe("");
		});
	});

	describe("isValidPath", () => {
		it("should accept valid absolute paths", () => {
			expect(FileSystemUtils.isValidPath("/home/user/file.txt")).toBe(true);
		});

		it("should reject relative paths", () => {
			expect(FileSystemUtils.isValidPath("home/user/file.txt")).toBe(false);
		});

		it("should reject paths with double slashes", () => {
			expect(FileSystemUtils.isValidPath("/home//user")).toBe(false);
		});

		it("should accept root path", () => {
			expect(FileSystemUtils.isValidPath("/")).toBe(true);
		});
	});

	describe("pathToTreePath", () => {
		it("should convert path to tree format", () => {
			expect(FileSystemUtils.pathToTreePath("/home/user/file.txt")).toBe(
				"home.user.file_txt",
			);
		});

		it("should handle root path", () => {
			expect(FileSystemUtils.pathToTreePath("/")).toBe("");
		});

		it("should replace special characters", () => {
			expect(FileSystemUtils.pathToTreePath("/my-file_name.txt")).toBe(
				"my_file_name_txt",
			);
		});
	});

	describe("hashContent", () => {
		it("should generate consistent hash for same content", () => {
			const hash1 = FileSystemUtils.hashContent("test content");
			const hash2 = FileSystemUtils.hashContent("test content");
			expect(hash1).toBe(hash2);
		});

		it("should generate different hash for different content", () => {
			const hash1 = FileSystemUtils.hashContent("content A");
			const hash2 = FileSystemUtils.hashContent("content B");
			expect(hash1).not.toBe(hash2);
		});

		it("should return 64 character hex string", () => {
			const hash = FileSystemUtils.hashContent("test");
			expect(hash).toHaveLength(64);
			expect(hash).toMatch(/^[a-f0-9]+$/);
		});
	});

	describe("generateId", () => {
		it("should generate unique IDs", () => {
			const id1 = FileSystemUtils.generateId();
			const id2 = FileSystemUtils.generateId();
			expect(id1).not.toBe(id2);
		});

		it("should return valid UUID format", () => {
			const id = FileSystemUtils.generateId();
			expect(id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});
	});
});
