# PG-FS Test Plan

## Package Structure

```
packages/pg-fs/
├── src/                     # Source code
│   ├── index.ts            # Main exports (PgFs class, createPgFs)
│   ├── db-fs.ts            # PgFileSystem class (core filesystem operations)
│   ├── schema.ts           # Drizzle ORM schema definitions
│   ├── tools.ts            # AI SDK tool definitions
│   ├── utils.ts            # FileSystemUtils helper class
│   └── types.ts            # Shared TypeScript types
├── tests/
│   ├── unit/               # Unit tests (no database required)
│   │   ├── utils.test.ts   # FileSystemUtils tests
│   │   ├── schema.test.ts  # Schema validation tests
│   │   └── tools.test.ts   # Tool structure tests
│   ├── integration/        # Integration tests (database required)
│   │   ├── db-fs.test.ts   # PgFileSystem tests
│   │   └── pgfs.test.ts    # PgFs class tests
│   └── setup.ts            # Test setup and teardown
├── examples/               # Usage examples
├── package.json            # Package configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Vitest test configuration
└── drizzle.config.ts       # Drizzle Kit configuration
```

## Configuration Files

### package.json
- Dependencies: `ai`, `drizzle-orm`, `pg`, `zod`
- Dev dependencies: `@types/node`, `@types/pg`, `drizzle-kit`, `typescript`, `vitest`
- Peer dependencies: `@ai-sdk/openai` (optional)
- Scripts: build, test, lint, db:generate, db:push, db:studio

### tsconfig.json
- Target: ES2022
- Module: NodeNext
- OutDir: ./dist
- RootDir: ./src
- Strict mode enabled
- Declaration maps enabled

### vitest.config.ts
- Globals enabled
- Node environment
- Coverage with v8 provider
- Setup files: tests/setup.ts

## Untested Functionality Summary

### Critical Functions (47 total)

| Category | Count | Priority |
|----------|-------|----------|
| PgFileSystem Methods | 13 | High |
| FileSystemUtils Methods | 16 | High |
| AI SDK Tools | 12 | High |
| PgFs Class Methods | 5 | High |
| Schema Tables | 4 | Medium |

**Current Test Coverage: 0%**

## Unit Tests (Implemented)

### utils.test.ts
- Path normalization (6 test cases)
- Parent path extraction (4 test cases)
- Filename extraction (3 test cases)
- Path validation (4 test cases)
- Tree path conversion (3 test cases)
- Content hashing (3 test cases)
- ID generation (2 test cases)

### schema.test.ts
- Nodes table structure
- ContentBlocks table structure
- SearchIndex table structure
- Versions table structure

### tools.test.ts
- Tool creator function export
- Tool structure validation

## Integration Tests (Templates Created)

### db-fs.test.ts (13 test suites, 60+ test cases)
- writeFile (4 tests)
- readFile (4 tests)
- mkdir (3 tests)
- readdir (3 tests)
- readdirStats (1 test)
- stat (3 tests)
- exists (3 tests)
- unlink (5 tests)
- rename (5 tests)
- copy (4 tests)
- glob (4 tests)
- search (3 tests)

### pgfs.test.ts (3 test suites, 9 test cases)
- PgFs.create (4 tests)
- createPgFs helper (1 test)
- garbageCollect (2 tests)

## Test Execution Plan

### Phase 1: Unit Tests (Ready)
```bash
# Run unit tests (no database required)
cd packages/pg-fs
pnpm test tests/unit/
```

### Phase 2: Integration Tests (Requires Database)
```bash
# Setup test database
export DATABASE_URL=postgresql://localhost:5432/pgfs_test

# Run integration tests
pnpm test tests/integration/
```

### Phase 3: Coverage Report
```bash
# Generate coverage report
pnpm test --coverage
```

## Edge Cases Documented

### Filesystem Operations
- Writing to non-existent parent directory
- Reading from a directory (error case)
- Deleting non-empty directory without recursive flag
- Renaming directory updates all descendant paths
- Content deduplication verification
- Concurrent writes to same file
- Special characters in filenames
- Unicode paths

### Database Operations
- Unique constraint violations
- Foreign key constraint violations
- Cascade delete behavior
- Reference count management
- Garbage collection timing

### AI Tools
- Edit tool: old_string not found
- Edit tool: multiple occurrences
- Malformed input handling
- Timeout scenarios

## Next Steps

1. Install dependencies: `pnpm install`
2. Run unit tests: `pnpm test tests/unit/`
3. Setup test database for integration tests
4. Implement integration test cases
5. Add CI/CD pipeline with test automation
6. Target: 80%+ test coverage
