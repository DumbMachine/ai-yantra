// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createToolSearch } from '../index'
import { regexStrategy, bm25Strategy } from '../search'
import winkBM25 from 'wink-bm25-text-search'

describe('createToolSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default regex strategy', () => {
    const tools = {
      staticTool: { defer_loading: false, parameters: {} as any, execute: vi.fn() },
    }

    const result = createToolSearch({ tools })

    expect(result).toHaveProperty('tools')
    expect(result).toHaveProperty('prepareStep')
    expect(result).toHaveProperty('activeTools')
    expect(result.activeTools).toContain('tool_search')
    expect(result.activeTools).toContain('staticTool')
  })

  it('initializes with BM25 strategy', () => {
    const tools = {
      staticTool: { defer_loading: false, parameters: {} as any, execute: vi.fn() },
    }

    const result = createToolSearch({ tools, strategy: 'bm25' })

    expect(result.activeTools).toContain('tool_search')
  })

  it('separates static and deferred tools', () => {
    const tools = {
      staticTool: { defer_loading: false, parameters: {} as any, execute: vi.fn() },
      deferredTool: { defer_loading: true, parameters: {} as any, execute: vi.fn() },
    }

    const result = createToolSearch({ tools })

    expect(result.activeTools).toContain('staticTool')
    expect(result.activeTools).not.toContain('deferredTool')
  })

  it('customizes search tool name', () => {
    const tools = {}

    const result = createToolSearch({ tools, searchToolName: 'custom_search' })

    expect(result.activeTools).toContain('custom_search')
    expect(result.tools).toHaveProperty('custom_search')
  })

  describe('search tool execution', () => {
    it('executes search and updates active tools', async () => {
      const tools = {
        weatherTool: { description: 'Get weather', defer_loading: true, parameters: {} as any, execute: vi.fn() },
      }

      const result = createToolSearch({ tools })

      const searchTool = result.tools.tool_search
      const executeResult = await searchTool.execute({ query: 'weather' })

      expect(executeResult.message).toContain('Found 1 tools')
      expect(executeResult.tools).toHaveLength(1)
      expect(executeResult.tools[0].name).toBe('weatherTool')

      // Check prepareStep after search
      const prepareResult = await result.prepareStep({})
      expect(prepareResult.activeTools).toContain('weatherTool')
    })

    it('handles no found tools', async () => {
      const tools = {}

      const result = createToolSearch({ tools })

      const searchTool = result.tools.tool_search
      const executeResult = await searchTool.execute({ query: 'nonexistent' })

      expect(executeResult.message).toContain('Found 0 tools')
      expect(executeResult.tools).toEqual([])
    })

    it('uses BM25 strategy when specified', async () => {
      // Mock BM25 to return the tool that exists
      const mockEngine = {
        defineConfig: vi.fn(),
        addDoc: vi.fn(),
        consolidate: vi.fn(),
        search: vi.fn(() => [{ id: 'bm25Tool' }]),
      }
      ;(winkBM25 as any).mockReturnValue(mockEngine)

      const tools = {
        bm25Tool: { description: 'BM25 tool', defer_loading: true, parameters: {} as any, execute: vi.fn() },
      }

      const result = createToolSearch({ tools, strategy: 'bm25' })

      const searchTool = result.tools.tool_search
      await searchTool.execute({ query: 'tool' })

      expect(mockEngine.search).toHaveBeenCalledWith('tool', 5)
    })
  })

  describe('prepareStep', () => {
    it('returns active tools including discovered ones', async () => {
    const tools = {
      staticTool: { defer_loading: false, parameters: {} as any, execute: vi.fn() },
      deferredTool: { defer_loading: true, parameters: {} as any, execute: vi.fn() },
    }

      const result = createToolSearch({ tools })

      // Simulate search finding deferredTool
      result.tools.tool_search.execute({ query: 'deferred' })

      const prepareResult = await result.prepareStep({})
      expect(prepareResult.activeTools).toContain('staticTool')
      expect(prepareResult.activeTools).toContain('tool_search')
      expect(prepareResult.activeTools).toContain('deferredTool')
    })

    it('handles empty activeTools parameter', async () => {
      const tools = {}

      const result = createToolSearch({ tools })

      const prepareResult = await result.prepareStep({})
      expect(prepareResult.activeTools).toEqual(['tool_search'])
    })
  })

  it('returns merged tools object', () => {
    const tools = {
      userTool: { description: 'User tool', parameters: {} as any, execute: vi.fn() },
    }

    const result = createToolSearch({ tools })

    expect(result.tools).toHaveProperty('userTool')
    expect(result.tools).toHaveProperty('tool_search')
  })
})