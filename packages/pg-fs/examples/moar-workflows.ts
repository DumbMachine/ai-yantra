/**
 * Example: Custom Agent Workflows
 *
 * Advanced examples showing custom agent behaviors like:
 * - Code generation and file creation
 * - Project scaffolding
 * - Documentation generation
 * - Batch file operations
 */

import { Pool } from "pg";
import { PgFs } from "../index";
import { ToolLoopAgent } from "ai";
import { openai } from "@ai-sdk/openai";

/**
 * Code Generation Agent
 * Creates a full project from a description
 */
async function codeGenerationAgent() {
	const pool = new Pool({
		connectionString:
			process.env.DATABASE_URL || "postgresql://localhost:5432/pgfs_demo",
	});

	const pgfs = await PgFs.create({ pool });

	const agent = new ToolLoopAgent({
		model: openai("gpt-4"),
		instructions: `You are an expert software developer and project scaffolder.
    
When asked to create a project:
1. Create appropriate directory structure
2. Generate configuration files (package.json, tsconfig.json, etc.)
3. Create source files with proper code
4. Add documentation (README, comments)
5. Follow best practices for the language/framework

Always create complete, working code with proper structure.`,
		tools: pgfs.tools,
	});

	console.log("=== Code Generation Agent ===\n");

	const result = await agent.generate({
		prompt: `Create a simple TypeScript Express API project at /projects/express-api with:
    - Proper package.json with dependencies
    - tsconfig.json
    - src/index.ts with a basic Express server (3 routes: GET /, GET /api/users, POST /api/users)
    - src/types.ts with User interface
    - README.md with setup instructions
    - .gitignore file`,
	});

	console.log(result.text);
	console.log("\n---\n");

	// Verify the structure
	const projectFiles = await getDirectoryTree(pgfs, "/projects/express-api");
	console.log("Generated project structure:");
	console.log(projectFiles);

	await pool.end();
}

/**
 * Documentation Generator Agent
 * Analyzes code and creates documentation
 */
async function documentationAgent() {
	const pool = new Pool({
		connectionString:
			process.env.DATABASE_URL || "postgresql://localhost:5432/pgfs_demo",
	});

	const pgfs = await PgFs.create({ pool });

	// First, create some sample code
	await pgfs.fs.writeFile(
		"/lib/calculator.ts",
		`
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  subtract(a: number, b: number): number {
    return a - b;
  }
  
  multiply(a: number, b: number): number {
    return a * b;
  }
  
  divide(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  }
}
`,
		{ createParents: true },
	);

	const agent = new ToolLoopAgent({
		model: openai("gpt-4"),
		instructions: `You are a technical writer specialized in API documentation.
    
When asked to document code:
1. Read the source files
2. Analyze functions, classes, and interfaces
3. Generate comprehensive documentation with:
   - Overview
   - API reference
   - Examples
   - Parameter descriptions
   - Return values
4. Use markdown format`,
		tools: pgfs.tools,
	});

	console.log("=== Documentation Generator Agent ===\n");

	const result = await agent.generate({
		prompt:
			"Read /lib/calculator.ts and create comprehensive API documentation at /lib/calculator.md",
	});

	console.log(result.text);
	console.log("\n---\n");

	// Show the generated documentation
	const docs = await pgfs.fs.readFile("/lib/calculator.md");
	console.log("Generated documentation:");
	console.log(docs);

	await pool.end();
}

/**
 * Batch Operations Agent
 * Processes multiple files efficiently
 */
async function batchOperationsAgent() {
	const pool = new Pool({
		connectionString:
			process.env.DATABASE_URL || "postgresql://localhost:5432/pgfs_demo",
	});

	const pgfs = await PgFs.create({ pool });

	// Create sample data files
	for (let i = 1; i <= 10; i++) {
		await pgfs.fs.writeFile(
			`/data/log-${i}.txt`,
			`Log entry ${i}\nTimestamp: ${new Date().toISOString()}\n`,
			{
				createParents: true,
			},
		);
	}

	const agent = new ToolLoopAgent({
		model: openai("gpt-4"),
		instructions: `You are a data processing assistant.
    
When processing multiple files:
1. Use glob to find matching files
2. Process them efficiently
3. Generate summary reports
4. Handle errors gracefully`,
		tools: pgfs.tools,
	});

	console.log("=== Batch Operations Agent ===\n");

	const result = await agent.generate({
		prompt: `Find all log files in /data/ and create a summary report at /data/summary.txt that includes:
    - Total number of log files
    - List of all log file names
    - Size statistics`,
	});

	console.log(result.text);
	console.log("\n---\n");

	// Show the summary
	const summary = await pgfs.fs.readFile("/data/summary.txt");
	console.log("Generated summary:");
	console.log(summary);

	await pool.end();
}

/**
 * Helper function to recursively get directory tree
 */
async function getDirectoryTree(
	pgfs: PgFs,
	path: string,
	prefix: string = "",
): Promise<string> {
	let tree = prefix + path + "\n";

	const stats = await pgfs.fs.stat(path);
	if (!stats.isDirectory) {
		return tree;
	}

	const items = await pgfs.fs.readdirStats(path);

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const isLast = i === items.length - 1;
		const connector = isLast ? "└── " : "├── ";
		const newPrefix = prefix + (isLast ? "    " : "│   ");

		tree += prefix + connector + item.name + "\n";

		if (item.isDirectory) {
			const subTree = await getDirectoryTree(pgfs, item.path, newPrefix);
			tree += subTree.split("\n").slice(1).join("\n"); // Remove first line (duplicate)
		}
	}

	return tree;
}

/**
 * Run all examples
 */
async function main() {
	console.log("====================================");
	console.log("PG-FS Advanced Agent Examples");
	console.log("====================================\n");

	try {
		await codeGenerationAgent();
		console.log("\n====================================\n");

		await documentationAgent();
		console.log("\n====================================\n");

		await batchOperationsAgent();
	} catch (error) {
		console.error("Error:", error);
	}
}

main();
