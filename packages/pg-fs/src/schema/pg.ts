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

export const nodes = pgTable(
	"nodes",
	{
		id: text("id").primaryKey(),
		path: text("path").notNull().unique(),
		name: text("name").notNull(),
		treePath: text("tree_path").notNull(),
		parentId: text("parent_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		isDirectory: boolean("is_directory").notNull().default(false),
		size: bigint("size", { mode: "number" }).notNull().default(0),
		mimeType: text("mime_type"),
		contentHash: text("content_hash"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		modifiedAt: timestamp("modified_at").notNull().defaultNow(),
		accessedAt: timestamp("accessed_at").notNull().defaultNow(),
		mode: text("mode").notNull().default("0644"),
		owner: text("owner").notNull().default("default"),
		metadata: jsonb("metadata").default({}),
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

export const contentBlocks = pgTable(
	"content_blocks",
	{
		hash: text("hash").primaryKey(),
		data: text("data").notNull(),
		size: bigint("size", { mode: "number" }).notNull(),
		refCount: bigint("ref_count", { mode: "number" }).notNull().default(1),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		lastAccessedAt: timestamp("last_accessed_at").notNull().defaultNow(),
	},
	(table) => ({
		refCountIdx: index("ref_count_idx").on(table.refCount),
		lastAccessIdx: index("last_access_idx").on(table.lastAccessedAt),
	}),
);

export const searchIndex = pgTable(
	"search_index",
	{
		nodeId: text("node_id")
			.primaryKey()
			.references(() => nodes.id, { onDelete: "cascade" }),
		searchVector: text("search_vector"),
		textContent: text("text_content"),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		searchVectorIdx: index("search_vector_idx").on(table.searchVector),
	}),
);

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

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type ContentBlock = typeof contentBlocks.$inferSelect;
export type NewContentBlock = typeof contentBlocks.$inferInsert;
export type SearchIndex = typeof searchIndex.$inferSelect;
export type Version = typeof versions.$inferSelect;
