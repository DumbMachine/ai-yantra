# @ai-yantra/pg-fs

PostgreSQL-backed filesystem with AI SDK tools for building file management agents.

## Install

```bash
npm install @ai-yantra/pg-fs pg drizzle-orm
```

## Quick Start

```typescript
import { Pool } from 'pg';
import { PgFs } from '@ai-yantra/pg-fs';

const pool = new Pool({
  connectionString: 'postgresql://localhost:5432/mydb',
});

const pgfs = await PgFs.create({ pool }); // creates tables automatically

await pgfs.fs.writeFile('/hello.txt', 'Hello, World!');
const content = await pgfs.fs.readFile('/hello.txt');
```

## Filesystem API

### Files

```typescript
await pgfs.fs.writeFile(path, content, { mimeType, createParents })
await pgfs.fs.readFile(path)
await pgfs.fs.exists(path)
await pgfs.fs.stat(path)        // { size, modifiedAt, isDirectory }
await pgfs.fs.unlink(path)
```

### Directories

```typescript
await pgfs.fs.mkdir(path, { recursive: true })
await pgfs.fs.readdir(path)
await pgfs.fs.readdirStats(path)
await pgfs.fs.unlink(path, { recursive: true })
```

### Move, Copy, Search

```typescript
await pgfs.fs.rename(oldPath, newPath)
await pgfs.fs.copy(src, dest, { recursive: true })
await pgfs.fs.glob('**/*.ts', '/src')
await pgfs.fs.search('TODO', '/')   // full-text search
```

## AI SDK Tools

`pgfs.tools` gives your agent these tools out of the box:

`read` `write` `edit` `ls` `mkdir` `unlink` `rename` `copy` `stat` `exists` `glob` `grep`

```typescript
import { openai } from '@ai-sdk/openai';

const pgfs = await PgFs.create({ pool });

const agent = new ToolLoopAgent({
  model: openai('gpt-4'),
  instructions: 'You are a file management assistant.',
  tools: pgfs.tools,
});

await agent.generate({
  prompt: 'Create a project structure for a Node.js app',
});
```

## Direct Database Access

The underlying Drizzle instance is exposed for custom queries:

```typescript
import { sql } from 'drizzle-orm';
import { nodes } from '@ai-yantra/pg-fs';

const recentFiles = await pgfs.db.query.nodes.findMany({
  where: sql`modified_at > NOW() - INTERVAL '1 hour'`,
});
```
