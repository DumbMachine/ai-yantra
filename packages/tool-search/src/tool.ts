import { tool as aiTool } from "ai";

// Define the extended options type
type ExtendedToolOptions = Parameters<typeof aiTool>[0] & {
	defer_loading?: boolean;
};

// Define the Custom Tool type
export type CustomTool = ReturnType<typeof aiTool> & {
	defer_loading?: boolean;
};

// The wrapper function
export function tool(options: ExtendedToolOptions): CustomTool {
	const t = aiTool(options) as CustomTool;
	t.defer_loading = options.defer_loading;
	return t;
}
