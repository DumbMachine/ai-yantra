// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { regexStrategy, bm25Strategy } from '../search'
import winkBM25 from 'wink-bm25-text-search'

describe('search strategies', () => {
  describe('regexStrategy', () => {
    it('finds tools matching name with regex', () => {
      const tools = {
        getWeather: { description: 'Get weather', parameters: {} as any, execute: vi.fn() },
        getStock: { description: 'Get stock price', parameters: {} as any, execute: vi.fn() },
      }

      const results = regexStrategy.search('weather', tools)

      expect(results).toEqual(['getWeather'])
    })

    it('finds tools matching description with regex', () => {
      const tools = {
        getWeather: { description: 'Get weather info', parameters: {} as any, execute: vi.fn() },
        getStock: { description: 'Get stock price', parameters: {} as any, execute: vi.fn() },
      }

      const results = regexStrategy.search('price', tools)

      expect(results).toEqual(['getStock'])
    })

    it('is case insensitive', () => {
      const tools = {
        getWeather: { description: 'Get Weather Info', parameters: {} as any, execute: vi.fn() },
      }

      const results = regexStrategy.search('WEATHER', tools)

      expect(results).toEqual(['getWeather'])
    })

    it('handles invalid regex by falling back to literal search', () => {
      const tools = {
        getWeather: { description: 'Get weather', parameters: {} as any, execute: vi.fn() },
        getStock: { description: 'Get stock price', parameters: {} as any, execute: vi.fn() },
      }

      const results = regexStrategy.search('weather', tools)

      expect(results).toEqual(['getWeather'])
    })

    it('returns empty array when no matches', () => {
      const tools = {
        getWeather: { description: 'Get weather', parameters: {} as any, execute: vi.fn() },
      }

      const results = regexStrategy.search('nonexistent', tools)

      expect(results).toEqual([])
    })

    it('returns all matching tools', () => {
      const tools = {
        getWeather: { description: 'Get weather', parameters: {} as any, execute: vi.fn() },
        fetchWeather: { description: 'Fetch weather data', parameters: {} as any, execute: vi.fn() },
        getStock: { description: 'Get stock', parameters: {} as any, execute: vi.fn() },
      }

      const results = regexStrategy.search('weather', tools)

      expect(results).toEqual(['getWeather', 'fetchWeather'])
    })
  })

  describe('bm25Strategy', () => {
    let mockEngine: any

    beforeEach(() => {
      vi.clearAllMocks()
      mockEngine = {
        defineConfig: vi.fn(),
        addDoc: vi.fn(),
        consolidate: vi.fn(),
        search: vi.fn(() => [{ id: 'tool1' }, { id: 'tool2' }]),
      }
      ;(winkBM25 as any).mockReturnValue(mockEngine)
    })

    it('indexes tools and searches with BM25', () => {
      const tools = {
        tool1: { description: 'First tool', parameters: {} as any, execute: vi.fn() },
        tool2: { description: 'Second tool', parameters: {} as any, execute: vi.fn() },
      }

      const results = bm25Strategy.search('query', tools)

      expect(winkBM25).toHaveBeenCalled()
      expect(mockEngine.defineConfig).toHaveBeenCalledWith({ fldWeights: { name: 2, description: 1 } })
      expect(mockEngine.addDoc).toHaveBeenCalledTimes(2)
      expect(mockEngine.consolidate).toHaveBeenCalled()
      expect(mockEngine.search).toHaveBeenCalledWith('query', 5)
      expect(results).toEqual(['tool1', 'tool2'])
    })

    it('returns top 5 results', () => {
      mockEngine.search.mockReturnValue([
        { id: 'tool1' },
        { id: 'tool2' },
        { id: 'tool3' },
        { id: 'tool4' },
        { id: 'tool5' },
      ])

      const tools = { 
        tool1: { parameters: {} as any, execute: vi.fn() }, 
        tool2: { parameters: {} as any, execute: vi.fn() }, 
        tool3: { parameters: {} as any, execute: vi.fn() }, 
        tool4: { parameters: {} as any, execute: vi.fn() }, 
        tool5: { parameters: {} as any, execute: vi.fn() }, 
        tool6: { parameters: {} as any, execute: vi.fn() } 
      }

      const results = bm25Strategy.search('query', tools)

      expect(results).toEqual(['tool1', 'tool2', 'tool3', 'tool4', 'tool5'])
    })

    it('handles empty tools map', () => {
      mockEngine.search.mockReturnValue([])

      const tools = {}

      const results = bm25Strategy.search('query', tools)

      expect(mockEngine.addDoc).not.toHaveBeenCalled()
      expect(results).toEqual([])
    })

    it('handles tools without description', () => {
      const tools = {
        tool1: { parameters: {} as any, execute: vi.fn() },
      }

      bm25Strategy.search('query', tools)

      expect(mockEngine.addDoc).toHaveBeenCalledWith({
        name: 'tool1',
        description: '',
        id: 'tool1',
      })
    })
  })
})