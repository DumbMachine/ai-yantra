import {
	AnySQLiteColumn,
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const nodes = sqliteTable(
	"nodes",
	{
		id: text("id").primaryKey(),
		path: text("path").notNull().unique(),
		name: text("name").notNull(),
		treePath: text("tree_path").notNull(),
		parentId: text("parent_id").references((): AnySQLiteColumn => nodes.id, {
			onDelete: "cascade",
		}),
		isDirectory: integer("is_directory", { mode: "boolean" })
			.notNull()
			.default(false),
		size: integer("size").notNull().default(0),
		mimeType: text("mime_type"),
		contentHash: text("content_hash"),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		modifiedAt: integer("modified_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		accessedAt: integer("accessed_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		mode: text("mode").notNull().default("0644"),
		owner: text("owner").notNull().default("default"),
		metadata: text("metadata", { mode: "json" })
			.$type<Record<string, unknown>>()
			.default({}),
	},
	(table) => ({
		pathIdx: uniqueIndex("path_idx").on(table.path),
		parentIdx: index("parent_idx").on(table.parentId),
		treePathIdx: index("tree_path_idx").on(table.treePath),
		nameIdx: index("name_idx").on(table.name),
		parentNameIdx: index("parent_name_idx").on(table.parentId, table.name),
		modifiedIdx: index("modified_idx").on(table.modifiedAt),
	}),
);

export const contentBlocks = sqliteTable(
	"content_blocks",
	{
		hash: text("hash").primaryKey(),
		data: text("data").notNull(),
		size: integer("size").notNull(),
		refCount: integer("ref_count").notNull().default(1),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => ({
		refCountIdx: index("ref_count_idx").on(table.refCount),
		lastAccessIdx: index("last_access_idx").on(table.lastAccessedAt),
	}),
);

export const searchIndex = sqliteTable(
	"search_index",
	{
		nodeId: text("node_id")
			.primaryKey()
			.references(() => nodes.id, { onDelete: "cascade" }),
		searchVector: text("search_vector"),
		textContent: text("text_content"),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => ({
		searchVectorIdx: index("search_vector_idx").on(table.searchVector),
	}),
);

export const versions = sqliteTable(
	"versions",
	{
		id: text("id").primaryKey(),
		nodeId: text("node_id")
			.notNull()
			.references(() => nodes.id, { onDelete: "cascade" }),
		version: integer("version").notNull(),
		contentHash: text("content_hash")
			.notNull()
			.references(() => contentBlocks.hash),
		size: integer("size").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
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

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type ContentBlock = typeof contentBlocks.$inferSelect;
export type NewContentBlock = typeof contentBlocks.$inferInsert;
export type SearchIndex = typeof searchIndex.$inferSelect;
export type Version = typeof versions.$inferSelect;
