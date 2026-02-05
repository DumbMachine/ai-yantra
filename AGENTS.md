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
| `apps/tool-search-demo` | Demo application for Tool Search                 |
| `packages/ptc`          | Programmable Tool Calling (coming soon)          |
| `packages/access`       | Approval workflows & security (coming soon)      |
| `packages/cache`        | Intelligent result persistence (coming soon)     |
| `packages/async`        | Parallel sub-agent orchestration (coming soon)   |

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

Run these from within a package directory (e.g., `packages/tool-search`):

| Command       | Description             |
| ------------- | ----------------------- |
| `pnpm build`  | Build the package       |
| `pnpm test`   | Run tests (if available) |
| `pnpm lint`   | Lint the package        |

## Core Concepts

### Tool Search (001)

A dynamic discovery system that finds and deploys tools through intelligent pattern matching. Inspired by Anthropic's advanced tool use engineering.

- **Purpose**: Maximum efficiency, pure function, no excess
- **Technology**: BM25 text search (wink-bm25-text-search)
- **Integration**: Extends AI SDK tool calling capabilities

### Upcoming Extensions

- **PTC**: Programmable Tool Calling  
- **ACCESS**: Approval workflows & security  
- **CACHE**: Intelligent result persistence  
- **ASYNC**: Parallel sub-agent orchestration  

## Coding Standards

### Formatting

- **Tool**: ESLint (configured in workspace)
- **Settings**: Standard TypeScript conventions
- **Run**: `pnpm lint` before committing

### Testing

- **Framework**: Vitest (where applicable)
- **Test files**: `*.test.ts` alongside source files
- **Coverage**: Aim for high coverage on critical paths

### TypeScript

- **Target**: ES2022 modules
- **Imports**: Use named imports, relative paths for local modules
- **Types**: Leverage Zod for runtime validation
- **Naming**: camelCase for variables/functions, PascalCase for types/classes

## Architecture

### Package Structure

Each extension follows a consistent structure:

```
packages/<extension>/
├── src/
│   ├── index.ts          # Main exports
│   ├── <feature>.ts      # Core implementation
│   ├── types.d.ts        # Type definitions
│   └── __tests__/        # Tests
├── package.json
├── tsconfig.json
├── README.md
└── vitest.config.ts      # If testing
```

### Integration with AI SDK

Extensions are designed to seamlessly integrate with the Vercel AI SDK:

- Use `ai` package for core functionality
- Export utilities that enhance `generateText`, `streamText`, etc.
- Follow AI SDK patterns for tool definitions and schemas

### Dependencies

- **Core**: `ai` (AI SDK), `zod` (validation)
- **Tool Search**: `wink-bm25-text-search` (search algorithm)
- **Future**: Additional dependencies as needed per extension

## Contributing

### Adding New Extensions

1. Create `packages/<name>/` directory
2. Implement core functionality in `src/`
3. Add tests in `__tests__/`
4. Update root `package.json` scripts if needed
5. Add to README.md

### Philosophy

- **Minimalist**: Less is more. Focus on essential functionality.
- **Efficient**: Maximum performance, no bloat.
- **Integrated**: Seamless AI SDK compatibility.
- **Scalable**: Designed for enterprise use.

## Do Not

- Add unnecessary dependencies
- Break AI SDK integration patterns
- Skip testing for new features
- Commit without linting
- Add features outside the planned extensions without discussion