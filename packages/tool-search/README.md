# Tool Search

**tool-search** lets you give your agent access to lots of tools without stuffing them all into the context window.

## The Problem

If you hand an LLM 50 tool definitions upfront, you're burning tokens on tools it'll never use in that conversation. Worse, too many tools can confuse the model.

Tool search fixes this by hiding most tools behind a search step. The agent starts with only a few always-on tools plus a `tool_search` tool. When it needs something specific, it searches for it, and the tool gets activated for the rest of the conversation.

```
Step 1: Agent sees [always_on_tool, tool_search]
Step 2: Agent calls tool_search("weather")
Step 3: get_weather is now available
Step 4: Agent calls get_weather({ location: "NYC" })
```

This is the same pattern Anthropic uses internally — lazy tool discovery.

## Quick Start

```bash
pnpm add tool-search
```

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { tool, createToolSearch } from 'tool-search';
import { z } from 'zod';

const myTools = {
  get_weather: tool({
    description: 'Get the weather in a location',
    inputSchema: z.object({ location: z.string() }),
    execute: async ({ location }) => ({ temp: 72, location }),
    defer_loading: true, // hidden until searched for
  }),

  get_stock_price: tool({
    description: 'Get the stock price for a ticker',
    inputSchema: z.object({ ticker: z.string() }),
    execute: async ({ ticker }) => ({ price: 150.00, ticker }),
    defer_loading: true, // hidden until searched for
  }),

  get_time: tool({
    description: 'Get current time',
    inputSchema: z.object({}),
    execute: async () => new Date().toISOString(),
    defer_loading: false, // always available
  }),
};

const toolSearch = createToolSearch({
  tools: myTools,
  strategy: 'bm25', // or 'regex'
});

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'What is the weather in San Francisco?',
  tools: toolSearch.tools,
  prepareStep: toolSearch.prepareStep,
  activeTools: toolSearch.activeTools,
  maxSteps: 5, // needs multi-step so the agent can search then call
});
```

## How it works

Mark tools with `defer_loading: true` to hide them initially. The agent gets a `tool_search` tool that finds matching tools by name and description.

Two search strategies:
- **regex** (default): The agent passes a regex pattern. Good for when the agent knows roughly what it's looking for (`"get_.*_data"`, `"(?i)slack"`).
- **bm25**: TF-IDF based search. Returns top 5 matches, weighted toward tool name (2x) over description (1x). Better for fuzzy discovery.

Once a tool is found, it stays active for the rest of the conversation — no need to search again.

## API

### `createToolSearch(options)`

```typescript
const toolSearch = createToolSearch({
  tools: myTools,           // your tool definitions
  strategy: 'regex',        // 'regex' or 'bm25' (default: 'regex')
  searchToolName: 'tool_search', // name for the search tool (default)
});
```

Returns:
- `tools` — all tools including the search tool, pass to AI SDK
- `prepareStep` — hook that controls which tools are active each step
- `activeTools` — initial set of active tool names

### `tool(options)`

Wrapper around AI SDK's `tool` that adds the `defer_loading` flag.

## License

MIT
