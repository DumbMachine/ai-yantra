# Yantra

**Yantra** is a collection of `@ai-yantra/` scoped packages for building intelligent AI agents with the Vercel AI SDK.

![Yantra Demo](https://github.com/DumbMachine/pg-fs/blob/main/static/demo.gif?raw=true)



### Why Yantra?

AI Agents are great at using the file system to organize and interact with information. In a project, at https://www.krucible.app/, we needed a way to manage files without having to create a sandbox ( $$$ ) for user thread. So we created the abstraction over fs, that connects to databases as the data store. An abstraction that:
- is not a per-thread sandbox
- durable state
- inspectable and debuggable
- works with both **PostgreSQL** and **SQLite**

## Project Structure

```
packages/
├── pg-fs/             # @ai-yantra/pg-fs — Database-backed filesystem with PostgreSQL and SQLite support ( published on npm )
├── memory/            # @ai-yantra/memory — Persistent memory tools for AI agents, backed by SQLite via pg-fs
├── skills/            # @ai-yantra/skills — Skill discovery + loading for AI SDK agents (file-based or virtual)
├── tool-search/       # @ai-yantra/tool-search — Give your agent 100 tools without bloating its context. Tools are lazy-loaded — the agent discovers them as needed
└── ptc/               # @ai-yantra/ptc — Programmable Tool Calling. Instead of one tool call per round-trip, the LLM writes JS that calls multiple tools in one shot

apps/
└── demo/              # @ai-yantra/demo — Demo application
```

## How It Works

### @ai-yantra/pg-fs

A virtual filesystem stored in a database instead of disk. Files and directories are rows in a `nodes` table, while file contents live in a separate `content_blocks` table keyed by SHA-256 hash — giving you content-addressable storage with automatic deduplication. Supports both PostgreSQL (for production/shared state) and SQLite (for lightweight/embedded use) through a unified driver interface built on Drizzle ORM. Ships with pre-built AI SDK tools so agents can read, write, edit, and search files out of the box.

### @ai-yantra/memory

A persistent memory layer for AI agents built on top of pg-fs. It uses a SQLite-backed filesystem scoped to a `/memories` directory, giving agents a place to store notes, progress, and context that survives across conversations. Exposes tools like `memory_view`, `memory_create`, `memory_str_replace`, and `memory_insert` — designed for agents to read and update their own memory files naturally. Comes with a system prompt that teaches agents how to use it.

## Features

- Database-backed filesystem with full operations (read, write, mkdir, unlink, rename, copy, glob, grep)
- **PostgreSQL** and **SQLite** backends via a unified API
- Content-addressable storage with deduplication
- Hierarchical paths with efficient tree operations
- AI SDK tools out of the box
- Type-safe implementation with Drizzle ORM
- Persistent agent memory with scoped file management

## Quick Start

### @ai-yantra/pg-fs

```bash
pnpm install @ai-yantra/pg-fs drizzle-orm better-sqlite3
```

```typescript
import { createSqliteFs } from '@ai-yantra/pg-fs';
import { openai } from '@ai-sdk/openai';

// SQLite — zero config, great for getting started
const dbfs = await createSqliteFs('./agent.sqlite');

// Use with AI agents
const agent = new ToolLoopAgent({
  model: openai('gpt-4'),
  instructions: 'You are a helpful file management assistant.',
  tools: dbfs.tools,
});

const result = await agent.generate({
  prompt: 'Create a project structure for a Node.js app with src/, tests/, and README.md',
});

console.log(result.text);
```

For PostgreSQL, swap the setup:

```typescript
import { Pool } from 'pg';
import { DbFs } from '@ai-yantra/pg-fs';

const pool = new Pool({ connectionString: 'postgresql://localhost:5432/mydb' });
const dbfs = await DbFs.create({ dialect: 'postgresql', pool });
```

### @ai-yantra/memory

```bash
pnpm install @ai-yantra/memory
```

```typescript
import { createMemory } from '@ai-yantra/memory';

const { tools, systemPrompt } = await createMemory({
  filename: './agent-memory.sqlite', // omit for in-memory
});

const agent = new ToolLoopAgent({
  model: openai('gpt-4'),
  instructions: systemPrompt,
  tools,
});
```


## Development

### Install Dependencies
```bash
pnpm install
pnpm build
```

Try the demo app:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/pg_fs pnpm dev
```

Make sure you are running [copilot api](https://github.com/ericc-ch/copilot-api), if you use the copilot model provider. Else Anthropic and Openai is also supported.
```
npx copilot-api@latest start --claude-code
```

