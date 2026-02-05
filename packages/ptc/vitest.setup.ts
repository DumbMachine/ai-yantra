// Mock setup for AI SDK and external dependencies
import { vi } from 'vitest';

// Mock the 'ai' package
vi.mock('ai', () => ({
  tool: vi.fn(),
}));

// Mock zod-to-json-schema
vi.mock('zod-to-json-schema', () => ({
  zodToJsonSchema: vi.fn(),
}));