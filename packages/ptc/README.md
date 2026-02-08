# PTC (Programmable Tool Calling)

**PTC** is a minimalist extension for the Vercel AI SDK that enables LLMs to execute JavaScript code with access to AI SDK tools. It provides maximum efficiency through unified JavaScript execution without context switching between languages.

## 🚀 **Key Features**

- **🔥 Zero Context Switching**: Pure JavaScript execution with AI SDK tools
- **⚡ Native Performance**: Node.js VM-based sandbox for optimal speed  
- **🛡️ Secure Execution**: Built-in timeouts and memory limits
- **🧩 AI SDK Native**: Seamless integration with `streamText`, `generateText`, etc.
- **📦 Minimal Dependencies**: Lightweight with essential functionality only

## 📋 **Quick Start**

### Installation

```bash
# Install in your AI SDK project
pnpm add @ai-yantra/ptc
```

### Basic Usage

```typescript
import { streamText } from 'ai';
import { createPTC } from '@ai-yantra/ptc';
import { openai } from '@ai-sdk/openai';
import { tool } from 'ai';
import { z } from 'zod';

// Define your AI SDK tools
const weatherTool = tool({
  description: 'Get weather for a location',
  inputSchema: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    // Your weather API logic
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
    // Your email sending logic
    return { messageId: 'msg-123', status: 'sent' };
  },
});

// Create PTC with your tools
const ptc = createPTC({
  get_weather: weatherTool,
  send_email: emailTool,
}, {
  timeout: 5000, // 5 second execution limit
  toolName: 'execute_javascript'
});

// Use with AI SDK
const result = await streamText({
  model: openai('gpt-4'),
  prompt: "Check the weather in NYC. If it's sunny, send an email to boss@company.com saying I'm taking the day off.",
  tools: ptc.tools, // Only contains the JavaScript executor
});
```

## 🧠 **How It Works**

### The LLM Perspective

Instead of calling tools directly, the LLM writes JavaScript code that calls tools:

```javascript
// LLM generates this JavaScript code
const weather = await get_weather({ location: 'NYC' });
console.log("Weather in NYC:", weather);

if (weather.condition === 'sunny') {
  const email = await send_email({
    to: 'boss@company.com',
    subject: 'Taking the day off',
    body: "It's sunny! Taking a personal day."
  });
  console.log("Email sent:", email);
} else {
  console.log("It's not sunny, going to work.");
}
```

### The Runtime Flow

1. **LLM Decision**: "I need to check weather and conditionally send email. I'll use JavaScript for this logic."
2. **Code Generation**: LLM writes JavaScript with tool calls and control flow
3. **Sandbox Execution**: PTC runs the code in a secure Node.js VM
4. **Tool Proxy**: Tools are available as async functions in the sandbox
5. **Result Capture**: Console output is returned to the LLM
6. **LLM Summary**: "I checked the weather, it was sunny, so I sent the email."

## 🔧 **API Reference**

### `createPTC(tools, options?)`

Creates a PTC instance with JavaScript execution capabilities.

**Parameters:**
- `tools` - Record of AI SDK tools to make available in sandbox
- `options` - Configuration options (optional)

**Options:**
```typescript
interface PTCOptions {
  toolName?: string;     // Name of JS executor tool (default: 'execute_javascript')  
  timeout?: number;      // Execution timeout in ms (default: 5000)
  maxMemory?: number;    // Memory limit in bytes (optional)
  description?: string;  // Custom tool description (optional)
}
```

**Returns:**
```typescript
{
  tools: Record<string, Tool>;  // Tools for use with AI SDK
  config: PTCOptions;           // Resolved configuration  
  validation: ValidationResult; // Configuration validation results
}
```

### `createSimplePTC(tools, toolName?)`

Simplified PTC creation for quick setup.

```typescript
const tools = createSimplePTC({
  get_weather: weatherTool,
  send_email: emailTool,
});

// Use directly with AI SDK
const result = await generateText({
  model: openai('gpt-4'),
  prompt: "Your prompt here",
  tools, // Contains just the JavaScript executor
});
```

### `createDebugPTC(tools, options?)`

Enhanced PTC with debugging capabilities.

```typescript
const ptc = createDebugPTC({
  get_weather: weatherTool,
}, {
  verbose: true,
  timeout: 10000,
  onError: (error, context) => {
    console.log('PTC Error:', error.message);
    console.log('Code:', context.code);
  }
});

// Additional debugging methods
const result = await ptc.executeCode('console.log("Hello, PTC!");');
const docs = ptc.getDocumentation();
```

## 💡 **Use Cases**

### Complex Multi-Step Workflows

Perfect for scenarios requiring multiple API calls with business logic:

```javascript
// LLM generates sophisticated workflows
const team = await get_team_members({ department: 'Engineering' });
let totalExpenses = 0;
const expenseReport = [];

for (const member of team.data) {
  const expenses = await get_expenses({ 
    employeeId: member.id, 
    quarter: 'Q4-2023' 
  });
  
  if (expenses.success) {
    const total = parseFloat(expenses.summary.totalAmount);
    totalExpenses += total;
    
    // Check budget compliance
    const budget = await get_custom_budget({ employeeId: member.id });
    const limit = budget.hasCustomBudget ? budget.customBudget.quarterlyLimit : 5000;
    
    expenseReport.push({
      name: member.name,
      spent: total,
      limit: limit,
      compliance: total <= limit ? 'COMPLIANT' : 'OVER_BUDGET'
    });
  }
}

console.log(`Total Department Spend: $${totalExpenses.toFixed(2)}`);
console.log('\\nBudget Compliance Report:');
expenseReport.forEach(emp => {
  const status = emp.compliance === 'COMPLIANT' ? '✓' : '⚠';
  console.log(`${status} ${emp.name}: $${emp.spent} / $${emp.limit}`);
});
```

### Data Processing & Analysis

Ideal for aggregations, transformations, and complex calculations:

```javascript  
// Advanced data processing
const salesData = await get_sales_data({ quarter: 'Q1-2024' });
const regions = {};

salesData.records.forEach(record => {
  if (!regions[record.region]) {
    regions[record.region] = { total: 0, deals: [], topRep: null };
  }
  
  regions[record.region].total += record.amount;
  regions[record.region].deals.push(record);
});

// Find top performing region and rep
let topRegion = null;
let maxRevenue = 0;

for (const [region, data] of Object.entries(regions)) {
  if (data.total > maxRevenue) {
    maxRevenue = data.total;
    topRegion = region;
    
    // Find top rep in this region
    const repTotals = {};
    data.deals.forEach(deal => {
      repTotals[deal.rep] = (repTotals[deal.rep] || 0) + deal.amount;
    });
    
    data.topRep = Object.entries(repTotals)
      .sort(([,a], [,b]) => b - a)[0][0];
  }
}

console.log(`Top Region: ${topRegion} ($${maxRevenue.toFixed(2)})`);
console.log(`Top Rep: ${regions[topRegion].topRep}`);
```

## 🛡️ **Security & Safety**

### Sandbox Isolation

- **VM Boundaries**: Uses Node.js `vm` module for execution isolation
- **Timeout Protection**: Configurable execution time limits (default: 5s)
- **Memory Limits**: Optional memory usage constraints
- **No NPM Access**: Minimal approach with core JavaScript only

### Production Considerations

For maximum security in multi-tenant environments, consider:
- **isolated-vm**: Stronger isolation for untrusted code
- **Docker**: Full containerization for complete isolation
- **Resource Monitoring**: Track CPU and memory usage
- **Audit Logging**: Log all code execution for compliance

### Best Practices

```typescript
// Recommended production configuration
const ptc = createPTC(tools, {
  timeout: 5000,        // Reasonable timeout
  maxMemory: 50 * 1024 * 1024, // 50MB limit
  toolName: 'js_exec',  // Custom name for clarity
});

// Validate configuration
if (!ptc.validation.isValid) {
  throw new Error(`PTC Config Error: ${ptc.validation.errors.join(', ')}`);
}

// Monitor warnings
if (ptc.validation.warnings.length > 0) {
  console.warn('[PTC]', ptc.validation.warnings);
}
```

## 📊 **Performance Benefits**

### Comparison: Traditional vs PTC Approach

**Traditional Multi-Tool Approach:**
```
LLM → Tool Call 1 → JSON Response → LLM → Tool Call 2 → JSON Response → LLM → Final Answer
```

**PTC Approach:**
```
LLM → JavaScript Code → VM Execution (with tool access) → Consolidated Output → LLM
```

### Key Advantages

- **🔥 Reduced Latency**: Fewer round trips between LLM and tools
- **⚡ Native Speed**: JavaScript execution at full Node.js performance  
- **🧠 Better Context**: LLM maintains execution context throughout workflow
- **📊 Rich Output**: Complex data processing and formatting in one step
- **🔄 Error Recovery**: JavaScript try/catch for robust error handling

## 🎯 **Demo: Enterprise Expense Tracker**

The included demo showcases PTC with a realistic enterprise expense management system:

```bash
# Run the expense tracker demo
cd apps/ptc-demo
pnpm dev
```

**Demo Features:**
- **Complex Data Processing**: Handle 100+ expense records per employee
- **Multi-Step Analysis**: Department analysis, budget compliance, executive reporting
- **Real Business Logic**: Custom budget exceptions, approval workflows, compliance checks

**Sample Scenarios:**
1. **Department Analysis**: "Analyze Q4-2023 expenses for Engineering department"
2. **Budget Compliance**: "Find Sales team members exceeding budget limits" 
3. **Executive Summary**: "Generate comprehensive expense report for all departments"

## 🏗️ **Architecture**

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI SDK Tool  │───▶│  PTC JavaScript  │───▶│   Node.js VM    │
│   Integration   │    │    Executor      │    │    Sandbox      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Signature      │    │  Tool Proxies   │
                       │  Generator      │    │  & Console      │
                       └─────────────────┘    └─────────────────┘
```

### Integration Pattern

```typescript
// Your existing AI SDK setup
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Add PTC capability
import { createPTC } from '@ai-yantra/ptc';

const ptc = createPTC(yourExistingTools);

// Use with any AI SDK model
const result = await streamText({
  model: openai('gpt-4'), // or claude, llama, etc.
  tools: ptc.tools,       // Just the JavaScript executor
  prompt: "Your complex request here",
});
```

## 🤝 **Contributing**

PTC is part of the CIPHER monorepo - minimalist AI SDK extensions.

**Development Setup:**
```bash
git clone <repo>
cd ai-sdk-clothes
pnpm install
pnpm build
```

**Package Structure:**
```
packages/ptc/
├── src/
│   ├── index.ts           # Main API  
│   ├── sandbox.ts         # VM execution
│   ├── signature-generator.ts # Tool documentation
│   └── ptc-tool.ts        # AI SDK integration
└── apps/ptc-demo/         # Demo application
```

## 📄 **License**

MIT License - see LICENSE file for details.

## 🔗 **Related**

- **AI SDK**: https://sdk.vercel.ai/
- **Tool Search**: Companion package for dynamic tool discovery
- **CIPHER Monorepo**: Collection of minimalist AI SDK extensions

---

**Built with the philosophy: Maximum efficiency, pure function, no excess.**