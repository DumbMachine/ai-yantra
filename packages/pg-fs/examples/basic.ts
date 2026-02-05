/**
 * Example: Using pg-fs with AI SDK ToolLoopAgent
 *
 * This example demonstrates how to create a file management agent
 * that can perform filesystem operations using PostgreSQL as storage.
 */

import { Pool } from "pg";
import { PgFs } from "../src";
import { ToolLoopAgent } from "ai";
import { openai } from "@ai-sdk/openai";

async function main() {
	// 1. Setup PostgreSQL connection
	const pool = new Pool({
		connectionString:
			process.env.DATABASE_URL || "postgresql://localhost:5432/pgfs_demo",
	});

	// 2. Create PgFs instance (automatically initializes tables)
	console.log("Initializing pg-fs...");
	const pgfs = await PgFs.create({ pool });
	console.log("✓ pg-fs initialized\n");

	// 3. Create an AI agent with filesystem tools
	const agent = new ToolLoopAgent({
		model: openai("gpt-4"),
		instructions: `You are a helpful file management assistant. You have access to a PostgreSQL-backed filesystem.
    
Your capabilities:
- Create, read, edit, and delete files
- Create and manage directories
- Search files by name (glob) or content (grep)
- Copy and move files
- Get file statistics

Always provide clear feedback about operations and handle errors gracefully.`,
		tools: pgfs.tools,
	});

	// 4. Example interactions
	console.log("=== Example 1: Creating a project structure ===\n");

	let result = await agent.generate({
		prompt: `Create a new project structure:
    - /projects/my-app/
    - /projects/my-app/src/
    - /projects/my-app/README.md with content "# My App\nA sample application"
    - /projects/my-app/src/index.js with content "console.log('Hello World');"`,
	});

	console.log(result.text);
	console.log("\n---\n");

	// 5. Example: Reading and editing files
	console.log("=== Example 2: Reading and editing files ===\n");

	result = await agent.generate({
		prompt:
			'Read the README.md file and add a description section that says "This is a demo project"',
	});

	console.log(result.text);
	console.log("\n---\n");

	// 6. Example: Searching files
	console.log("=== Example 3: Searching files ===\n");

	result = await agent.generate({
		prompt: "Find all JavaScript files in the project and show me their paths",
	});

	console.log(result.text);
	console.log("\n---\n");

	// 7. Example: Complex multi-step operation
	console.log("=== Example 4: Complex operation ===\n");

	result = await agent.generate({
		prompt: `Do the following:
    1. Create a config.json file with {"name": "my-app", "version": "1.0.0"}
    2. Create a docs directory
    3. Create a docs/guide.md file with installation instructions
    4. List all files in the project`,
	});

	console.log(result.text);
	console.log("\n---\n");

	// 8. Direct filesystem API usage (without agent)
	console.log("=== Example 5: Direct API usage ===\n");

	// Create a file directly
	await pgfs.fs.writeFile("/test/direct.txt", "Created without agent", {
		createParents: true,
	});
	console.log("✓ Created /test/direct.txt");

	// Read it back
	const content = await pgfs.fs.readFile("/test/direct.txt");
	console.log(`✓ Content: "${content}"`);

	// Get stats
	const stats = await pgfs.fs.stat("/test/direct.txt");
	console.log(`✓ Size: ${stats.size} bytes, Modified: ${stats.modifiedAt}`);

	// List directory
	const files = await pgfs.fs.readdir("/projects/my-app");
	console.log(`✓ Files in /projects/my-app: ${files.join(", ")}`);

	console.log("\n---\n");

	// 9. Content deduplication demo
	console.log("=== Example 6: Content deduplication ===\n");

	// Create multiple files with same content
	await pgfs.fs.writeFile("/file1.txt", "Duplicate content");
	await pgfs.fs.writeFile("/file2.txt", "Duplicate content");
	await pgfs.fs.writeFile("/file3.txt", "Duplicate content");

	console.log("✓ Created 3 files with identical content");

	// Check content blocks (should only be 1 unique block)
	const contentBlocks = await pgfs.db.query.contentBlocks.findMany();
	const duplicateBlock = contentBlocks.find(
		(b) => b.data === "Duplicate content",
	);

	if (duplicateBlock) {
		console.log(
			`✓ Content stored once, referenced ${duplicateBlock.refCount} times`,
		);
		console.log(`✓ Storage savings: ${duplicateBlock.size * 2} bytes`);
	}

	console.log("\n---\n");

	// 10. Cleanup and garbage collection
	console.log("=== Example 7: Garbage collection ===\n");

	// Delete files
	await pgfs.fs.unlink("/file1.txt");
	await pgfs.fs.unlink("/file2.txt");
	console.log("✓ Deleted 2 of 3 duplicate files");

	// Run garbage collection (doesn't delete because refCount still > 0)
	let collected = await pgfs.garbageCollect();
	console.log(
		`✓ Garbage collected: ${collected} blocks (content still referenced)`,
	);

	// Delete last file
	await pgfs.fs.unlink("/file3.txt");
	console.log("✓ Deleted last duplicate file");

	// Run garbage collection again (now deletes unused content)
	collected = await pgfs.garbageCollect();
	console.log(
		`✓ Garbage collected: ${collected} blocks (content no longer referenced)`,
	);

	console.log("\n---\n");

	// 11. Search examples
	console.log("=== Example 8: Advanced search ===\n");

	// Glob search
	const jsFiles = await pgfs.fs.glob("*.js", "/projects");
	console.log(`✓ Found ${jsFiles.length} JavaScript files:`, jsFiles);

	// Content search
	const searchResults = await pgfs.fs.search("Hello", "/projects");
	console.log(`✓ Files containing "Hello": ${searchResults.length}`);
	searchResults.forEach((r) =>
		console.log(`  - ${r.path} (score: ${r.score})`),
	);

	console.log("\n---\n");

	// Cleanup
	await pool.end();
	console.log("✓ Connection closed");
}

// Run the example
main().catch(console.error);
