import type { Config } from "drizzle-kit";

export default {
	schema: "./src/schema/sqlite.ts",
	out: "./drizzle-sqlite",
	dialect: "sqlite",
} satisfies Config;
