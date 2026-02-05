import winkBM25 from "wink-bm25-text-search";
import type { Tool } from "ai";

type ToolMap = Record<string, Tool & { defer_loading?: boolean }>;

export interface SearchStrategy {
	search(query: string, tools: ToolMap): string[];
}

export const regexStrategy: SearchStrategy = {
	search(query: string, tools: ToolMap) {
		if (query.length > 200) {
			return []; // Maximum query length: 200 characters
		}

		const results: string[] = [];
		// Regex variant query format: JavaScript regex (Node.js), NOT natural language
		// Common patterns: "weather", "get_.*_data", "database.*query|query.*database", "(?i)slack"
		const regex = new RegExp(query, "i"); // Case-insensitive by default, but (?i) flag can override

		for (const [name, tool] of Object.entries(tools)) {
			if (
				regex.test(name) ||
				(tool.description && regex.test(tool.description))
			) {
				results.push(name);
			}
		}
		return results;
	},
};

export const bm25Strategy: SearchStrategy = {
	search(query: string, tools: ToolMap) {
		const engine = winkBM25();

		engine.defineConfig({ fldWeights: { name: 2, description: 1 } });

		const docs = Object.entries(tools).map(([name, tool]) => ({
			name,
			description: tool.description || "",
			id: name,
		}));

		docs.forEach((doc) => engine.addDoc(doc));
		engine.consolidate();

		// Search and return top 5 results
		const results = engine.search(query, 5);
		return results.map((r: any) => r.id);
	},
};
