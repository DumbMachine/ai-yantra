// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPTC, createSimplePTC } from '../index';
import { z } from 'zod';

// Mock tools for testing
const mockWeatherTool = {
  description: 'Get weather for a location',
  inputSchema: z.object({
    location: z.string(),
  }),
  execute: vi.fn().mockResolvedValue({
    temperature: 22,
    condition: 'sunny',
    location: 'Paris'
  }),
};

const mockEmailTool = {
  description: 'Send an email',
  inputSchema: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: vi.fn().mockResolvedValue({
    messageId: 'msg-123',
    status: 'sent'
  }),
};

describe('PTC Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create PTC with tools', () => {
    const tools = {
      get_weather: mockWeatherTool,
      send_email: mockEmailTool,
    };

    const ptc = createPTC(tools);
    
    expect(ptc.tools).toBeDefined();
    expect(ptc.tools.execute_javascript).toBeDefined();
    expect(ptc.config).toBeDefined();
    expect(ptc.validation).toBeDefined();
    expect(ptc.validation.isValid).toBe(true);
  });

  it('should create simple PTC', () => {
    const tools = {
      get_weather: mockWeatherTool,
    };

    const ptcTools = createSimplePTC(tools);
    
    expect(ptcTools.execute_javascript).toBeDefined();
    expect(typeof ptcTools.execute_javascript.execute).toBe('function');
  });

  it('should validate configuration correctly', () => {
    const tools = {
      get_weather: mockWeatherTool,
    };

    const ptc = createPTC(tools, {
      timeout: 3000,
      toolName: 'my_js_executor',
    });

    expect(ptc.config.timeout).toBe(3000);
    expect(ptc.config.toolName).toBe('my_js_executor');
    expect(ptc.tools.my_js_executor).toBeDefined();
  });

  it('should handle empty tools gracefully', () => {
    const ptc = createPTC({});
    
    expect(ptc.validation.isValid).toBe(true);
    expect(ptc.validation.warnings.length).toBeGreaterThan(0);
  });

  it('should reject invalid configuration', () => {
    const tools = {
      get_weather: mockWeatherTool,
    };

    expect(() => {
      createPTC(tools, { timeout: -1 });
    }).toThrow('PTC Configuration Error');
  });
});

describe('PTC JavaScript Execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute simple JavaScript code', async () => {
    const tools = {
      get_weather: mockWeatherTool,
    };

    const ptc = createPTC(tools);
    const jsExecutor = ptc.tools.execute_javascript;

    const result = await jsExecutor.execute({
      code: 'console.log("Hello, PTC!");'
    });

    expect(result).toContain('Hello, PTC!');
  });

  it('should execute code with tool calls', async () => {
    const tools = {
      get_weather: mockWeatherTool,
    };

    const ptc = createPTC(tools);
    const jsExecutor = ptc.tools.execute_javascript;

    const result = await jsExecutor.execute({
      code: `
        const weather = await get_weather({ location: "Paris" });
        console.log("Weather:", JSON.stringify(weather));
      `
    });

    expect(mockWeatherTool.execute).toHaveBeenCalledWith(
      { location: "Paris" },
      expect.any(Object)
    );
    expect(result).toContain('Weather:');
    expect(result).toContain('sunny');
  });

  it('should handle JavaScript errors gracefully', async () => {
    const tools = {
      get_weather: mockWeatherTool,
    };

    const ptc = createPTC(tools);
    const jsExecutor = ptc.tools.execute_javascript;

    const result = await jsExecutor.execute({
      code: 'throw new Error("Test error");'
    });

    expect(result).toContain('ERROR: Test error');
  });

  it('should handle invalid code input', async () => {
    const tools = {
      get_weather: mockWeatherTool,
    };

    const ptc = createPTC(tools);
    const jsExecutor = ptc.tools.execute_javascript;

    const result = await jsExecutor.execute({
      code: ''
    });

    expect(result).toContain('Error: Empty code provided');
  });

  it('should provide helpful error messages', async () => {
    const tools = {
      get_weather: mockWeatherTool,
    };

    const ptc = createPTC(tools);
    const jsExecutor = ptc.tools.execute_javascript;

    const result = await jsExecutor.execute({
      code: 'invalid javascript syntax {'
    });

    expect(result).toContain('Execution Error:');
    expect(result).toContain('Troubleshooting Tips');
  });
});