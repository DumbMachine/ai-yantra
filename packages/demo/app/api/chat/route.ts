import { exampleSkills } from "@/lib/example-skills";
import { allTools, TOTAL_TOOLS } from "@/lib/example-tools";
import { ptcTools } from "@/lib/ptc-tools";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Skills } from "@ai-yantra/skills";
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	LanguageModelUsage,
	streamText,
	UIMessage,
} from "ai";
import { Pool } from "pg";
import { PgFs, TestSystemPrompt } from "@ai-yantra/pg-fs";
import { createMemory, memorySystemPrompt } from "@ai-yantra/memory";
import { createPTC } from "@ai-yantra/ptc";
import { createToolSearch } from "@ai-yantra/tool-search";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

// Create LMStudio provider
const lmstudio = createOpenAICompatible({
	name: "lmstudio",
	baseURL: "http://localhost:4141",
});

type UsageEvent = {
	type: "data-usage";
	data: LanguageModelUsage;
};

type ActiveToolsEvent = {
	type: "data-active-tools";
	data: {
		activeTools: string[];
		totalTools: number;
		strategy: "regex";
	};
};

type PTCTokenEvent = {
	type: "data-ptc-tokens";
	data: {
		ptc?: number;
		regular?: number;
	};
};

type ToolSearchCustomEvent = UsageEvent | ActiveToolsEvent | PTCTokenEvent;

interface FileNode {
	name: string;
	path: string;
	isDirectory: boolean;
	size?: number;
	children?: FileNode[];
}

async function buildFileTree(
	fs: PgFs["fs"],
	path: string = ".",
): Promise<FileNode[]> {
	try {
		const result = await fs.readdirStats(path);
		const nodes: FileNode[] = [];

		for (const item of result.items) {
			const node: FileNode = {
				name: item.name,
				path: item.path,
				isDirectory: item.isDirectory,
				size: item.size,
			};

			if (item.isDirectory) {
				node.children = await buildFileTree(fs, item.path);
			}

			nodes.push(node);
		}

		return nodes;
	} catch {
		return [];
	}
}

export async function GET(req: Request) {
	const demo = req.headers.get("demo");

	if (demo === "pg-fs") {
		const databaseUrl = process.env.DATABASE_URL;
		if (!databaseUrl) {
			return new Response(
				JSON.stringify({ error: "DATABASE_URL not configured" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		try {
			const pool = new Pool({ connectionString: databaseUrl });
			const pgfs = await PgFs.create({ pool });

			// Build file tree recursively from root
			const files = await buildFileTree(pgfs.fs, ".");

			return new Response(JSON.stringify({ files }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		} catch (error) {
			console.error("Failed to list files:", error);
			return new Response(
				JSON.stringify({
					error: error instanceof Error ? error.message : "Unknown error",
					files: [],
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}
	}

	if (demo === "memory") {
		try {
			const { memory } = await getMemoryInstance();
			let files: MemoryFileNode[] = [];
			try {
				const view = await memory.view("/memories");
				files = parseMemoryListing(view);
			} catch {
				files = [];
			}
			return new Response(JSON.stringify({ files }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: error instanceof Error ? error.message : "Unknown error",
					files: [],
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}
	}

	return new Response(JSON.stringify({ error: "Invalid demo type" }), {
		status: 400,
		headers: { "Content-Type": "application/json" },
	});
}

export async function POST(req: Request) {
	const {
		messages,
		model,
		activeDemo: demo,
		usePTC,
	}: {
		messages: UIMessage[];
		model: string;
		activeDemo:
			| "pg-fs"
			| "tool-search"
			| "programmable-calls"
			| "skills"
			| "memory";
		usePTC?: boolean;
	} = await req.json();

	// Parse model format: <provider>/<modelName>
	const [provider, modelName] = (
		model || "github-copilot/grok-code-fast-1"
	).split("/");

	if (!provider || !modelName) {
		return new Response(
			JSON.stringify({
				error: "Invalid model format. Expected: provider/modelName",
			}),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	console.log({ demo });

	// Handle different demo configurations
	if (demo === "tool-search") {
		return handleToolSearch(messages, modelName);
	} else if (demo === "pg-fs") {
		return handlePgFs(messages, modelName);
	} else if (demo === "programmable-calls") {
		return handlePTC(messages, modelName, usePTC ?? true);
	} else if (demo === "skills") {
		return handleSkills(messages, modelName);
	} else if (demo === "memory") {
		return handleMemory(messages, modelName);
	} else if (demo === "basic") {
		return handleBasic(messages, modelName);
	} else {
		return new Response(
			JSON.stringify({ error: `Unknown demo type: ${demo}` }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}
}

async function handleToolSearch(messages: UIMessage[], modelName: string) {
	// Initialize tool search with all example tools
	const toolSearch = createToolSearch({
		tools: allTools,
		strategy: "regex",
		searchToolName: "tool_search",
	});

	const xmessages = await convertToModelMessages(messages);

	const stream = createUIMessageStream<UIMessage<ToolSearchCustomEvent>>({
		execute: async ({ writer }) => {
			const maxSteps = 15;
			let stepCount = 0;

			// Emit initial active tools state
			writer.write({
				type: "data-active-tools",
				data: {
					activeTools: toolSearch.activeTools,
					totalTools: TOTAL_TOOLS,
					strategy: "regex",
				},
			} as ActiveToolsEvent);

			while (stepCount < maxSteps) {
				stepCount++;

				// Prepare tools for this step (gets active tools from toolSearch)
				const preparedStep = await toolSearch.prepareStep({});
				const activeToolsForStep = preparedStep.activeTools.reduce(
					(acc, toolName) => {
						const tool = toolSearch.tools[toolName];
						if (tool) {
							acc[toolName] = tool;
						}
						return acc;
					},
					{} as typeof toolSearch.tools,
				);

				const result = streamText({
					model: lmstudio(modelName),
					system: `You are a helpful AI assistant with access to tools for GitHub, Slack, Sentry, and Grafana integrations.

# Core Behavior

- Be concise, direct, and action-oriented
- Execute tasks autonomously without asking for permission
- Use tools immediately when needed
- Verify your work by reading files or evaluating results
- Minimize unnecessary explanations and confirmations
- Respond in the user's language
- Avoid filler phrases like "Certainly", "Of course", "I apologize"

# Agentic Workflow

When given a task:
1. Assess what information you have and what you need
2. Choose appropriate tools based on task requirements
3. Execute steps using available tools
4. Verify correctness of your work
5. Continue iterating until complete or blocked

Work in loops:
- Plan tasks (implicitly unless complex)
- Execute autonomously
- Adapt based on results
- Track progress concisely

# Proactiveness

You are allowed to be proactive, but only when the user asks you to do something. You should strive to strike a balance between:
1. Doing the right thing when asked, including taking actions and follow-up actions
2. Not surprising the user with actions you take without asking For example, if the user asks you how to approach something, you should do your best to answer their question first, and not immediately jump into taking actions.

# Communication Style

- Keep responses under 4 lines unless detail requested
- Answer directly without preamble or postamble
- No summaries unless complexity requires it
- Ask only when blocked

When you need tools that aren't immediately available, use the tool_search tool to discover them by searching with relevant keywords.

Searches for available tools using regex patterns. You can access any tool by searching for matching names or descriptions.

Usage:
- The query parameter must be a valid JavaScript regex pattern, NOT natural language
- By default, searches are case-insensitive (use (?i) flag for explicit case-insensitive)
- Common patterns: "weather" matches tools containing "weather", "get_.*_data" matches tools like get_user_data, "(?i)slack" for case-insensitive
- Maximum query length: 200 characters
- Results include tools whose names or descriptions match the regex pattern
- If no matches found, returns empty array
- Use this to find tools to help complete the user's request

Available tool categories:
- GitHub: repositories, issues, pull requests, commits, branches, releases, workflows
- Slack: messages, channels, users, files, threads, reactions
- Sentry: issues, projects, releases, events, alerts, teams
- Grafana: dashboards, datasources, alerts, annotations, folders, metrics

Be concise and helpful in your responses.`,
					messages: xmessages,
					tools: activeToolsForStep,
					// tools: allTools,
					onStepFinish: async ({ usage }) => {
						// Emit usage data
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);

						// Emit updated active tools after each step
						writer.write({
							type: "data-active-tools",
							data: {
								activeTools: toolSearch.activeTools,
								totalTools: TOTAL_TOOLS,
								strategy: "regex",
							},
						} as ActiveToolsEvent);
					},
					onFinish: async ({ usage }) => {
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);
					},
				});

				// Required when manually merging streams
				result.consumeStream();

				await new Promise<void>((resolve, reject) => {
					writer.merge(
						result.toUIMessageStream({
							sendReasoning: true,
							onFinish: () => {
								resolve();
							},
							onError: (error) => {
								reject(error);
								return "error";
							},
						}),
					);
				});

				const finishReason = await result.finishReason;
				if (finishReason !== "tool-calls") {
					break;
				}

				const ymessages = (await result.response).messages;
				xmessages.push(...ymessages);

				console.log(
					`[Tool-Search] Step ${stepCount}: ${toolSearch.activeTools.length}/${TOTAL_TOOLS} tools active`,
				);
			}

			// Emit final active tools state
			writer.write({
				type: "data-active-tools",
				data: {
					activeTools: toolSearch.activeTools,
					totalTools: TOTAL_TOOLS,
					strategy: "regex",
				},
			} as ActiveToolsEvent);
		},
	});

	return createUIMessageStreamResponse({
		stream,
		consumeSseStream: () => {
			// todo: store for resumable stream
		},
	});
}

async function handlePgFs(messages: UIMessage[], modelName: string) {
	// Get database URL from environment
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		return new Response(
			JSON.stringify({ error: "DATABASE_URL not configured" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	try {
		// Initialize PgFs
		const pool = new Pool({ connectionString: databaseUrl });
		const pgfs = await PgFs.create({ pool });

		const xmessages = await convertToModelMessages(messages);

		const stream = createUIMessageStream<UIMessage<UsageEvent>>({
			execute: async ({ writer }) => {
				const maxSteps = 15;
				let stepCount = 0;

				while (stepCount < maxSteps) {
					stepCount++;

					const result = streamText({
						model: lmstudio(modelName),
						system: TestSystemPrompt,
						messages: xmessages,
						tools: pgfs.tools as any,
						onStepFinish: async ({ usage }) => {
							writer.write({
								type: "data-usage",
								data: usage,
							} as UsageEvent);
						},
						onFinish: async ({ usage }) => {
							writer.write({
								type: "data-usage",
								data: usage,
							} as UsageEvent);
						},
					});

					// Required when manually merging streams
					result.consumeStream();

					await new Promise<void>((resolve, reject) => {
						writer.merge(
							result.toUIMessageStream({
								sendReasoning: true,
								onFinish: () => {
									resolve();
								},
								onError: (error) => {
									reject(error);
									return "error";
								},
							}),
						);
					});

					const finishReason = await result.finishReason;
					if (finishReason !== "tool-calls") {
						break;
					}

					const ymessages = (await result.response).messages;
					xmessages.push(...ymessages);

					console.log(
						`[PgFs] Continuing to step ${stepCount + 1} due to tool-calls`,
					);
				}
			},
		});

		return createUIMessageStreamResponse({
			stream,
			consumeSseStream: () => {
				// todo: store for resumable stream
			},
		});
	} catch (error) {
		console.error("pg-fs API error:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Unknown error",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

async function handlePTC(
	messages: UIMessage[],
	modelName: string,
	usePTC: boolean = true,
) {
	// Initialize PTC with expense management tools
	// @ts-ignore
	const ptc = createPTC(ptcTools, {
		timeout: 5000,
		toolName: "execute_javascript",
	});

	const xmessages = await convertToModelMessages(messages);

	const stream = createUIMessageStream<UIMessage<ToolSearchCustomEvent>>({
		execute: async ({ writer }) => {
			const maxSteps = 15;
			let stepCount = 0;

			while (stepCount < maxSteps) {
				stepCount++;

				const result = streamText({
					model: lmstudio(modelName),
					system: usePTC
						? `You are a helpful AI assistant with access to JavaScript execution capabilities for complex expense management workflows.

# Core Behavior

- Be concise, direct, and action-oriented
- Execute tasks autonomously without asking for permission
- Use JavaScript execution for multi-step business logic
- Verify your work by examining results
- Minimize unnecessary explanations and confirmations

# PTC (Programmable Tool Calling) Workflow

You have access to JavaScript execution that can call multiple tools in sequence. Use this for:

1. **Complex Multi-Step Workflows**: When you need to call multiple tools with business logic between calls
2. **Data Processing & Analysis**: Aggregating data, calculations, and transformations
3. **Conditional Logic**: If-then-else workflows based on tool results
4. **Iterative Processing**: Loops over collections of data

# Available Tools in JavaScript Environment

- get_team_members(department) - Get employees by department
- get_expenses(employeeId, quarter) - Get expense records
- get_custom_budget(employeeId) - Check custom budgets
- send_notification(to, subject, body) - Send email notifications
- calculate_department_average(department) - Calculate spending averages
- generate_expense_report(department, quarter) - Generate compliance reports

# JavaScript Usage

When you need complex logic, write JavaScript code that:
- Calls tools as async functions
- Uses console.log() to output results
- Handles errors with try/catch
- Processes data with loops and conditionals

Example:
\`\`\`javascript
// Get engineering team
const team = await get_team_members({ department: 'Engineering' });

// Process each member's expenses
for (const member of team.data) {
  const expenses = await get_expenses({ employeeId: member.id, quarter: 'Q1-2024' });
  console.log(\`\${member.name}: $\${expenses.summary.totalAmount}\`);
}
\`\`\`

The JavaScript executor will run your code and return console output.`
						: `You are a helpful AI assistant with access to individual tools for expense management.

# Available Tools

- get_team_members(department) - Get employees by department
- get_expenses(employeeId, quarter) - Get expense records  
- get_custom_budget(employeeId) - Check custom budgets
- send_notification(to, subject, body) - Send email notifications
- calculate_department_average(department) - Calculate spending averages
- generate_expense_report(department, quarter) - Generate compliance reports

Use these tools individually to complete tasks. Each tool call will be executed separately.`,
					messages: xmessages,
					tools: usePTC ? ptc.tools : ptcTools,
					onStepFinish: async ({ usage }) => {
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);

						// Emit PTC token comparison data
						writer.write({
							type: "data-ptc-tokens",
							data: {
								[usePTC ? "ptc" : "regular"]: usage.totalTokens,
							},
						} as PTCTokenEvent);
					},
					onFinish: async ({ usage }) => {
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);

						// Emit final PTC token comparison data
						writer.write({
							type: "data-ptc-tokens",
							data: {
								[usePTC ? "ptc" : "regular"]: usage.totalTokens,
							},
						} as PTCTokenEvent);
					},
				});

				// Required when manually merging streams
				result.consumeStream();

				await new Promise<void>((resolve, reject) => {
					writer.merge(
						result.toUIMessageStream({
							sendReasoning: true,
							onFinish: () => {
								resolve();
							},
							onError: (error) => {
								reject(error);
								return "error";
							},
						}),
					);
				});

				const finishReason = await result.finishReason;
				if (finishReason !== "tool-calls") {
					break;
				}

				const ymessages = (await result.response).messages;
				xmessages.push(...ymessages);

				console.log(
					`[PTC] Continuing to step ${stepCount + 1} due to tool-calls`,
				);
			}
		},
	});

	return createUIMessageStreamResponse({
		stream,
		consumeSseStream: () => {
			// todo: store for resumable stream
		},
	});
}

async function handleSkills(messages: UIMessage[], modelName: string) {
	const skills = Skills.fromDefinitions(exampleSkills);

	const xmessages = await convertToModelMessages(messages);

	const stream = createUIMessageStream<UIMessage<UsageEvent>>({
		execute: async ({ writer }) => {
			const maxSteps = 15;
			let stepCount = 0;

			while (stepCount < maxSteps) {
				stepCount++;

				const result = streamText({
					model: lmstudio(modelName),
					system: `You are a helpful AI assistant with access to specialized skills.

# Core Behavior

- Be concise, direct, and action-oriented
- Execute tasks autonomously without asking for permission
- Use skills when the user's request matches a skill description
- After loading a skill, follow its instructions precisely
- Use readSkillFile to access any referenced files (scripts, references, assets)

# Skills Workflow

1. When a user's request matches a skill, call loadSkill to get the instructions
2. Follow the loaded instructions step-by-step
3. Use readSkillFile to access any files mentioned in the skill instructions
4. Apply the skill's guidelines to produce the output

${skills.buildPrompt()}`,
					messages: xmessages,
					tools: skills.tools as any,
					onStepFinish: async ({ usage }) => {
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);
					},
					onFinish: async ({ usage }) => {
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);
					},
				});

				result.consumeStream();

				await new Promise<void>((resolve, reject) => {
					writer.merge(
						result.toUIMessageStream({
							sendReasoning: true,
							onFinish: () => {
								resolve();
							},
							onError: (error) => {
								reject(error);
								return "error";
							},
						}),
					);
				});

				const finishReason = await result.finishReason;
				if (finishReason !== "tool-calls") {
					break;
				}

				const ymessages = (await result.response).messages;
				xmessages.push(...ymessages);

				console.log(
					`[Skills] Continuing to step ${stepCount + 1} due to tool-calls`,
				);
			}
		},
	});

	return createUIMessageStreamResponse({
		stream,
		consumeSseStream: () => {},
	});
}

// Memory singleton - persists across requests during the server lifetime
interface MemoryFileNode {
	name: string;
	path: string;
	isDirectory: boolean;
	size?: number;
	children?: MemoryFileNode[];
}

let memoryInstance: Awaited<ReturnType<typeof createMemory>> | null = null;

async function getMemoryInstance() {
	if (!memoryInstance) {
		memoryInstance = await createMemory({ filename: "./.memories.db" });
	}
	return memoryInstance;
}

function parseMemoryListing(view: string): MemoryFileNode[] {
	const lines = view.split("\n").filter((l) => l.trim());
	const files: MemoryFileNode[] = [];

	for (const line of lines) {
		if (line.startsWith("Here's the content of")) continue;

		const indented = line.startsWith("  ");
		const trimmed = line.trim();

		if (!indented) {
			if (trimmed.endsWith("/")) {
				const name = trimmed.slice(0, -1);
				files.push({
					name,
					path: `/memories/${name}`,
					isDirectory: true,
					children: [],
				});
			} else {
				const match = trimmed.match(/^(.+?)\s+\([\d.]+[BKMG]\)$/);
				const name = match ? match[1] : trimmed;
				files.push({
					name,
					path: `/memories/${name}`,
					isDirectory: false,
				});
			}
		} else {
			const parent = files[files.length - 1];
			if (parent?.isDirectory) {
				if (trimmed.endsWith("/")) {
					const name = trimmed.slice(0, -1);
					parent.children = parent.children || [];
					parent.children.push({
						name,
						path: `${parent.path}/${name}`,
						isDirectory: true,
					});
				} else {
					const match = trimmed.match(/^(.+?)\s+\([\d.]+[BKMG]\)$/);
					const name = match ? match[1] : trimmed;
					parent.children = parent.children || [];
					parent.children.push({
						name,
						path: `${parent.path}/${name}`,
						isDirectory: false,
					});
				}
			}
		}
	}

	return files;
}

async function handleMemory(messages: UIMessage[], modelName: string) {
	const { tools, systemPrompt } = await getMemoryInstance();

	const xmessages = await convertToModelMessages(messages);

	const stream = createUIMessageStream<UIMessage<UsageEvent>>({
		execute: async ({ writer }) => {
			const maxSteps = 15;
			let stepCount = 0;

			while (stepCount < maxSteps) {
				stepCount++;

				const result = streamText({
					model: lmstudio(modelName),
					system: systemPrompt,
					messages: xmessages,
					tools: tools as any,
					onStepFinish: async ({ usage }) => {
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);
					},
					onFinish: async ({ usage }) => {
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);
					},
				});

				result.consumeStream();

				await new Promise<void>((resolve, reject) => {
					writer.merge(
						result.toUIMessageStream({
							sendReasoning: true,
							onFinish: () => {
								resolve();
							},
							onError: (error) => {
								reject(error);
								return "error";
							},
						}),
					);
				});

				const finishReason = await result.finishReason;
				if (finishReason !== "tool-calls") {
					break;
				}

				const ymessages = (await result.response).messages;
				xmessages.push(...ymessages);

				console.log(
					`[Memory] Continuing to step ${stepCount + 1} due to tool-calls`,
				);
			}
		},
	});

	return createUIMessageStreamResponse({
		stream,
		consumeSseStream: () => {},
	});
}

async function handleBasic(messages: UIMessage[], modelName: string) {
	const stream = createUIMessageStream<UIMessage<UsageEvent>>({
		execute: async ({ writer }) => {
			const maxSteps = 15;
			let stepCount = 0;
			const xmessages = await convertToModelMessages(messages);

			while (stepCount < maxSteps) {
				stepCount++;
				const result = streamText({
					model: lmstudio(modelName),
					system: "You are a helpful assistant.",
					messages: xmessages,
					onStepFinish: async ({ usage }) => {
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);
					},
					onFinish: async ({ usage }) => {
						writer.write({
							type: "data-usage",
							data: usage,
						} as UsageEvent);
					},
				});

				// Required when manually merging streams
				result.consumeStream();

				await new Promise<void>((resolve, reject) => {
					writer.merge(
						result.toUIMessageStream({
							sendReasoning: true,
							onFinish: () => {
								resolve();
							},
							onError: (error) => {
								reject(error);
								return "error";
							},
						}),
					);
				});

				const finishReason = await result.finishReason;
				if (finishReason !== "tool-calls") {
					break;
				}

				const ymessages = (await result.response).messages;
				xmessages.push(...ymessages);

				console.log(
					`[Basic] Continuing to step ${stepCount + 1} due to tool-calls`,
				);
			}

			if (stepCount >= maxSteps) {
				console.warn(`[Basic] Reached max steps (${maxSteps})`);
			} else {
				console.log(`[Basic] Finished after ${stepCount} steps`);
			}
		},
	});

	return createUIMessageStreamResponse({
		stream,
		consumeSseStream: () => {
			// todo, store for resumable stream somewhere
			// updateChat with metadata of total tokens
		},
	});
}
