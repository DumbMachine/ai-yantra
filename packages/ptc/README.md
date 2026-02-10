# PTC (Programmable Tool Calling)

**PTC** lets your LLM write JavaScript that calls multiple tools in one shot, instead of the usual one-tool-per-round-trip dance.

## The Problem

With standard AI SDK tool calling, every tool call is a round-trip:

```
LLM → Tool 1 → JSON → LLM → Tool 2 → JSON → LLM → Answer
```

If the LLM needs to check the weather and then conditionally send an email, that's at least 3 round-trips. With PTC, the LLM writes JS that does it all at once:

```
LLM → JavaScript (calls tools, runs logic) → Output → LLM
```

One round-trip. The LLM gets loops, conditionals, and error handling for free.

## Quick Start

```bash
pnpm add ptc
```

```typescript
import { streamText, tool } from 'ai';
import { createPTC } from 'ptc';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get weather for a location',
  inputSchema: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    return { temperature: 22, condition: 'sunny', location };
  },
});

const emailTool = tool({
  description: 'Send an email',
  inputSchema: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ to, subject, body }) => {
    return { messageId: 'msg-123', status: 'sent' };
  },
});

// Wrap your tools with PTC
const ptc = createPTC({
  get_weather: weatherTool,
  send_email: emailTool,
}, {
  timeout: 5000,
});

// Use with AI SDK like normal
const result = await streamText({
  model: openai('gpt-4'),
  prompt: "Check the weather in NYC. If it's sunny, email boss@company.com that I'm taking the day off.",
  tools: ptc.tools,
});
```

### What the LLM actually generates

Instead of making separate tool calls, the LLM writes something like:

```javascript
const weather = await get_weather({ location: 'NYC' });

if (weather.condition === 'sunny') {
  const email = await send_email({
    to: 'boss@company.com',
    subject: 'Taking the day off',
    body: "It's sunny! Taking a personal day."
  });
  console.log("Email sent:", email);
} else {
  console.log("Not sunny, going to work.");
}
```

Tools are injected as async functions into a Node.js VM sandbox. Console output gets returned to the LLM.

## API

### `createPTC(tools, options?)`

The main one. Returns `{ tools, config, validation }`.

```typescript
const ptc = createPTC(yourTools, {
  toolName: 'execute_javascript', // name of the executor tool (default)
  timeout: 5000,                  // execution timeout in ms (default: 5s)
});
```

### `createSimplePTC(tools, toolName?)`

If you just want the tools object and nothing else:

```typescript
const tools = createSimplePTC({
  get_weather: weatherTool,
  send_email: emailTool,
});

const result = await generateText({
  model: openai('gpt-4'),
  prompt: "...",
  tools,
});
```

### `createDebugPTC(tools, options?)`

Same as `createPTC` but with verbose logging and a `executeCode()` method for testing:

```typescript
const ptc = createDebugPTC(yourTools, {
  verbose: true,
  onError: (error, context) => {
    console.log('Error:', error.message);
    console.log('Code:', context.code);
  }
});

// Test code execution directly
const result = await ptc.executeCode('console.log("hello");');
```

## Security

Code runs in a Node.js `vm` sandbox with:
- Configurable timeouts (default 5s)
- No access to `require` / npm modules
- Cancellation via AbortSignal

The `vm` module is not a full security boundary. For multi-tenant production use, consider wrapping with `isolated-vm` or Docker.

## License

MIT
