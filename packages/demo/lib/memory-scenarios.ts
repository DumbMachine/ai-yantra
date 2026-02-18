import type { DemoScenario } from "@/components/ai-elements/scenario-card";

export const memoryScenarios: DemoScenario[] = [
	{
		id: "setup-preferences",
		title: "Set up my dev environment",
		description:
			"Teaches the agent your coding preferences, stack, and workflow so it remembers across sessions",
		badge: "Session 1",
		message: `Hey! I want to get you set up with my preferences so you remember them going forward. Here's what I like:

- I always use TypeScript, never plain JavaScript
- My go-to stack is React 19 + Next.js 15 with the App Router
- For styling I use Tailwind CSS v4, no CSS modules
- Testing: vitest for unit tests, playwright for e2e
- Package manager: pnpm, never npm or yarn
- I prefer functional components with hooks, no class components
- For state management I use Zustand over Redux
- My editor is VS Code with vim keybindings
- I like concise code — no unnecessary comments, prefer self-documenting names
- Formatting: tabs for indentation, single quotes, no semicolons

Please save all of this to your memory so you can reference it in future conversations.`,
	},
	{
		id: "meeting-notes",
		title: "Log sprint planning notes",
		description:
			"Saves detailed meeting decisions and action items the agent can retrieve later",
		badge: "Session 1",
		message: `I just got out of our sprint planning meeting. Can you save these notes for me?

## Sprint 14 Planning — Feb 17, 2026

**Team**: Alex (backend), Priya (frontend), Sam (design), Jordan (PM)

**Sprint Goal**: Launch the user dashboard MVP by March 3rd.

**Key Decisions**:
1. We're going with a server-component-first approach for the dashboard — only interactive widgets will be client components
2. The analytics charts will use Recharts (not Chart.js — too heavy)
3. Auth will stay on our existing NextAuth setup, no migration to Clerk this sprint
4. API endpoints follow REST, not GraphQL — the team voted 3-1
5. Sam is delivering the Figma mocks by Wednesday EOD

**Action Items**:
- [ ] Alex: Set up the /api/dashboard/stats endpoint by Thursday
- [ ] Priya: Build the DashboardLayout shell component by Wednesday
- [ ] Priya: Integrate Recharts for the activity graph by Friday
- [ ] Jordan: Write acceptance criteria for the notification panel
- [ ] Sam: Finalize color palette for dark mode dashboard

**Risks**: Priya flagged that Recharts SSR support is experimental. Fallback plan is client-only rendering with a loading skeleton.

**Next standup**: Wednesday 10am

Save all of this organized in memory so I can ask about it later.`,
	},
	{
		id: "coding-help",
		title: "Help me build a custom hook",
		description:
			"A normal coding conversation — the agent naturally picks up context to remember",
		badge: "Session 2",
		message: `I'm working on a custom React hook called useDebounce that debounces a value. Here's what I need:

- It should accept a value of any type and a delay in milliseconds
- It returns the debounced value
- It should clean up the timeout on unmount
- It needs to be generic so TypeScript infers the type from the input
- Also create a useDebounceCallback variant that debounces a function instead of a value

Can you write both hooks? Make sure they follow my preferred code style. Also, write vitest tests for both hooks covering the timing behavior.`,
	},
	{
		id: "recall-context",
		title: "Continue from last session",
		description:
			"Starts a new conversation referencing earlier decisions — tests if memory kicks in automatically",
		badge: "Session 3",
		message: `Hey, picking up from where we left off. A few things:

1. What charting library did we decide on for the dashboard? I need to start the integration today and can't remember if we went with Recharts or Chart.js.

2. Priya mentioned some SSR concern with our chart choice — what was the fallback plan?

3. When is Sam supposed to deliver the Figma mocks? I want to make sure I'm not blocked.

4. Also, can you scaffold a new component for me following my usual style preferences? It's a StatCard component that displays a metric label, a big number, and a trend indicator (up/down arrow with percentage). It'll be used on the dashboard.`,
	},
];
