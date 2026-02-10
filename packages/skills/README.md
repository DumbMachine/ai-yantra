# agent-skills

Skill discovery and loading for AI SDK agents. File-based (`~/.skills`) or virtual (in-memory).

## Install

```bash
npm install agent-skills
```

## Quick Start

```typescript
import { Skills } from 'agent-skills';

const skills = await Skills.create({
  directories: ['~/.skills'],       // scan for file-based skills
  definitions: [                     // or define virtual skills inline
    {
      name: 'summarizer',
      description: 'Summarize documents',
      content: 'You summarize documents concisely...',
    },
  ],
});

// Use with AI SDK
const agent = new ToolLoopAgent({
  model: openai('gpt-4'),
  instructions: skills.buildPrompt(),
  tools: { ...skills.tools, ...otherTools },
});
```

## Skill File Format

Skills live in directories with a `SKILL.md` file:

```
~/.skills/
├── git-helper/
│   ├── SKILL.md
│   └── scripts/setup.sh     # bundled files, readable by agent
└── code-review/
    └── SKILL.md
```

`SKILL.md` uses YAML frontmatter:

```markdown
---
name: git-helper
description: Helps with common git workflows
allowed-tools: Bash(git:*) Read
metadata:
  author: me
---

# Instructions

Your skill body goes here. This is what the agent sees when it loads the skill.
```

**Name rules:** lowercase alphanumeric + hyphens, 1-64 chars, no leading/trailing/consecutive hyphens.

## API

### Factory Methods

```typescript
// File-based + virtual (recommended)
const skills = await Skills.create({ directories, definitions })

// Virtual only (sync)
const skills = Skills.fromDefinitions(definitions)

// File-based from explicit paths
const skills = await Skills.fromPaths(['/path/to/skill-dir'])
```

### Instance

```typescript
skills.skills    // ResolvedSkill[] — all loaded skills
skills.tools     // { loadSkill, readSkillFile } — AI SDK tools
skills.buildPrompt()  // markdown instructions listing available skills
```

### Tools Provided

- **`loadSkill`** — agent calls this to load a skill's instructions by name
- **`readSkillFile`** — agent reads bundled files from a skill (e.g. `scripts/setup.sh`)

Both do case-insensitive name matching and return helpful errors with available skill names on failure.

## Virtual Skills

For programmatic or embedded skills, skip the filesystem entirely:

```typescript
const skills = Skills.fromDefinitions([
  {
    name: 'data-analyst',
    description: 'Analyze CSV data',
    content: 'You analyze data files...',
    files: [
      { path: 'templates/report.md', content: '# Report\n...' },
    ],
  },
]);
```

File-based skills take priority over virtual skills with the same name.
