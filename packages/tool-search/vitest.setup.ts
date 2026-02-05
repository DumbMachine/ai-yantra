import { vi } from 'vitest'

// Mock AI SDK tool
vi.mock('ai', () => ({
  tool: vi.fn((options) => ({
    ...options,
    execute: options.execute,
  })),
}))

// Mock wink-bm25-text-search
vi.mock('wink-bm25-text-search', () => ({
  default: vi.fn(() => ({
    defineConfig: vi.fn(),
    addDoc: vi.fn(),
    consolidate: vi.fn(),
    search: vi.fn(() => []),
  })),
}))