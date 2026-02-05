import type { Tool } from "ai";
import { z } from "zod";
import { bm25Strategy, regexStrategy, type SearchStrategy } from "./search";
import { tool } from "./tool";

type ToolMap = Record<string, Tool & { defer_loading?: boolean }>;

interface ToolSearchOptions {
	tools: ToolMap;
	strategy?: "regex" | "bm25";
	searchToolName?: string;
}

export function createToolSearch({
	tools,
	strategy = "regex",
	searchToolName = "tool_search",
}: ToolSearchOptions) {
	// 1. Separate static vs deferred tools
	const staticToolNames = Object.entries(tools)
		.filter(([_, t]) => !t.defer_loading)
		.map(([name]) => name);

	// 2. Initialize State: active tools starts with just static tools
	const activeToolSet = new Set<string>([...staticToolNames, searchToolName]);

	// 3. Select Strategy
	const searchEngine: SearchStrategy =
		strategy === "bm25" ? bm25Strategy : regexStrategy;

	// 4. Create the Search Tool
	const searchTool = tool({
		description: `Searches for available tools using regex patterns. You can access any tool by searching for matching names or descriptions.

Usage:
- The query parameter must be a valid JavaScript regex pattern, NOT natural language
- By default, searches are case-insensitive (use (?i) flag for explicit case-insensitive)
- Common patterns: "weather" matches tools containing "weather", "get_.*_data" matches tools like get_user_data, "(?i)slack" for case-insensitive
- Maximum query length: 200 characters
- Results include tools whose names or descriptions match the regex pattern
- If no matches found, returns empty array
- Use this to find tools to help complete the user's request`,
		inputSchema: z.object({
			query: z
				.string()
				.max(200)
				.describe(
					"The search query as a JavaScript regex pattern (e.g., 'weather', 'get_.*_data', '(?i)slack')",
				),
		}),
		execute: async ({ query }: { query: string }) => {
			if (query.trim().length === 0) {
				return {
					message: "No query provided. Please provide a valid search query.",
					tools: [],
				};
			}

			const foundToolNames = searchEngine.search(query, tools);

			// Update state: Add found tools to the active set for future steps
			foundToolNames.forEach((name) => activeToolSet.add(name));

			// Return details to the model so it knows what it found immediately
			const foundToolDetails = foundToolNames.map((name) => {
				const t = tools[name];
				// We return a simplified schema description to the model
				return {
					name,
					description: t.description,
					// Note: In a real scenario, you might want to serialise inputSchema here
					// if your model needs to see it immediately to use it in the *next* step.
				};
			});

			return {
				message: `Found ${foundToolNames.length} fools. They are now available for use.`,
				tools: foundToolDetails,
			};
		},
	});

	// 5. The prepareStep Hook
	const prepareStep = async ({ activeTools }: { activeTools?: string[] }) => {
		// We return the list of tools that should be active for this step.
		// This includes always-on tools + tools discovered via search in previous steps.
		return {
			activeTools: Array.from(activeToolSet),
		};
	};

	// 6. Return the bundle
	return {
		// Merge the user's tools with our search tool
		tools: { ...tools, [searchToolName]: searchTool },
		prepareStep,
		get activeTools() {
			return Array.from(activeToolSet);
		},
	};
}

module.exports.tool = tool;
