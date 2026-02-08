# AGENTS.md

This file provides context for AI coding assistants working with the CIPHER repository.

## Project Overview

**CIPHER** is a minimalist collection of extensions for the AI SDK. We don't just build tools—we craft the invisible threads that connect intelligence to action.

- **Repository**: https://github.com/dumbmachine/ai-sdk-clothes
- **Inspiration**: Anthropic's advanced tool use engineering (https://www.anthropic.com/engineering/advanced-tool-use)
- **License**: MIT (assumed)

## Repository Structure

This is a **monorepo** using pnpm workspaces.

### Key Directories

| Directory               | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `packages/tool-search`  | Tool Search utility package                      |
| `packages/ptc`          | Programmable Tool Calling (live)                 |
| `packages/pg-fs`        | PostgreSQL-backed filesystem with AI SDK tools   |
| `packages/access`       | Approval workflows & security (coming soon)      |
| `packages/cache`        | Intelligent result persistence (coming soon)     |
| `packages/async`        | Parallel sub-agent orchestration (coming soon)   |
| `apps/tool-search-demo` | Demo application for Tool Search                 |
| `apps/ptc-demo`         | Demo application for PTC                         |

## Development Setup

### Requirements

- **Node.js**: v18 or higher
- **pnpm**: v8+ (`npm install -g pnpm`)

### Initial Setup

```bash
pnpm install        # Install all dependencies
pnpm build          # Build all packages
```

## Development Commands

### Root-Level Commands

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `pnpm install`     | Install dependencies           |
| `pnpm build`       | Build all packages             |
| `pnpm lint`        | Run linting across workspace   |

### Package-Level Commands

Run these from within a package directory (e.g., `packages/pg-fs`):

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `pnpm build`         | Build the package (TypeScript compilation)       |
| `pnpm test`          | Run all tests                                     |
| `pnpm test:watch`    | Run tests in watch mode                          |
| `pnpm test:ui`       | Run tests with UI interface (Vitest)             |
| `pnpm lint`          | Type-check with TypeScript (noEmit mode)         |
| `pnpm test -- <pattern>` | Run single test file (e.g., `pnpm test -- utils.test.ts`) |
| `pnpm test --run --reporter=verbose <pattern>` | Run specific test with verbose output |

### Database Commands (pg-fs package)

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `pnpm db:generate`   | Generate database migrations                     |
| `pnpm db:push`       | Push schema changes to database                  |
| `pnpm db:studio`     | Open Drizzle Studio for database management      |

## Coding Standards

### TypeScript Configuration

- **Target**: ES2022 modules with NodeNext module resolution
- **Strict Mode**: Enabled for all packages
- **Declaration Files**: Generated with source maps
- **Imports**: Use named imports, relative paths for local modules
- **File Extensions**: Use `.js` extensions in imports for ESM compatibility

### Code Style Guidelines

#### Imports and Exports
```typescript
// ✅ Good: Named imports, relative paths
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import { PgFileSystem } from "./db-fs.js";

// ❌ Bad: Default imports, absolute paths
import pg from "pg";
import drizzle from "drizzle-orm/node-postgres";
import * as schema from "../../schema.js";
```

#### Naming Conventions
- **Variables/Functions**: camelCase (`normalizePath`, `createFileSystemTools`)
- **Types/Interfaces/Classes**: PascalCase (`PgFsConfig`, `FileSystemUtils`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Private Members**: Prefix with underscore (`_internalMethod`)

#### Error Handling
```typescript
// ✅ Good: Specific error types, descriptive messages
try {
  await fsOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    throw new PgFsError(`Invalid path format: ${error.message}`);
  }
  throw new PgFsError(`Filesystem operation failed: ${error.message}`);
}

// ❌ Bad: Generic error handling
try {
  await fsOperation();
} catch (error) {
  throw new Error("Something went wrong");
}
```

#### Type Safety
- Use `strict: true` TypeScript configuration
- Leverage Zod for runtime validation of external inputs
- Prefer union types over `any`
- Use branded types for domain-specific strings

```typescript
// ✅ Good: Branded types and validation
import { z } from "zod";

const PathSchema = z.string().refine(path => path.startsWith("/"), "Path must be absolute");
type Path = z.infer<typeof PathSchema> & { readonly __brand: "Path" };

function createPath(input: string): Path {
  return PathSchema.parse(input) as Path;
}
```

#### Documentation
- Use JSDoc comments for public APIs
- Include `@example` blocks for complex usage
- Document parameters, return types, and thrown errors
- Keep comments concise but descriptive

### Testing Standards

#### Test Structure
- **Framework**: Vitest with globals enabled
- **File Pattern**: `*.test.ts` or `*.spec.ts`
- **Location**: `tests/unit/`, `tests/integration/`
- **Setup**: Global test setup in `tests/setup.ts`
- **Coverage**: V8 provider with HTML/text/JSON reports

#### Test Organization
```typescript
import { describe, it, expect } from "vitest";

describe("FileSystemUtils", () => {
  describe("normalizePath", () => {
    it("should normalize simple paths", () => {
      expect(FileSystemUtils.normalizePath("/home/user/file.txt"))
        .toBe("/home/user/file.txt");
    });

    it("should handle trailing slashes", () => {
      expect(FileSystemUtils.normalizePath("/home/user/"))
        .toBe("/home/user");
    });
  });
});
```

#### Testing Best Practices
- **Isolation**: Each test should be independent
- **Naming**: Descriptive test names explaining the behavior
- **Assertions**: Use specific matchers (`toBe`, `toMatch`, `toHaveLength`)
- **Coverage**: Aim for high coverage on critical paths
- **Mocks**: Use Vitest's mocking utilities for external dependencies

### Architecture

### Package Structure

Each extension follows a consistent structure:

```
packages/<extension>/
├── src/
│   ├── index.ts          # Main exports
│   ├── <feature>.ts      # Core implementation
│   ├── types.d.ts        # Type definitions (if separate)
│   └── __tests__/        # Tests (alternative location)
├── tests/                # Test directory
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── setup.ts          # Test setup
├── examples/             # Usage examples
├── package.json
├── tsconfig.json
├── vitest.config.ts      # Test configuration
└── README.md
```

### Integration with AI SDK

Extensions are designed to seamlessly integrate with the Vercel AI SDK:

- Use `ai` package for core functionality
- Export utilities that enhance `generateText`, `streamText`, etc.
- Follow AI SDK patterns for tool definitions and schemas
- Provide both programmatic APIs and tool integrations

### Dependencies

- **Core**: `ai` (AI SDK), `zod` (validation)
- **Tool Search**: `wink-bm25-text-search` (search algorithm)
- **Database**: `drizzle-orm`, `pg` (PostgreSQL integration)
- **Testing**: `vitest`, `@vitest/coverage-v8`
- **Development**: `typescript`, `eslint`

## Contributing

### Adding New Extensions

1. Create `packages/<name>/` directory following the package structure
2. Implement core functionality in `src/` with comprehensive tests
3. Add TypeScript configuration and build scripts
4. Update root `package.json` scripts if needed
5. Add to README.md and AGENTS.md documentation

### Philosophy

- **Minimalist**: Less is more. Focus on essential functionality.
- **Efficient**: Maximum performance, no bloat.
- **Integrated**: Seamless AI SDK compatibility.
- **Scalable**: Designed for enterprise use.
- **Type-Safe**: Strict TypeScript with runtime validation.

## Do Not

- Add unnecessary dependencies
- Break AI SDK integration patterns
- Skip testing for new features
- Commit without linting (`pnpm lint`)
- Use `any` type without justification
- Import external libraries without checking existing usage
- Add features outside the planned extensions without discussion