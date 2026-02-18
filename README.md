# Yantra

**Yantra** is a collection of `@ai-yantra/` scoped packages for building intelligent AI agents with the Vercel AI SDK.

![Yantra Demo](https://github.com/DumbMachine/pg-fs/blob/main/static/demo.gif?raw=true)



### Why Yantra?

AI Agents are great at using the file system to organize and interact with information. In a project, at https://www.krucible.app/, we needed a way to manage files without having to create a sandbox ( $$$ ) for user thread. So we created the abstraction over fs, that connects to postgres databases as the data store. An abstraction that:
- is not a per-thread sandbox
- durable state
- inspectable and debuggable

## Project Structure

```
packages/
├── pg-fs/             # @ai-yantra/pg-fs — PostgreSQL-backed filesystem ( published on npm )
├── memory/            # @ai-yantra/memory — AI SDK Memory Tools backed by SQLite via pg-fs
├── skills/            # @ai-yantra/skills — Skill discovery + loading for AI SDK agents (file-based or virtual)
├── tool-search/       # @ai-yantra/tool-search — Give your agent 100 tools without bloating its context. Tools are lazy-loaded — the agent discovers them as needed
└── ptc/               # @ai-yantra/ptc — Programmable Tool Calling. Instead of one tool call per round-trip, the LLM writes JS that calls multiple tools in one shot

apps/
└── demo/              # @ai-yantra/demo — Demo application
```

## Features

- PostgreSQL-backed filesystem with full operations (read, write, mkdir, unlink, rename, copy, glob, grep)
- Content-addressable storage with deduplication
- Hierarchical paths with efficient tree operations
- AI SDK tools out of the box
- Type-safe implementation with Drizzle ORM
- Comprehensive filesystem API and garbage collection


## Quick Start

Install it from npm
```bash
pnpm install @ai-yantra/pg-fs
```


### Try @ai-yantra/pg-fs
```typescript
import { Pool } from 'pg';
import { PgFs } from '@ai-yantra/pg-fs';
import { ToolLoopAgent } from 'ai';
import { openai } from '@ai-sdk/openai';

const pool = new Pool({
  connectionString: 'postgresql://localhost:5432/mydb',
});

// Initialize pg-fs (creates tables automatically)
const pgfs = await PgFs.create({ pool });

// Use with AI agents
const agent = new ToolLoopAgent({
  model: openai('gpt-4'),
  instructions: 'You are a helpful file management assistant.',
  tools: pgfs.tools, // Pre-built filesystem tools
});

const result = await agent.generate({
  prompt: 'Create a project structure for a Node.js app with src/, tests/, and README.md',
});

console.log(result.text);
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

