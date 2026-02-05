import type { Tool } from 'ai';
import { createPTCTool, createMultiplePTCTools, validatePTCConfig } from './ptc-tool';
import { NodeSandbox } from './sandbox';
import { 
  generateJSSignature, 
  generateToolDocumentation, 
  isValidToolName, 
  sanitizeToolName 
} from './signature-generator';
import type { PTCOptions, ToolMap, SandboxOptions } from './types';

/**
 * Main PTC API - Creates a Programmable Tool Calling system
 * 
 * This is the primary entry point for the PTC package. It creates a JavaScript
 * execution environment that allows LLMs to write and execute JavaScript code
 * with access to AI SDK tools.
 * 
 * @param tools - Record of AI SDK tools to make available in the sandbox
 * @param options - Configuration options for the PTC system
 * @returns An object containing the PTC tool for use with AI SDK
 */
export function createPTC(
  tools: ToolMap, 
  options: PTCOptions = {}
): {
  /** The JavaScript execution tool for use with streamText/generateText */
  tools: Record<string, Tool>;
  /** Configuration used for this PTC instance */
  config: PTCOptions;
  /** Validation results for the configuration */
  validation: ReturnType<typeof validatePTCConfig>;
  /** JavaScript function signatures for the tools */
  signature: string;
  /** Cancel any currently executing JavaScript code */
  cancel: () => void;
  /** The underlying sandbox instance for advanced usage */
  sandbox: NodeSandbox;
} {
  // Validate configuration
  const validation = validatePTCConfig(tools, options);
  
  if (!validation.isValid) {
    throw new Error(`PTC Configuration Error: ${validation.errors.join(', ')}`);
  }

  // Show warnings if any
  if (validation.warnings.length > 0) {
    console.warn('[PTC] Warnings:', validation.warnings.join(', '));
  }

  // Set default options  
  const config: PTCOptions = {
    toolName: options.toolName || 'execute_javascript',
    timeout: options.timeout || 5000,
    maxMemory: options.maxMemory,
    description: options.description,
  };

  // Create shared sandbox instance for cancellation support
  const sandbox = new NodeSandbox({ 
    timeout: config.timeout || 5000,
    maxMemory: config.maxMemory 
  });
  
  // Create the PTC tool - we'll need to modify createPTCTool to accept a sandbox
  const ptcTool = createPTCTool(tools, config, sandbox);
  const toolName = config.toolName || 'execute_javascript';

  // Generate tool documentation/signature
  const signature = generateToolDocumentation(tools);

  return {
    tools: {
      [toolName]: ptcTool,
    },
    config,
    validation,
    signature,
    sandbox,
    cancel: () => {
      sandbox.cancel();
    },
  };
}

/**
 * Simplified PTC creation for quick setup
 * 
 * @param tools - Record of AI SDK tools
 * @param toolName - Name for the JavaScript execution tool (default: 'execute_javascript')
 * @returns Just the tools object for immediate use
 */
export function createSimplePTC(
  tools: ToolMap, 
  toolName: string = 'execute_javascript'
): Record<string, Tool> {
  const ptc = createPTC(tools, { toolName });
  return ptc.tools;
}

/**
 * Create PTC with enhanced error handling and logging
 * 
 * Useful for development and debugging scenarios where you want detailed
 * feedback about tool execution and sandbox behavior.
 */
export function createDebugPTC(
  tools: ToolMap, 
  options: PTCOptions & { 
    /** Enable verbose logging */
    verbose?: boolean;
    /** Custom error handler */
    onError?: (error: Error, context: { code: string; toolName: string }) => void;
  } = {}
): ReturnType<typeof createPTC> & {
  /** Execute code directly for testing */
  executeCode: (code: string) => Promise<string>;
  /** Get tool documentation */
  getDocumentation: () => string;
} {
  const { verbose = false, onError, ...ptcOptions } = options;
  
  const ptc = createPTC(tools, ptcOptions);
  
  if (verbose) {
    console.log('[PTC Debug] Created PTC with tools:', Object.keys(tools));
    console.log('[PTC Debug] Configuration:', ptc.config);
  }

  // Create sandbox for direct execution
  const sandboxTimeout = ptc.config.timeout || 5000;
  const sandboxMaxMemory = ptc.config.maxMemory;
  const toolName = ptc.config.toolName || 'execute_javascript';
  
  const sandbox = new NodeSandbox({ 
    timeout: sandboxTimeout,
    maxMemory: sandboxMaxMemory 
  });

  return {
    ...ptc,
    
    executeCode: async (code: string): Promise<string> => {
      if (verbose) {
        console.log('[PTC Debug] Executing code:', code.substring(0, 100) + '...');
      }
      
      try {
        const result = await sandbox.execute(code, tools);
        
        if (verbose) {
          console.log('[PTC Debug] Execution result:', result.substring(0, 200) + '...');
        }
        
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        if (onError) {
          onError(err, { code, toolName });
        }
        
        if (verbose) {
          console.error('[PTC Debug] Execution error:', err.message);
        }
        
        throw err;
      }
    },
    
    getDocumentation: (): string => {
      return generateToolDocumentation(tools);
    },
  };
}

// Re-export all utilities and types for convenience
export {
  // Core functionality
  createPTCTool,
  createMultiplePTCTools,
  NodeSandbox,
  
  // Utilities
  generateJSSignature,
  generateToolDocumentation,
  isValidToolName,
  sanitizeToolName,
  validatePTCConfig,
  
  // Types
  type PTCOptions,
  type SandboxOptions,
  type ToolMap,
};

// Re-export types from './types' for external use
export type {
  ToolExecutionResult,
  FunctionSignature,
  ConsoleCapture,
  SandboxContext,
} from './types';