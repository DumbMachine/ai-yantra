#!/usr/bin/env node

/**
 * Interactive Coding Agent Demo
 *
 * A streamlined terminal-based coding agent that uses pg-fs for storage.
 * Uses readline interface like @apps/ptc-demo.
 *
 * Usage:
 *   pnpm tsx examples/interactive-coding-agent.ts
 */

import { createInterface } from "readline";
import { Pool } from "pg";
import { PgFs } from "../src/index.js";
import { ModelMessage, streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { systemPrompt } from "./system-prompt.js";

// LM Studio compatible provider
const lmstudio = createOpenAICompatible({
	name: "lmstudio",
	baseURL: "http://localhost:4141",
});

// ANSI colors
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
};

const theme = {
	primary: colors.cyan,
	secondary: colors.blue,
	success: colors.green,
	warning: colors.yellow,
	error: colors.red,
	muted: colors.gray,
	highlight: colors.magenta,
	agent: colors.cyan,
	user: colors.green,
	tool: colors.yellow,
	border: colors.blue,
};

const box = {
	topLeft: "╭",
	topRight: "╮",
	bottomLeft: "╰",
	bottomRight: "╯",
	horizontal: "─",
	vertical: "│",
};

const icons = {
	user: "▶",
	agent: "◆",
	tool: "⚙",
	success: "✓",
	error: "✗",
	file: "📄",
	folder: "📁",
};

let pgfs: PgFs;

function stripAnsi(str: string): string {
	return str.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "");
}

function wrapText(text: string, maxWidth: number): string[] {
	const lines: string[] = [];
	const paragraphs = text.split("\n");

	paragraphs.forEach((para) => {
		const plainPara = stripAnsi(para);
		if (plainPara.length <= maxWidth) {
			lines.push(para);
			return;
		}

		let currentLine = "";
		let plainCurrentLine = "";
		const words = para.split(" ");

		for (const word of words) {
			const plainWord = stripAnsi(word);
			const testLine =
				plainCurrentLine + (plainCurrentLine ? " " : "") + plainWord;
			if (testLine.length <= maxWidth) {
				currentLine += (currentLine ? " " : "") + word;
				plainCurrentLine = testLine;
			} else {
				if (currentLine) lines.push(currentLine);
				currentLine = word;
				plainCurrentLine = plainWord;
			}
		}

		if (currentLine) lines.push(currentLine);
	});

	return lines.length > 0 ? lines : [text];
}

function drawBox(title: string, content: string[], width: number = 90): string {
	const lines: string[] = [];
	const titleText = ` ${title} `;
	const leftPad = Math.floor((width - titleText.length - 2) / 2);
	const rightPad = width - titleText.length - leftPad - 2;

	lines.push(
		theme.border +
			box.topLeft +
			box.horizontal.repeat(leftPad) +
			theme.primary +
			colors.bright +
			titleText +
			colors.reset +
			theme.border +
			box.horizontal.repeat(rightPad) +
			box.topRight +
			colors.reset,
	);

	content.forEach((line) => {
		const maxLineWidth = width - 4;
		const wrappedLines = wrapText(line, maxLineWidth);

		wrappedLines.forEach((wrappedLine) => {
			const plainLength = stripAnsi(wrappedLine).length;
			const padding = maxLineWidth - plainLength;
			lines.push(
				theme.border +
					box.vertical +
					colors.reset +
					" " +
					wrappedLine +
					" ".repeat(Math.max(0, padding)) +
					" " +
					theme.border +
					box.vertical +
					colors.reset,
			);
		});
	});

	lines.push(
		theme.border +
			box.bottomLeft +
			box.horizontal.repeat(width - 2) +
			box.bottomRight +
			colors.reset,
	);

	return lines.join("\n");
}

function formatToolCall(toolName: string, args: any): string {
	const argsStr = JSON.stringify(args, null, 2);
	return `${theme.tool}${icons.tool} ${colors.bright}${toolName}${colors.reset}${theme.muted}\n${argsStr}${colors.reset}`;
}

function formatToolResult(toolName: string, result: any): string {
	let resultStr: string;
	if (typeof result === "object" && result !== null) {
		resultStr = JSON.stringify(result, null, 2);
	} else {
		resultStr = String(result);
	}
	return `${theme.success}${icons.success} ${toolName}${colors.reset}\n${theme.muted}${resultStr.substring(0, 200)}${resultStr.length > 200 ? "..." : ""}${colors.reset}`;
}

function formatMessage(role: "user" | "agent", text: string): string {
	if (role === "user") {
		return `${theme.user}${icons.user} You${colors.reset}\n${text}`;
	} else {
		return `${theme.agent}${icons.agent} Agent${colors.reset}\n${text}`;
	}
}

async function initializePgFs(): Promise<boolean> {
	process.stdout.write(
		`${theme.muted}Connecting to PostgreSQL...${colors.reset} `,
	);
	try {
		const pool = new Pool({
			connectionString:
				process.env.DATABASE_URL ||
				"postgresql://localhost:5432/pgfs_coding_agent",
		});
		pgfs = await PgFs.create({ pool });
		console.log(`${theme.success}${icons.success} Connected${colors.reset}`);
		return true;
	} catch (error) {
		console.log(`${theme.error}${icons.error} Failed${colors.reset}`);
		console.log(
			`${theme.error}Error: ${error instanceof Error ? error.message : "Unknown error"}${colors.reset}`,
		);
		console.log(
			`${theme.muted}Create database: createdb pgfs_coding_agent${colors.reset}`,
		);
		return false;
	}
}

async function listFiles(
	path: string = "/",
	prefix: string = "",
): Promise<string> {
	try {
		const stats = await pgfs.fs.readdirStats(path);
		let output = "";
		for (let i = 0; i < stats.length; i++) {
			const item = stats[i];
			const isLast = i === stats.length - 1;
			const connector = isLast ? "└── " : "├── ";
			const newPrefix = prefix + (isLast ? "    " : "│   ");
			const icon = item.isDirectory ? icons.folder : icons.file;
			const size = item.isDirectory ? "" : theme.muted(` (${item.size}b)`);
			output += `${prefix}${connector}${icon} ${item.name}${size}\n`;
			if (item.isDirectory) {
				const subTree = await listFiles(item.path, newPrefix);
				output += subTree;
			}
		}
		return output;
	} catch {
		return "";
	}
}

const scenarios = [
	{
		name: "Create Express API",
		description: "Generate a REST API with routes and middleware",
		prompt:
			"Create a complete Express.js API project at /express-api with user routes, middleware, and error handling. Include package.json, server.js, routes/, and middleware/ directories with complete working code.",
	},
	{
		name: "Build React Component Library",
		description: "Generate reusable React components with TypeScript",
		prompt:
			"Create a React TypeScript component library at /react-components with Button, Card, and Modal components. Include proper TypeScript interfaces, styles, and a README.",
	},
	{
		name: "Setup CLI Tool",
		description: "Generate a CLI tool with argument parsing",
		prompt:
			"Create a CLI tool at /cli-tool using Commander.js with subcommands, options, and help documentation. Include bin/, src/, package.json with bin configuration, and example usage.",
	},
	{
		name: "List Projects",
		description: "Show all existing projects in the filesystem",
		prompt:
			"List all files and directories in the root. Show me what projects exist in the filesystem.",
	},
];

async function main() {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: `${theme.primary}> ${colors.reset}`,
	});

	let conversation: Array<{
		role: "user" | "agent" | "tool-call" | "tool-result";
		content: string;
	}> = [];

	let shouldCancel = false;
	let isProcessing = false;

	function printUI() {
		console.clear();

		const header = [
			`${colors.bright}${theme.primary}Interactive Coding Agent${colors.reset}`,
			`${theme.muted}AI-powered code generation with PostgreSQL storage${colors.reset}`,
			"",
			`${theme.muted}Storage: ${colors.reset}${theme.secondary}PostgreSQL-backed filesystem${colors.reset}`,
			`${theme.muted}AI: ${colors.reset}${theme.highlight}OpenAI GPT-4${colors.reset}`,
			`${theme.muted}Cancel: ${colors.reset}${theme.warning}Ctrl+C${colors.reset}`,
		];
		console.log(drawBox("Coding Agent", header, 100));
		console.log("");

		if (conversation.length === 0) {
			const scenarioLines = [
				`${colors.bright}Quick Start (type number):${colors.reset}`,
				"",
				...scenarios.map(
					(s, i) =>
						`${theme.secondary}${i + 1}.${colors.reset} ${colors.bright}${s.name}${colors.reset}\n   ${theme.muted}${s.description}${colors.reset}`,
				),
				"",
				`${theme.muted}Or type: "Create a Node.js API for todos"${colors.reset}`,
			];
			console.log(drawBox("Scenarios", scenarioLines, 100));
			console.log("");
		}

		if (conversation.length > 0) {
			const conversationLines: string[] = [];
			conversation.forEach((msg, idx) => {
				if (msg.role === "user") {
					conversationLines.push(formatMessage("user", msg.content));
				} else if (msg.role === "agent") {
					conversationLines.push(formatMessage("agent", msg.content));
				} else if (msg.role === "tool-call") {
					conversationLines.push(msg.content);
				} else if (msg.role === "tool-result") {
					conversationLines.push(msg.content);
				}
				if (idx < conversation.length - 1) conversationLines.push("");
			});
			console.log(drawBox("Conversation", conversationLines, 100));
			console.log("");
		}
	}

	const initialized = await initializePgFs();
	if (!initialized) {
		console.log(
			`\n${theme.error}Failed to initialize. Exiting.${colors.reset}`,
		);
		process.exit(1);
	}

	process.on("SIGINT", () => {
		if (isProcessing) {
			shouldCancel = true;
			console.log(`\n${theme.warning}⚠ Cancelling...${colors.reset}`);
		} else {
			console.log(`\n${theme.muted}Goodbye!${colors.reset}`);
			process.exit(0);
		}
	});

	rl.on("line", async (input: string) => {
		if (!input.trim() || isProcessing) {
			rl.prompt();
			return;
		}

		let actualPrompt = input.trim();

		// Handle scenario selection
		const scenarioNum = parseInt(input.trim());
		if (scenarioNum >= 1 && scenarioNum <= scenarios.length) {
			const scenario = scenarios[scenarioNum - 1];
			actualPrompt = scenario.prompt;
			conversation.push({ role: "user", content: scenario.name });
		} else {
			conversation.push({ role: "user", content: input });
		}

		printUI();
		rl.pause();
		isProcessing = true;
		shouldCancel = false;

		const maxSteps = 30;
		isProcessing = true;
		shouldCancel = false;

		let messages:ModelMessage[] = [{role:"user", content:actualPrompt}]

		for (let step = 0; step < maxSteps && !shouldCancel; step++) {
			try {
				const result = streamText({
					system: systemPrompt,
					model: lmstudio("grok-code-fast-1"),
					messages:messages,
					tools: pgfs.tools,
					maxRetries:5
				});

				let streamedText = "";
				let agentMsgIndex = -1;

				for await (const part of result.fullStream) {
					if (shouldCancel) {
						conversation.push({
							role: "tool-result",
							content: `${theme.warning}⚠ Cancelled${colors.reset}`,
						});
						break;
					}

					if (part.type === "text-delta") {
						streamedText += part.text || "";
						if (agentMsgIndex === -1) {
							conversation.push({ role: "agent", content: streamedText });
							agentMsgIndex = conversation.length - 1;
						} else {
							conversation[agentMsgIndex].content = streamedText;
						}
						printUI();
					} else if (part.type === "tool-call") {
						const toolCallMsg = formatToolCall(part.toolName, part.input);
						conversation.push({ role: "tool-call", content: toolCallMsg });
						printUI();
					} else if (part.type === "tool-result") {
						const result = part.output;
						const toolResultMsg = formatToolResult(part.toolName, result);
						conversation.push({ role: "tool-result", content: toolResultMsg });
						printUI();
					} else if (part.type === "error") {
						conversation.push({
							role: "tool-result",
							content: `${theme.error}${icons.error} ${JSON.stringify(part.error)}${colors.reset}`,
						});
						printUI();
					}
				}

				const msg = (await result.response).messages;

				messages = messages.concat(msg);

				if (shouldCancel) {
					break;
				}
				const finishReason = await result.finishReason;
				if (finishReason !== "tool-calls") {
					break;
				}

				if (step === maxSteps - 1) {
					conversation.push({
						role: "tool-result",
						content: `${theme.warning}⚠ Reached maximum steps${colors.reset}`,
					});
				}
			} catch (error) {
				if (!shouldCancel) {
					conversation.push({
						role: "tool-result",
						content: `${theme.error}${icons.error} ${(error as Error).message}${colors.reset}`,
					});
				}
			}
		}

		isProcessing = false;
		shouldCancel = false;
		printUI();
		rl.resume();
		rl.prompt();
	});

	rl.on("close", () => {
		console.log(`\n${theme.muted}Goodbye!${colors.reset}`);
		process.exit(0);
	});

	printUI();
	rl.prompt();
}


main().catch(console.error);
