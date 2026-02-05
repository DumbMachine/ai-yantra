import type { Tool } from 'ai';
import type { FunctionSignature, ToolMap } from './types';

/**
 * Converts a tool's input schema to a TypeScript-like function signature string
 */
export function generateJSSignature(name: string, inputSchema: any): string {
  // Simplified approach that works with AI SDK's flexible schema system
  return `async function ${name}(params: object): Promise<any>`;
}

/**
 * Generates detailed documentation for all tools available in the sandbox
 */
export function generateToolDocumentation(tools: ToolMap): string {
  const signatures: FunctionSignature[] = Object.entries(tools).map(([name, tool]) => {
    const signature = generateJSSignature(name, tool.inputSchema);
    
    return {
      name,
      signature,
      description: tool.description || 'No description available',
      parameters: {}, // Simplified for now
    };
  });

  const docLines = [
    'Available Functions in JavaScript Environment:',
    '',
    ...signatures.map(sig => {
      const lines = [
        `// ${sig.description}`,
        sig.signature,
        ''
      ];
      
      return lines.join('\n');
    }),
    'Usage Notes:',
    '- All functions are async and return Promises',
    '- Use await when calling functions',
    '- Pass parameters as a single object: await funcName({ param1: "value", param2: 123 })',
    '- Use console.log() to output results',
    '- Handle errors with try/catch blocks',
    ''
  ];

  return docLines.join('\n');
}

/**
 * Extracts parameter information from a schema for runtime validation
 */
export function extractParameterInfo(inputSchema: any): Record<string, any> {
  // Simplified version for now
  return { 
    type: 'object', 
    properties: {}, 
    required: [] 
  };
}

/**
 * Validates if a tool name is safe for use in JavaScript (valid identifier)
 */
export function isValidToolName(name: string): boolean {
  // JavaScript identifier regex: must start with letter/underscore, 
  // followed by letters/numbers/underscores
  const jsIdentifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  
  // Also check it's not a JavaScript reserved word
  const reservedWords = [
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
    'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch',
    'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
    'let', 'static', 'enum', 'implements', 'interface', 'package', 'private',
    'protected', 'public', 'await', 'async'
  ];
  
  return jsIdentifierRegex.test(name) && !reservedWords.includes(name);
}

/**
 * Sanitizes a tool name to be safe for JavaScript use
 */
export function sanitizeToolName(name: string): string {
  // Replace dots, hyphens, spaces with underscores
  let sanitized = name.replace(/[.\-\s]/g, '_');
  
  // Remove invalid characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9_$]/g, '');
  
  // Ensure it starts with a letter or underscore
  if (!/^[a-zA-Z_$]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  
  return sanitized;
}