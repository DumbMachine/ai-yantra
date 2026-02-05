import { z } from 'zod';
import type { Tool } from 'ai';

// PTC Configuration Options
export interface PTCOptions {
  /** Name of the JavaScript execution tool (default: 'execute_javascript') */
  toolName?: string;
  /** Execution timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Maximum memory usage in bytes (optional) */
  maxMemory?: number;
  /** Custom tool description for the LLM */
  description?: string;
}

// Sandbox Configuration Options  
export interface SandboxOptions {
  /** Execution timeout in milliseconds */
  timeout: number;
  /** Maximum memory usage in bytes (optional) */
  maxMemory?: number;
}

// Tool execution result
export interface ToolExecutionResult {
  /** The captured console output */
  output: string;
  /** Whether execution completed successfully */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Execution time in milliseconds */
  executionTime?: number;
}

// Extended tool map type
export type ToolMap = Record<string, Tool>;

// Function signature information for documentation
export interface FunctionSignature {
  name: string;
  signature: string;
  description: string;
  parameters: Record<string, any>;
}

// Console capture interface
export interface ConsoleCapture {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

// Sandbox context interface
export interface SandboxContext {
  console: ConsoleCapture;
  checkCancellation?: () => void;
  [toolName: string]: any; // Injected tools
}