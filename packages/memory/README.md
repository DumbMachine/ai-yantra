# @ai-yantra/memory

Persistent memory for AI agents. Give your agent a `/memories` directory it can read, write, and update across conversations — so it remembers context, tracks progress, and picks up where it left off.

Inspired by the [Anthropic memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool), which lets Claude store and retrieve information across conversations through a client-side memory directory. This package implements the same idea as a self-contained library: a SQLite-backed filesystem (via `@ai-yantra/pg-fs`) scoped to `/memories`, with pre-built AI SDK tools and a system prompt that teaches agents to use it. All memory operations are path-validated to stay within the `/memories` boundary.

## Install

```bash
npm install @ai-yantra/memory better-sqlite3
```

## Quick Start

```typescript
import { createMemory } from '@ai-yantra/memory';
import { openai } from '@ai-sdk/openai';

const { tools, systemPrompt } = await createMemory({
  filename: './agent-memory.sqlite', // omit for in-memory
});

const agent = new ToolLoopAgent({
  model: openai('gpt-4'),
  instructions: systemPrompt,
  tools,
});

await agent.generate({
  prompt: 'Summarize our last conversation and save your notes',
});
```

## Tools

The agent gets these tools automatically:

| Tool | Description |
|---|---|
| `memory_view` | View `/memories` directory listing or read a file with line numbers |
| `memory_create` | Create a new memory file |
| `memory_str_replace` | Replace an exact string in a memory file (must be unique) |
| `memory_insert` | Insert text at a specific line number |
| `memory_delete` | Delete a file or directory (recursive) |
| `memory_rename` | Rename or move a file within `/memories` |

## API

```typescript
import { createMemory, Memory } from '@ai-yantra/memory';

// High-level: returns tools + system prompt, ready to plug into an agent
const { memory, tools, systemPrompt, dbFs } = await createMemory({
  filename: './memory.sqlite',
});

// Low-level: use the Memory class directly
const { memory } = await Memory.create({ filename: './memory.sqlite' });

await memory.createFile('/memories/notes.md', '# Session 1\nStarted refactor.');
await memory.view('/memories');
await memory.strReplace('/memories/notes.md', 'Started refactor.', 'Refactor complete.');
await memory.insert('/memories/notes.md', 2, 'Added tests.\n');
await memory.rename('/memories/notes.md', '/memories/archive/session-1.md');
await memory.delete('/memories/archive');
```
