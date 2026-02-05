# Tool Search Library for Vercel AI SDK

This package provides a Tool Search implementation for the Vercel AI SDK, allowing dynamic tool discovery using Regex or BM25 search strategies.

## Installation

In your monorepo root, run:
```bash
pnpm install
```

## Build

```bash
pnpm run build
```

This compiles the TypeScript code to the `dist/` directory.

## Usage Example

Here is how you use it in your application (e.g., a Next.js API route).

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// 1. Import from your lib
import { tool } from './my-lib/tool';
import { createToolSearch } from './my-lib/index';

// 2. Define tools (some heavy ones deferred)
const myTools = {
  get_weather: tool({
    description: 'Get the weather in a location',
    parameters: z.object({ location: z.string() }),
    execute: async ({ location }) => ({ temp: 72, location }),
    defer_loading: true, // <--- HIDDEN INITIALLY
  }),
  
  get_stock_price: tool({
    description: 'Get the stock price for a ticker',
    parameters: z.object({ ticker: z.string() }),
    execute: async ({ ticker }) => ({ price: 150.00, ticker }),
    defer_loading: true, // <--- HIDDEN INITIALLY
  }),

  get_time: tool({
    description: 'Get current time',
    parameters: z.object({}),
    execute: async () => new Date().toISOString(),
    defer_loading: false, // <--- ALWAYS VISIBLE
  }),
};

// 3. Initialize Tool Search
const toolSearch = createToolSearch({
  tools: myTools,
  strategy: 'bm25', // or 'regex'
});

async function main() {
  const result = await generateText({
    model: openai('gpt-4o'),
    prompt: 'What is the weather in San Francisco?',
    
    // 4. Pass the combined tools
    tools: toolSearch.tools,
    
    // 5. Pass the prepareStep hook
    prepareStep: toolSearch.prepareStep,
    
    // 6. Important: Enable multi-step so the model can search -> then call
    maxSteps: 5, 
    
    // 7. Set initial active tools (optional, usually handled by prepareStep, 
    // but good for the very first step if prepareStep logic relies on previous steps)
    activeTools: toolSearch.activeTools, 
  });

  console.log(result.text);
  console.log('Steps:', result.steps.length);
}

main();
```

## API Reference

### `createToolSearch(options: ToolSearchOptions)`

Creates a tool search instance.

- `tools`: Object mapping tool names to tool definitions.
- `strategy`: 'regex' or 'bm25' (default: 'regex').
- `searchToolName`: Name for the search tool (default: 'tool_search').

Returns an object with `tools`, `prepareStep`, and `activeTools`.

### `tool(options)`

Wrapper around AI SDK's `tool` to support `defer_loading` flag.