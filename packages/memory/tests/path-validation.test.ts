import { describe, it, expect } from "vitest";
import { validateMemoryPath } from "../src/path-validation.js";

describe("validateMemoryPath", () => {
	it("accepts /memories root", () => {
		expect(validateMemoryPath("/memories")).toBe("/memories");
	});

	it("accepts valid paths under /memories", () => {
		expect(validateMemoryPath("/memories/notes.md")).toBe("/memories/notes.md");
		expect(validateMemoryPath("/memories/tasks/todo.md")).toBe("/memories/tasks/todo.md");
	});

	it("normalizes paths with trailing slashes and dots", () => {
		expect(validateMemoryPath("/memories/./notes.md")).toBe("/memories/notes.md");
	});

	it("rejects paths not starting with /memories", () => {
		expect(() => validateMemoryPath("/other/file.md")).toThrow("must be under /memories");
		expect(() => validateMemoryPath("/")).toThrow("must be under /memories");
		expect(() => validateMemoryPath("/mem")).toThrow("must be under /memories");
	});

	it("rejects traversal attacks", () => {
		expect(() => validateMemoryPath("/memories/../etc/passwd")).toThrow("must be under /memories");
		expect(() => validateMemoryPath("/memories/../../root")).toThrow("must be under /memories");
	});

	it("handles /memories prefix that is not a real directory boundary", () => {
		expect(() => validateMemoryPath("/memories_extra/file.md")).toThrow("must be under /memories");
	});

	it("accepts deeply nested paths", () => {
		expect(validateMemoryPath("/memories/a/b/c/d/e.md")).toBe("/memories/a/b/c/d/e.md");
	});
});
