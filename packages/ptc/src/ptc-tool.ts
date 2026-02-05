// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import type { Tool } from 'ai';
import { NodeSandbox } from './sandbox';
import { generateToolDocumentation } from './signature-generator';
import type { PTCOptions, ToolMap } from './types';

/**
 * Creates a JavaScript interpreter tool that provides access to other tools within a sandbox
 */
export function createPTCTool(
  innerTools: ToolMap, 
  options: PTCOptions = {},
  existingSandbox?: NodeSandbox
): Tool {
  const {
    toolName = 'execute_javascript',
    timeout = 5000,
    maxMemory,
    description: customDescription,
  } = options;

  // Use existing sandbox or create new one
  const sandbox = existingSandbox || new NodeSandbox({ timeout, maxMemory });

  // Generate comprehensive documentation for the LLM
  const toolDocumentation = generateToolDocumentation(innerTools);
  
  const defaultDescription = `
A JavaScript execution environment with access to external tools. Use this to solve complex logic, loops, data processing, or combine multiple tool calls efficiently.

${toolDocumentation}

Example Usage:
\`\`\`javascript
// Simple tool call
const weather = await get_weather({ location: 'Paris' });
console.log('Weather:', weather);

// Complex workflow with multiple tools and logic
const users = await get_team_members({ department: 'Engineering' });
let totalExpenses = 0;

for (const user of users) {
  const expenses = await get_expenses({ 
    employeeId: user.id, 
    quarter: 'Q4-2023' 
  });
  
  // Process and aggregate data
  const quarterlyTotal = expenses.reduce((sum, expense) => {
    return sum + parseFloat(expense.amount);
  }, 0);
  
  totalExpenses += quarterlyTotal;
  
  console.log(\`\${user.name}: $\${quarterlyTotal.toFixed(2)}\`);
}

console.log(\`Total department expenses: $\${totalExpenses.toFixed(2)}\`);
\`\`\`

Security & Guidelines:
- Execution timeout: ${timeout}ms
- Use try/catch blocks for error handling
- All tool functions are async - use await
- Output results with console.log()
- Process data efficiently for large datasets
- Execution can be cancelled/interrupted if needed
`.trim();

  const toolDescription = customDescription || defaultDescription;

  // @ts-ignore - Using AI SDK tool with proper types
  const ptcTool = tool({
    description: toolDescription,
    inputSchema: z.object({
      code: z.string().describe('The JavaScript code to execute in the sandbox environment'),
    }),
    execute: async ({ code }: { code: string }, context?: any) => {
      try {
        // Validate input
        if (!code || typeof code !== 'string') {
          return 'Error: No code provided or invalid code format';
        }

        if (code.trim().length === 0) {
          return 'Error: Empty code provided';
        }

        // Extract AbortSignal if provided by AI SDK context
        const abortSignal = context?.abortSignal;

        // Execute code in sandbox with access to tools and cancellation support
        const result = await sandbox.execute(code, innerTools, abortSignal);
        
        // Return the captured output from console.log statements
        if (!result || result.trim().length === 0) {
          return 'Code executed successfully but produced no output. Use console.log() to display results.';
        }

        return result;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Handle cancellation differently from other errors
        if (errorMessage.includes('cancelled') || errorMessage.includes('abort')) {
          return `Execution Cancelled: ${errorMessage}

The JavaScript execution was interrupted. This can happen due to:
- User cancellation (Ctrl+C)
- Timeout exceeded (${timeout}ms limit)
- External abort signal

To continue, please try again with simpler code or increase timeout if needed.`;
        }
        
        // Return user-friendly error for other cases
        return `Execution Error: ${errorMessage}

Troubleshooting Tips:
- Check syntax errors in your JavaScript code
- Ensure all async functions use 'await' keyword
- Verify tool names and parameters are correct
- Use try/catch blocks for error handling
- Check that execution time doesn't exceed ${timeout}ms limit
- Consider breaking complex operations into smaller steps`;
      }
    },
  });

  return ptcTool;
}

/**
 * Creates multiple PTC tools with different configurations
 */
export function createMultiplePTCTools(
  toolConfigs: Array<{
    name: string;
    tools: ToolMap;
    options?: PTCOptions;
  }>
): Record<string, Tool> {
  const result: Record<string, Tool> = {};
  
  for (const config of toolConfigs) {
    result[config.name] = createPTCTool(config.tools, {
      toolName: config.name,
      ...config.options,
    });
  }
  
  return result;
}

/**
 * Validates PTC configuration and provides helpful error messages
 */
export function validatePTCConfig(
  tools: ToolMap, 
  options: PTCOptions = {}
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check tools
  if (!tools || typeof tools !== 'object') {
    errors.push('Tools must be provided as an object');
  } else {
    const toolNames = Object.keys(tools);
    
    if (toolNames.length === 0) {
      warnings.push('No tools provided - sandbox will only have basic JavaScript capabilities');
    }

    // Validate tool structure
    for (const [name, tool] of Object.entries(tools)) {
      if (!tool || typeof tool !== 'object') {
        errors.push(`Tool '${name}' is not a valid tool object`);
        continue;
      }

      if (!tool.execute || typeof tool.execute !== 'function') {
        errors.push(`Tool '${name}' does not have a valid execute function`);
      }

      if (!tool.inputSchema) {
        warnings.push(`Tool '${name}' does not have an inputSchema - may cause runtime errors`);
      }
    }
  }

  // Check options
  if (options.timeout !== undefined) {
    if (typeof options.timeout !== 'number' || options.timeout <= 0) {
      errors.push('Timeout must be a positive number');
    } else if (options.timeout > 30000) {
      warnings.push('Timeout exceeds 30 seconds - this may impact performance');
    }
  }

  if (options.maxMemory !== undefined) {
    if (typeof options.maxMemory !== 'number' || options.maxMemory < 1024 * 1024) {
      errors.push('Max memory must be at least 1MB');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}