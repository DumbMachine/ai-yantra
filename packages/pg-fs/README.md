# @ai-yantra/pg-fs

Database-backed filesystem with AI SDK tools for building file management agents. Supports both **PostgreSQL** and **SQLite** as storage backends.

## Install

```bash
# Core package
npm install @ai-yantra/pg-fs drizzle-orm

# For PostgreSQL backend
npm install pg

# For SQLite backend
npm install better-sqlite3
```

## Quick Start

### SQLite (zero-config)

```typescript
import { createSqliteFs } from '@ai-yantra/pg-fs';

// In-memory — great for testing and ephemeral agents
const dbfs = await createSqliteFs();

// File-based — persistent across restarts
const dbfs = await createSqliteFs('./mydb.sqlite');

await dbfs.fs.writeFile('/hello.txt', 'Hello, World!');
const content = await dbfs.fs.readFile('/hello.txt');
```

### PostgreSQL

```typescript
import { Pool } from 'pg';
import { DbFs } from '@ai-yantra/pg-fs';

const pool = new Pool({
  connectionString: 'postgresql://localhost:5432/mydb',
});

const dbfs = await DbFs.create({ dialect: 'postgresql', pool });

await dbfs.fs.writeFile('/hello.txt', 'Hello, World!');
const content = await dbfs.fs.readFile('/hello.txt');
```

### Full config

```typescript
const dbfs = await DbFs.create({
  dialect: 'sqlite',        // or 'postgresql'
  filename: './mydb.sqlite', // SQLite only (default: ':memory:')
  pool: pgPool,              // PostgreSQL only
  autoInitialize: true,      // create tables on startup (default: true)
});
```

## Filesystem API

### Files

```typescript
await dbfs.fs.writeFile(path, content, { mimeType, createParents })
await dbfs.fs.readFile(path)
await dbfs.fs.exists(path)
await dbfs.fs.stat(path)        // { size, modifiedAt, isDirectory }
await dbfs.fs.unlink(path)
```

### Directories

```typescript
await dbfs.fs.mkdir(path, { recursive: true })
await dbfs.fs.readdir(path)
await dbfs.fs.readdirStats(path)
await dbfs.fs.unlink(path, { recursive: true })
```

### Move, Copy, Search

```typescript
await dbfs.fs.rename(oldPath, newPath)
await dbfs.fs.copy(src, dest, { recursive: true })
await dbfs.fs.glob('**/*.ts', '/src')
await dbfs.fs.search('TODO', '/')   // full-text search
```

## AI SDK Tools

`dbfs.tools` gives your agent these tools out of the box:

`read` `write` `edit` `ls` `mkdir` `unlink` `rename` `copy` `stat` `exists` `glob` `grep`

```typescript
import { openai } from '@ai-sdk/openai';
import { createSqliteFs } from '@ai-yantra/pg-fs';

const dbfs = await createSqliteFs('./agent.sqlite');

const agent = new ToolLoopAgent({
  model: openai('gpt-4'),
  instructions: 'You are a file management assistant.',
  tools: dbfs.tools,
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

const recentFiles = await dbfs.db.query.nodes.findMany({
  where: sql`modified_at > NOW() - INTERVAL '1 hour'`,
});
```
