# pg-fs

A PostgreSQL-backed filesystem with AI SDK tools for building intelligent file management agents.

## Overview

`pg-fs` implements a complete filesystem using PostgreSQL as the storage backend, providing:

- **Full filesystem operations**: read, write, mkdir, unlink, rename, copy, glob, grep
- **Content-addressable storage**: automatic deduplication of identical content
- **Hierarchical paths**: efficient tree operations using PostgreSQL features
- **Full-text search**: search file contents with PostgreSQL's search capabilities
- **AI SDK Integration**: Pre-built tools for use with AI agents via the AI SDK
- **Type-safe**: Full TypeScript support with Drizzle ORM

## Why PostgreSQL as a Filesystem?

Traditional filesystems are great, but PostgreSQL offers unique advantages:

1. **ACID Transactions**: File operations are atomic and consistent
2. **Content Deduplication**: Identical files share storage (content-addressable)
3. **Powerful Queries**: Search files by content, metadata, or patterns
4. **Concurrent Access**: Built-in locking and transaction management
5. **Network Access**: Remote filesystem access over database connection
6. **Version Control**: Easy to add file versioning
7. **Full-Text Search**: Native PostgreSQL text search capabilities
8. **Hierarchical Queries**: Efficient tree operations with proper indexing

## Installation

```bash
npm install pg-fs pg drizzle-orm
```

## Quick Start

```typescript
import { Pool } from 'pg';
import { PgFs } from 'pg-fs';

const pool = new Pool({
  connectionString: 'postgresql://localhost:5432/mydb',
});

// Initialize pg-fs (creates tables automatically)
const pgfs = await PgFs.create({ pool });

// Use the filesystem API
await pgfs.fs.writeFile('/hello.txt', 'Hello, World!');
const content = await pgfs.fs.readFile('/hello.txt');
console.log(content); // "Hello, World!"
```

## Using with AI Agents

`pg-fs` provides pre-built AI SDK tools for use with agents:

```typescript
import { ToolLoopAgent } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PgFs } from 'pg-fs';

const pgfs = await PgFs.create({ pool });

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

## Database Schema

The system uses an optimized PostgreSQL schema:

### Nodes Table
Stores filesystem metadata (inodes):
- `id`: Unique node identifier
- `path`: Full absolute path
- `name`: Filename only
- `tree_path`: Hierarchical path for tree queries
- `parent_id`: Parent directory reference
- `is_directory`: Node type flag
- `size`: File size in bytes
- `mime_type`: Content type
- `content_hash`: Reference to content block (SHA-256)
- Timestamps: `created_at`, `modified_at`, `accessed_at`
- Permissions: `mode`, `owner`
- `metadata`: JSONB for extended attributes

### Content Blocks Table
Stores actual file data with deduplication:
- `hash`: SHA-256 content hash (primary key)
- `data`: File content
- `size`: Content size
- `ref_count`: Number of files referencing this content
- Timestamps for garbage collection

### Search Index Table
Full-text search capabilities:
- `node_id`: Reference to node
- `search_vector`: PostgreSQL tsvector for text search
- `text_content`: Extracted text content

### Design Rationale

1. **Content-Addressable Storage**: Files with identical content share the same storage block, referenced by SHA-256 hash. This provides automatic deduplication.

2. **Reference Counting**: Content blocks track how many files reference them. When ref_count reaches 0, the block can be garbage collected.

3. **Hierarchical Paths**: The `tree_path` field enables efficient ancestor/descendant queries using PostgreSQL's indexing capabilities.

4. **Separate Metadata and Content**: Inodes (metadata) and content blocks are separate, allowing efficient metadata queries without loading content.

5. **Indexes**: Strategic indexes on path, parent_id, tree_path, name, and modified_at for common query patterns.

## Filesystem API

### File Operations

```typescript
// Write file
await pgfs.fs.writeFile('/path/to/file.txt', 'content', {
  mimeType: 'text/plain',
  createParents: true, // Create parent directories
});

// Read file
const content = await pgfs.fs.readFile('/path/to/file.txt');

// Check if exists
const exists = await pgfs.fs.exists('/path/to/file.txt');

// Get file stats
const stats = await pgfs.fs.stat('/path/to/file.txt');
console.log(stats.size, stats.modifiedAt, stats.isDirectory);

// Delete file
await pgfs.fs.unlink('/path/to/file.txt');
```

### Directory Operations

```typescript
// Create directory
await pgfs.fs.mkdir('/path/to/dir', { recursive: true });

// List directory
const files = await pgfs.fs.readdir('/path/to/dir');

// List with stats
const stats = await pgfs.fs.readdirStats('/path/to/dir');

// Delete directory
await pgfs.fs.unlink('/path/to/dir', { recursive: true });
```

### File Management

```typescript
// Rename/move
await pgfs.fs.rename('/old/path.txt', '/new/path.txt');

// Copy file
await pgfs.fs.copy('/source.txt', '/dest.txt');

// Copy directory recursively
await pgfs.fs.copy('/source-dir', '/dest-dir', { recursive: true });
```

### Search Operations

```typescript
// Glob search (by filename pattern)
const jsFiles = await pgfs.fs.glob('*.js', '/src');
const allTsFiles = await pgfs.fs.glob('**/*.ts', '/'); // Recursive

// Content search (grep)
const results = await pgfs.fs.search('TODO', '/');
// Returns: [{ path: '/file.txt', score: 1.0 }, ...]
```

## AI SDK Tools

The following tools are available for AI agents:

### Available Tools

1. **read** - Read file contents
2. **write** - Write/create files
3. **edit** - Edit files using string replacement
4. **ls** - List directory contents
5. **mkdir** - Create directories
6. **unlink** - Delete files/directories
7. **rename** - Move/rename files
8. **copy** - Copy files/directories
9. **stat** - Get file/directory information
10. **exists** - Check if path exists
11. **glob** - Search files by pattern
12. **grep** - Search file contents

### Tool Usage Example

```typescript
const agent = new ToolLoopAgent({
  model: openai('gpt-4'),
  instructions: 'You are a file manager',
  tools: pgfs.tools,
});

// Agent can now use natural language:
await agent.generate({
  prompt: 'Create a file called notes.txt with my shopping list',
});

await agent.generate({
  prompt: 'Find all JavaScript files and create a list in files.txt',
});

await agent.generate({
  prompt: 'Search for TODO comments in the codebase',
});
```

## Advanced Features

### Content Deduplication

Files with identical content automatically share storage:

```typescript
// These three files share the same content block
await pgfs.fs.writeFile('/file1.txt', 'Same content');
await pgfs.fs.writeFile('/file2.txt', 'Same content');
await pgfs.fs.writeFile('/file3.txt', 'Same content');

// Only one copy of "Same content" is stored in the database
// The content block has refCount = 3
```

### Garbage Collection

Remove unreferenced content blocks:

```typescript
// Delete files
await pgfs.fs.unlink('/file1.txt');
await pgfs.fs.unlink('/file2.txt');
await pgfs.fs.unlink('/file3.txt');

// Clean up unused content blocks
const deletedBlocks = await pgfs.garbageCollect();
console.log(`Freed ${deletedBlocks} content blocks`);
```

### Full-Text Search

Search file contents efficiently:

```typescript
// Search for text in all files
const results = await pgfs.fs.search('important', '/documents');

for (const result of results) {
  console.log(`${result.path} (score: ${result.score})`);
}
```

### Direct Database Access

Access the underlying database for custom queries:

```typescript
import { eq } from 'drizzle-orm';
import { nodes } from 'pg-fs';

// Find all files modified in the last hour
const recentFiles = await pgfs.db.query.nodes.findMany({
  where: sql`modified_at > NOW() - INTERVAL '1 hour'`,
});

// Custom queries with Drizzle
const largeFiles = await pgfs.db
  .select()
  .from(nodes)
  .where(sql`size > 1000000`); // Files > 1MB
```

## Examples

See the `examples/` directory for comprehensive examples:

- **basic-usage.ts** - Getting started with pg-fs and agents
- **streaming-agent.ts** - Real-time streaming operations
- **advanced-workflows.ts** - Code generation, documentation, batch operations

## Performance Considerations

1. **Indexes**: The schema includes strategic indexes for common operations
2. **Content Deduplication**: Saves storage space for duplicate content
3. **Reference Counting**: Efficient garbage collection
4. **Batch Operations**: Use transactions for multiple operations
5. **Connection Pooling**: Use pg.Pool for optimal performance

## Schema Migrations

Generate and run migrations using Drizzle Kit:

```bash
# Generate migration
npx drizzle-kit generate

# Run migration
npx drizzle-kit push
```

## API Reference

### PgFs Class

Main class for pg-fs filesystem:

```typescript
class PgFs {
  static async create(config: PgFsConfig): Promise<PgFs>
  static createSync(pool: Pool): PgFs
  
  readonly db: Database
  readonly fs: PgFileSystem
  readonly tools: FileSystemTools
  
  async initialize(): Promise<void>
  async garbageCollect(): Promise<number>
}
```

### PgFileSystem Class

Core filesystem operations:

```typescript
class PgFileSystem {
  async writeFile(path: string, content: string, options?: WriteOptions): Promise<void>
  async readFile(path: string, options?: ReadOptions): Promise<string>
  async mkdir(path: string, options?: MkdirOptions): Promise<void>
  async readdir(path: string, options?: ListOptions): Promise<string[]>
  async readdirStats(path: string, options?: ListOptions): Promise<FileStats[]>
  async stat(path: string): Promise<FileStats>
  async exists(path: string): Promise<boolean>
  async unlink(path: string, options?: UnlinkOptions): Promise<void>
  async rename(oldPath: string, newPath: string): Promise<void>
  async copy(sourcePath: string, destPath: string, options?: CopyOptions): Promise<void>
  async glob(pattern: string, basePath?: string): Promise<string[]>
  async search(query: string, basePath?: string): Promise<SearchResult[]>
}
```
