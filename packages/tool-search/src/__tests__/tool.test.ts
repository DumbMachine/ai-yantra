// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tool } from '../tool'
import { tool as aiTool } from 'ai'

describe('tool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a tool with defer_loading set to true', () => {
    const options = {
      description: 'Test tool',
      parameters: {} as any,
      execute: vi.fn(),
      defer_loading: true,
    }

    const result = tool(options)

    expect(aiTool).toHaveBeenCalledWith(options)
    expect(result).toHaveProperty('defer_loading', true)
    expect(result.description).toBe('Test tool')
  })

  it('creates a tool with defer_loading set to false', () => {
    const options = {
      description: 'Test tool',
      parameters: {} as any,
      execute: vi.fn(),
      defer_loading: false,
    }

    const result = tool(options)

    expect(aiTool).toHaveBeenCalledWith(options)
    expect(result).toHaveProperty('defer_loading', false)
  })

  it('creates a tool without defer_loading option', () => {
    const options = {
      description: 'Test tool',
      parameters: {} as any,
      execute: vi.fn(),
    }

    const result = tool(options)

    expect(aiTool).toHaveBeenCalledWith({ ...options, defer_loading: undefined })
    expect(result.defer_loading).toBeUndefined()
  })

  it('preserves all other options', () => {
    const options = {
      description: 'Test tool',
      parameters: { type: 'object' } as any,
      execute: vi.fn(),
      defer_loading: true,
    }

    const result = tool(options)

    expect(result.description).toBe('Test tool')
    expect(result.parameters).toEqual({ type: 'object' })
    expect(result.execute).toBe(options.execute)
  })
})