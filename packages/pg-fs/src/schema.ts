import {
	AnyPgColumn,
	bigint,
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Core filesystem schema design for PostgreSQL
 *
 * Key design decisions:
 * 1. Use ltree for hierarchical paths (efficient tree operations)
 * 2. Separate inodes table (metadata) from content (data blocks)
 * 3. Content addressing with hash-based deduplication
 * 4. GiST indexes for path queries and full-text search
 * 5. Recursive CTEs for tree operations
 */

// Nodes table: stores filesystem metadata (inodes)
// Uses ltree extension for efficient hierarchical queries
export const nodes = pgTable(
	"nodes",
	{
		id: text("id").primaryKey(), // UUID or nanoid
		path: text("path").notNull().unique(), // Full path: /home/user/file.txt
		name: text("name").notNull(), // Just the filename: file.txt

		// Hierarchical path using ltree extension (install with CREATE EXTENSION ltree)
		// Format: root.home.user.file_txt (dots separate levels)
		treePath: text("tree_path").notNull(),

		parentId: text("parent_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),

		// Node type
		isDirectory: boolean("is_directory").notNull().default(false),

		// File metadata
		size: bigint("size", { mode: "number" }).notNull().default(0),
		mimeType: text("mime_type"),

		// Content reference (null for directories)
		contentHash: text("content_hash"), // SHA-256 hash for deduplication

		// Timestamps
		createdAt: timestamp("created_at").notNull().defaultNow(),
		modifiedAt: timestamp("modified_at").notNull().defaultNow(),
		accessedAt: timestamp("accessed_at").notNull().defaultNow(),

		// Permissions (Unix-style)
		mode: text("mode").notNull().default("0644"), // e.g., 0755 for directories
		owner: text("owner").notNull().default("default"),

		// Extended attributes (JSON)
		metadata: jsonb("metadata").default({}),
	},
	(table) => ({
		// Index on path for quick lookups
		pathIdx: uniqueIndex("path_idx").on(table.path),

		// Index on parent for listing directory contents
		parentIdx: index("parent_idx").on(table.parentId),

		// GiST index on tree_path for hierarchical queries (requires ltree extension)
		// This enables fast ancestor/descendant queries
		treePathIdx: index("tree_path_idx").on(table.treePath),

		// Index for searching by name
		nameIdx: index("name_idx").on(table.name),

		// Composite index for parent + name (common query pattern)
		parentNameIdx: index("parent_name_idx").on(table.parentId, table.name),

		// Index on modified time for sorting
		modifiedIdx: index("modified_idx").on(table.modifiedAt),
	}),
);

// Content blocks: stores actual file data
// Uses content-addressable storage for deduplication
export const contentBlocks = pgTable(
	"content_blocks",
	{
		hash: text("hash").primaryKey(), // SHA-256 hash of content
		data: text("data").notNull(), // Base64-encoded content or large text
		size: bigint("size", { mode: "number" }).notNull(),

		// Reference counting for garbage collection
		refCount: bigint("ref_count", { mode: "number" }).notNull().default(1),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		lastAccessedAt: timestamp("last_accessed_at").notNull().defaultNow(),
	},
	(table) => ({
		// Index for garbage collection queries
		refCountIdx: index("ref_count_idx").on(table.refCount),
		lastAccessIdx: index("last_access_idx").on(table.lastAccessedAt),
	}),
);

// Search index for full-text search capabilities
// Uses PostgreSQL's tsvector for efficient text search
export const searchIndex = pgTable(
	"search_index",
	{
		nodeId: text("node_id")
			.primaryKey()
			.references(() => nodes.id, { onDelete: "cascade" }),

		// Full-text search vector (computed from path + content)
		searchVector: text("search_vector"), // tsvector type

		// Extracted text content for indexing
		textContent: text("text_content"),

		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		// GIN index for full-text search (requires text search configuration)
		searchVectorIdx: index("search_vector_idx").on(table.searchVector),
	}),
);

// File versions (optional): for version control
export const versions = pgTable(
	"versions",
	{
		id: text("id").primaryKey(),
		nodeId: text("node_id")
			.notNull()
			.references(() => nodes.id, { onDelete: "cascade" }),

		version: bigint("version", { mode: "number" }).notNull(),
		contentHash: text("content_hash")
			.notNull()
			.references(() => contentBlocks.hash),

		size: bigint("size", { mode: "number" }).notNull(),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		createdBy: text("created_by").notNull(),

		comment: text("comment"),
	},
	(table) => ({
		nodeVersionIdx: uniqueIndex("node_version_idx").on(
			table.nodeId,
			table.version,
		),
		nodeIdx: index("version_node_idx").on(table.nodeId),
	}),
);

// Export types
export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type ContentBlock = typeof contentBlocks.$inferSelect;
export type NewContentBlock = typeof contentBlocks.$inferInsert;
export type SearchIndex = typeof searchIndex.$inferSelect;
export type Version = typeof versions.$inferSelect;
