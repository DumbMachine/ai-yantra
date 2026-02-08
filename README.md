# pg-fs 

**pg-fs** is a PostgreSQL-backed filesystem with AI SDK tools for building intelligent file management agents.

A complete filesystem implementation using PostgreSQL as storage backend, providing full filesystem operations, content-addressable storage with automatic deduplication, hierarchical paths, full-text search, and seamless AI SDK integration.

![pg-fs Demo](https://github.com/DumbMachine/pg-fs/blob/main/static/demo.gif?raw=true)



### Why PostgreSQL as a Filesystem?

AI Agents are great at using the file system to organize and interact with information. In a project, at https://www.krucible.app/, we needed a way to manage files without having to create a sandbox ( $$$ ) for user thread. So we created the abstraction over fs, that get's connected to a seperate database as the data store. An abstraction that:
- is not a per-thread sandbox
- durable state
- inspectable and debuggable

## Project Structure
`pg-fs` is our first tool, with others on the way. 
```
packages/
├── pg-fs/             # PostgreSQL-backed filesystem ✅
├── tool-search/       # Anthropic style `tool-search` tool, so you can over your agents with tools without impacting it's context
├── ptc/               # Approval workflows & security (planned)
└── task/              # Task ( read / write ), with serialization primitives, so your agents can make plans like claude code

apps/
└── pg-fs-demo/         
```

## Features

- PostgreSQL-backed filesystem with full operations (read, write, mkdir, unlink, rename, copy, glob, grep)
- Content-addressable storage with deduplication
- Hierarchical paths with efficient tree operations
- AI SDK tools out of the box
- Type-safe implementation with Drizzle ORM
- Comprehensive filesystem API and garbage collection


## pg-fs Updates Planned
- `rm` command instead of unlink. Since most llms instinctively try `rm` first ( empirical )
- `~/.skills` folder, so you can use skills in ai sdk.
- `~/.memory` folder, to handle session memory. Inspo: from [anthropic's memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
- Postgres RLS, to manage permissions / controls on files. 
- Remove unused files ( system prompt and "@clack/prompts" and openai compatible provider )
- sqlite backend, instead of postgres

## Quick Start

Install it from npm
```bash
pnpm install pg-fs
```


### Try pg-fs
```typescript
import { Pool } from 'pg';
import { PgFs } from 'pg-fs';
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

