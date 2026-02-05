import vm from 'vm';
import type { Tool } from 'ai';
import type { SandboxOptions, ToolExecutionResult, ConsoleCapture, SandboxContext, ToolMap } from './types';
import { sanitizeToolName, isValidToolName } from './signature-generator';

/**
 * Node.js VM-based JavaScript execution sandbox for PTC with cancellation support
 */
export class NodeSandbox {
  private timeout: number;
  private maxMemory?: number;
  private activeAbortController: AbortController | null = null;

  constructor(options: SandboxOptions) {
    this.timeout = options.timeout || 5000;
    this.maxMemory = options.maxMemory;
  }

  /**
   * Executes JavaScript code with injected tools in an isolated VM context
   * @param code The JavaScript code to execute
   * @param tools Tools to inject as global functions
   * @param abortSignal Optional AbortSignal for cancellation
   */
  async execute(code: string, tools: ToolMap, abortSignal?: AbortSignal): Promise<string> {
    const startTime = Date.now();
    const logs: string[] = [];
    let executionError: Error | null = null;

    // Create internal abort controller for timeout
    this.activeAbortController = new AbortController();
    
    // Forward external abort signal
    if (abortSignal) {
      if (abortSignal.aborted) {
        throw new Error('Execution was cancelled before starting');
      }
      
      abortSignal.addEventListener('abort', () => {
        this.activeAbortController?.abort();
      });
    }

    try {
      // Check for cancellation before starting
      if (this.activeAbortController.signal.aborted) {
        throw new Error('Execution was cancelled');
      }

      // 1. Create console capture system
      const console: ConsoleCapture = {
        log: (...args: any[]) => {
          const message = args.map(arg => this.formatLogArgument(arg)).join(' ');
          logs.push(message);
        },
        error: (...args: any[]) => {
          const message = args.map(arg => this.formatLogArgument(arg)).join(' ');
          logs.push(`ERROR: ${message}`);
        },
        warn: (...args: any[]) => {
          const message = args.map(arg => this.formatLogArgument(arg)).join(' ');
          logs.push(`WARN: ${message}`);
        },
        info: (...args: any[]) => {
          const message = args.map(arg => this.formatLogArgument(arg)).join(' ');
          logs.push(`INFO: ${message}`);
        },
      };

      // 2. Create the sandbox context with console and cancellation support
      const sandboxContext: SandboxContext = {
        console,
        checkCancellation: () => {
          if (typeof (sandboxContext as any).__cancelled !== 'undefined' && (sandboxContext as any).__cancelled) {
            throw new Error('Execution was cancelled');
          }
        }
      };

      // 3. Inject tools as global async functions with cancellation support
      const toolProxies: Record<string, Function> = {};
      
      for (const [originalName, tool] of Object.entries(tools)) {
        const safeName = this.getSafeToolName(originalName);
        
        // Create async proxy function for the tool with abort support
        toolProxies[safeName] = async (args: any) => {
          // Check if execution was cancelled before tool call
          if (this.activeAbortController?.signal.aborted) {
            throw new Error(`Tool execution cancelled: ${originalName}`);
          }

          try {
            // Validate that tool has execute function
            if (!tool.execute) {
              throw new Error(`Tool ${originalName} does not have an execute function`);
            }

            // Create tool execution promise
            const toolPromise = tool.execute(args, { 
              toolCallId: `sandbox-${Date.now()}`, 
              messages: [] 
            });

            // Create cancellation promise that rejects when aborted
            const abortPromise = new Promise<never>((_, reject) => {
              if (this.activeAbortController?.signal.aborted) {
                reject(new Error(`Tool ${originalName} was cancelled`));
                return;
              }
              
              const onAbort = () => {
                reject(new Error(`Tool ${originalName} was cancelled`));
              };
              
              this.activeAbortController?.signal.addEventListener('abort', onAbort);
              
              // Clean up listener when tool completes
              toolPromise.finally(() => {
                this.activeAbortController?.signal.removeEventListener('abort', onAbort);
              });
            });

            // Race between tool execution and cancellation
            const result = await Promise.race([toolPromise, abortPromise]);
            return result;
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Don't log cancellation as errors
            if (!errorMessage.includes('cancelled') && !errorMessage.includes('abort')) {
              console.error(`Tool execution failed for ${originalName}: ${errorMessage}`);
            }
            
            throw error;
          }
        };

        // Add to sandbox context
        sandboxContext[safeName] = toolProxies[safeName];
      }

      // 4. Wrap user code - the execution promise tracking is now handled in executeWithTimeout
      const wrappedCode = code;

      // 5. Create VM context and execute with cancellation support
      const context = vm.createContext(sandboxContext);
      
      // Add cancellation flag to context
      (context as any).__cancelled = false;
      
      // Set up cancellation listener
      this.activeAbortController.signal.addEventListener('abort', () => {
        (context as any).__cancelled = true;
      });
      
      // Execute with timeout and cancellation protection
      const result = await this.executeWithTimeout(wrappedCode, context, this.activeAbortController.signal);
      
    } catch (error) {
      executionError = error instanceof Error ? error : new Error(String(error));
      
      // Differentiate between cancellation and other errors
      if (executionError.message.includes('cancelled') || executionError.message.includes('abort')) {
        logs.push(`Execution cancelled: ${executionError.message}`);
      } else {
        logs.push(`System Error: ${executionError.message}`);
      }
    } finally {
      // Clean up abort controller
      this.activeAbortController = null;
    }

    const executionTime = Date.now() - startTime;
    
    // Return consolidated output
    const output = logs.join('\n');
    
    // Add execution metadata if verbose
    if (executionTime > 1000) {
      return `${output}\n\n[Execution completed in ${executionTime}ms]`;
    }
    
    return output;
  }

  /**
   * Cancels the currently executing code
   */
  cancel(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
  }

  /**
   * Executes code with timeout protection and cancellation support
   * This properly handles async operations by waiting for them to complete or cancel
   */
  private async executeWithTimeout(code: string, context: vm.Context, abortSignal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let isCompleted = false;
      let executionPromise: Promise<any> | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        isCompleted = true;
      };

      // Set up timeout
      timeoutId = setTimeout(() => {
        if (!isCompleted) {
          cleanup();
          reject(new Error(`Execution timeout: exceeded ${this.timeout}ms limit`));
        }
      }, this.timeout);

      // Set up cancellation
      const onAbort = () => {
        if (!isCompleted) {
          cleanup();
          reject(new Error('Execution was cancelled'));
        }
      };

      abortSignal.addEventListener('abort', onAbort);

      try {
        // Create a promise tracking variable in the context
        (context as any).__executionPromise = null;
        (context as any).__resolveExecution = null;
        (context as any).__rejectExecution = null;

        // Modified wrapper that captures the promise
        const modifiedCode = `
          (async () => {
            const executionPromise = new Promise((resolve, reject) => {
              __resolveExecution = resolve;
              __rejectExecution = reject;
            });
            __executionPromise = executionPromise;

            // Execute the user code and capture result/error
            try {            
              ${code}
              __resolveExecution('completed');
            } catch (error) {
              console.error('Execution error:', error.message);
              __rejectExecution(error);
            }
          })().catch(error => {
            console.error('Unhandled error:', error.message);
            if (__rejectExecution) {
              __rejectExecution(error);
            }
          });
        `;
        
        // Run the code synchronously to start the async operations
        vm.runInContext(modifiedCode, context, {
          timeout: Math.min(this.timeout, 1000), // Short timeout for sync part only
          displayErrors: true,
        });
        
        // Get the execution promise from the context
        executionPromise = (context as any).__executionPromise;
        
        if (!executionPromise) {
          cleanup();
          abortSignal.removeEventListener('abort', onAbort);
          resolve();
          return;
        }

        // Race between execution completion, timeout, and cancellation
        const timeoutPromise = new Promise((_, timeoutReject) => {
          setTimeout(() => {
            timeoutReject(new Error(`Async execution timeout: exceeded ${this.timeout}ms limit`));
          }, this.timeout);
        });

        const cancelPromise = new Promise((_, cancelReject) => {
          abortSignal.addEventListener('abort', () => {
            cancelReject(new Error('Execution was cancelled'));
          });
        });

        Promise.race([executionPromise, timeoutPromise, cancelPromise])
          .then(() => {
            if (!isCompleted) {
              cleanup();
              abortSignal.removeEventListener('abort', onAbort);
              resolve();
            }
          })
          .catch((error) => {
            if (!isCompleted) {
              cleanup();
              abortSignal.removeEventListener('abort', onAbort);
              reject(error);
            }
          });
        
      } catch (error) {
        cleanup();
        abortSignal.removeEventListener('abort', onAbort);
        reject(error);
      }
    });
  }

  /**
   * Formats log arguments for display
   */
  private formatLogArgument(arg: any): string {
    if (typeof arg === 'string') {
      return arg;
    }
    
    if (typeof arg === 'number' || typeof arg === 'boolean') {
      return String(arg);
    }
    
    if (arg === null) {
      return 'null';
    }
    
    if (arg === undefined) {
      return 'undefined';
    }
    
    // For objects and arrays, use JSON.stringify with pretty printing
    try {
      return JSON.stringify(arg, null, 2);
    } catch (error) {
      // Handle circular references or other JSON errors
      return '[Object: unable to stringify]';
    }
  }

  /**
   * Gets a safe tool name for use in JavaScript context
   */
  private getSafeToolName(originalName: string): string {
    if (isValidToolName(originalName)) {
      return originalName;
    }
    
    const sanitized = sanitizeToolName(originalName);
    
    // Log warning about name transformation
    console.warn(`Tool name "${originalName}" was sanitized to "${sanitized}"`);
    
    return sanitized;
  }

  /**
   * Validates execution environment and security constraints
   */
  private validateEnvironment(): void {
    // Basic security checks
    if (this.timeout <= 0) {
      throw new Error('Timeout must be positive');
    }
    
    if (this.timeout > 30000) {
      console.warn('Warning: Timeout exceeds 30 seconds, which may impact performance');
    }
    
    if (this.maxMemory && this.maxMemory < 1024 * 1024) {
      throw new Error('Memory limit too low (minimum 1MB required)');
    }
  }
}