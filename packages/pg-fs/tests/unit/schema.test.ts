import { describe, it, expect } from "vitest";
import {
	nodes,
	contentBlocks,
	searchIndex,
	versions,
} from "../../src/schema.js";

describe("Schema", () => {
	describe("nodes table", () => {
		it("should export nodes table", () => {
			expect(nodes).toBeDefined();
			expect(typeof nodes).toBe("object");
		});

		it("should have column definitions", () => {
			// Drizzle tables expose columns as properties
			expect(nodes).toHaveProperty("id");
			expect(nodes).toHaveProperty("path");
			expect(nodes).toHaveProperty("name");
			expect(nodes).toHaveProperty("isDirectory");
			expect(nodes).toHaveProperty("parentId");
			expect(nodes).toHaveProperty("contentHash");
		});
	});

	describe("contentBlocks table", () => {
		it("should export contentBlocks table", () => {
			expect(contentBlocks).toBeDefined();
			expect(typeof contentBlocks).toBe("object");
		});

		it("should have required columns", () => {
			expect(contentBlocks).toHaveProperty("hash");
			expect(contentBlocks).toHaveProperty("data");
			expect(contentBlocks).toHaveProperty("refCount");
			expect(contentBlocks).toHaveProperty("size");
		});
	});

	describe("searchIndex table", () => {
		it("should export searchIndex table", () => {
			expect(searchIndex).toBeDefined();
			expect(typeof searchIndex).toBe("object");
		});

		it("should have required columns", () => {
			expect(searchIndex).toHaveProperty("nodeId");
			expect(searchIndex).toHaveProperty("textContent");
			expect(searchIndex).toHaveProperty("searchVector");
		});
	});

	describe("versions table", () => {
		it("should export versions table", () => {
			expect(versions).toBeDefined();
			expect(typeof versions).toBe("object");
		});

		it("should have required columns", () => {
			expect(versions).toHaveProperty("id");
			expect(versions).toHaveProperty("nodeId");
			expect(versions).toHaveProperty("version");
			expect(versions).toHaveProperty("contentHash");
		});
	});
});
