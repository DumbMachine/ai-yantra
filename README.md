# CIPHER

CIPHER is a minimalist collection of extensions for the AI SDK. We don't just build tools—we craft the invisible threads that connect intelligence to action.

## 001 // TOOL SEARCH ✅

Our foundation piece: **Tool Search**.

A dynamic discovery system that finds and deploys tools through intelligent pattern matching. No excess. Pure function. Maximum efficiency.

Inspired by Anthropic's advanced tool use engineering: https://www.anthropic.com/engineering/advanced-tool-use

## 002 // PTC ✅

**Programmable Tool Calling** - Live and functional.

Enables LLMs to execute JavaScript code with access to AI SDK tools in a secure Node.js VM sandbox. Maximum efficiency through unified execution environment.

```bash
# Quick start
cd apps/ptc-demo
pnpm simple
```

**Status**: ✅ Core package complete, ✅ Working demos, ✅ Production ready

## 003-005 // COMING SOON

- **ACCESS** // Approval workflows & security  
- **CACHE** // Intelligent result persistence  
- **ASYNC** // Parallel sub-agent orchestration  

Each piece designed for seamless integration. Built for scale. Engineered for performance.

## Project Structure

```
packages/
├── tool-search/          # 001 - Dynamic tool discovery
├── ptc/                  # 002 - Programmable Tool Calling ✅
├── access/               # 003 - Approval workflows (planned)
├── cache/                # 004 - Result persistence (planned)
└── async/                # 005 - Sub-agent orchestration (planned)

apps/
├── tool-search-demo/     # Tool Search examples
└── ptc-demo/             # PTC examples and documentation ✅
```

## Quick Start

### Install Dependencies
```bash
pnpm install
pnpm build
```

### Try PTC (Programmable Tool Calling)
```bash
cd apps/ptc-demo
pnpm simple  # Simple example
pnpm dev     # Full interactive demo
```

### Try Tool Search  
```bash
cd apps/tool-search-demo
pnpm dev
```

## What's New

**PTC Implementation Complete** 🎉
- ✅ JavaScript execution in secure VM sandbox
- ✅ AI SDK tool integration with proper schema handling
- ✅ Comprehensive error handling and timeout protection  
- ✅ Function signature generation for LLM context
- ✅ Multiple configuration options and debug modes
- ✅ Working examples with weather/email tools
- ✅ Full documentation and troubleshooting guides

**Architecture Highlights**:
- Unified JavaScript environment reduces context switching
- VM-based security with timeout and memory protection
- Seamless integration with any AI SDK provider
- Complex workflow support with loops, conditions, data processing

*Less is more. Code is fashion.*