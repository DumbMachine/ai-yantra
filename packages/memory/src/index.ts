import { Memory } from "./memory.js";
import { createMemoryTools, type MemoryTools } from "./tools.js";
import { memorySystemPrompt } from "./system-prompt.js";
import type { MemoryConfig } from "./types.js";
import type { DbFs } from "@yantra/pg-fs";

export { Memory } from "./memory.js";
export { createMemoryTools, type MemoryTools } from "./tools.js";
export { memorySystemPrompt } from "./system-prompt.js";
export { validateMemoryPath } from "./path-validation.js";
export type { MemoryConfig } from "./types.js";

export async function createMemory(config?: MemoryConfig): Promise<{
	memory: Memory;
	tools: MemoryTools;
	systemPrompt: string;
	dbFs: DbFs;
}> {
	const { memory, dbFs } = await Memory.create(config);
	const tools = createMemoryTools(memory);

	return {
		memory,
		tools,
		systemPrompt: memorySystemPrompt,
		dbFs,
	};
}
