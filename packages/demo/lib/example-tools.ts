import { tool } from "@yantra/tool-search";
import { z } from "zod";

// ====================================================================
// GITHUB TOOLS (~15 tools)
// ====================================================================

export const githubSearchRepositories = tool({
	description:
		"Search for GitHub repositories by name, description, or topic. Use this to find repos matching specific criteria.",
	inputSchema: z.object({
		query: z.string().describe("Search query for repositories"),
		language: z.string().optional().describe("Filter by programming language"),
	}),
	execute: async ({ query, language }) => {
		return {
			success: true,
			repositories: [
				{
					name: "example-repo",
					owner: "example-user",
					description: `Repository matching "${query}"`,
					language: language || "TypeScript",
					stars: 1234,
				},
			],
		};
	},
	defer_loading: false, // Static tool
});

export const githubGetUser = tool({
	description:
		"Get detailed GitHub user profile information including bio, followers, and repositories.".repeat(
			1000,
		),
	inputSchema: z.object({
		username: z.string().describe("GitHub username to fetch"),
	}),
	execute: async ({ username }) => {
		return {
			success: true,
			user: {
				username,
				name: "Example User",
				bio: "Software developer",
				followers: 500,
				following: 200,
				public_repos: 50,
			},
		};
	},
	defer_loading: false, // Static tool
});

export const githubListPullRequests = tool({
	description:
		"List all pull requests in a GitHub repository. Filter by state (open, closed, all).",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		state: z.enum(["open", "closed", "all"]).default("open"),
	}),
	execute: async ({ owner, repo, state }) => {
		return {
			success: true,
			pull_requests: [
				{
					number: 42,
					title: "Add new feature",
					state,
					author: "contributor",
					created_at: "2024-01-15",
				},
			],
		};
	},
	defer_loading: true,
});

export const githubCreateIssue = tool({
	description:
		"Create a new issue in a GitHub repository with title, description, and labels.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		title: z.string().describe("Issue title"),
		body: z.string().describe("Issue description"),
		labels: z.array(z.string()).optional().describe("Issue labels"),
	}),
	execute: async ({ owner, repo, title, body, labels }) => {
		return {
			success: true,
			issue: {
				number: 123,
				title,
				body,
				labels: labels || [],
				state: "open",
				url: `https://github.com/${owner}/${repo}/issues/123`,
			},
		};
	},
	defer_loading: true,
});

export const githubGetIssue = tool({
	description:
		"Get detailed information about a specific GitHub issue including comments and status.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		issue_number: z.number().describe("Issue number"),
	}),
	execute: async ({ owner, repo, issue_number }) => {
		return {
			success: true,
			issue: {
				number: issue_number,
				title: "Example Issue",
				body: "Issue description",
				state: "open",
				comments: 5,
			},
		};
	},
	defer_loading: true,
});

export const githubUpdateIssue = tool({
	description:
		"Update an existing GitHub issue's title, body, state, or labels.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		issue_number: z.number().describe("Issue number"),
		title: z.string().optional(),
		body: z.string().optional(),
		state: z.enum(["open", "closed"]).optional(),
	}),
	execute: async ({ owner, repo, issue_number, title, body, state }) => {
		return {
			success: true,
			updated: { issue_number, title, body, state },
		};
	},
	defer_loading: true,
});

export const githubListCommits = tool({
	description:
		"List commits in a GitHub repository with author, message, and timestamp information.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		branch: z.string().optional().describe("Branch name"),
	}),
	execute: async ({ owner, repo, branch }) => {
		return {
			success: true,
			commits: [
				{
					sha: "abc123",
					message: "Fix bug in authentication",
					author: "dev-user",
					date: "2024-01-20",
				},
			],
		};
	},
	defer_loading: true,
});

export const githubGetCommit = tool({
	description:
		"Get detailed information about a specific commit including changes and diff.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		sha: z.string().describe("Commit SHA"),
	}),
	execute: async ({ owner, repo, sha }) => {
		return {
			success: true,
			commit: {
				sha,
				message: "Commit message",
				author: "developer",
				files_changed: 3,
			},
		};
	},
	defer_loading: true,
});

export const githubCreatePullRequest = tool({
	description:
		"Create a new pull request in a GitHub repository from one branch to another.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		title: z.string().describe("PR title"),
		head: z.string().describe("Source branch"),
		base: z.string().describe("Target branch"),
		body: z.string().optional().describe("PR description"),
	}),
	execute: async ({ owner, repo, title, head, base, body }) => {
		return {
			success: true,
			pull_request: {
				number: 456,
				title,
				head,
				base,
				url: `https://github.com/${owner}/${repo}/pull/456`,
			},
		};
	},
	defer_loading: true,
});

export const githubMergePullRequest = tool({
	description:
		"Merge a pull request in a GitHub repository with optional commit message.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		pull_number: z.number().describe("Pull request number"),
		commit_message: z.string().optional(),
	}),
	execute: async ({ owner, repo, pull_number, commit_message }) => {
		return {
			success: true,
			merged: true,
			message: commit_message || "Merged pull request",
		};
	},
	defer_loading: true,
});

export const githubListBranches = tool({
	description: "List all branches in a GitHub repository.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
	}),
	execute: async ({ owner, repo }) => {
		return {
			success: true,
			branches: [
				{ name: "main", protected: true },
				{ name: "develop", protected: false },
			],
		};
	},
	defer_loading: true,
});

export const githubCreateBranch = tool({
	description:
		"Create a new branch in a GitHub repository from an existing branch.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		branch_name: z.string().describe("New branch name"),
		from_branch: z.string().describe("Source branch"),
	}),
	execute: async ({ owner, repo, branch_name, from_branch }) => {
		return {
			success: true,
			branch: { name: branch_name, created_from: from_branch },
		};
	},
	defer_loading: true,
});

export const githubListReleases = tool({
	description:
		"List all releases in a GitHub repository with version numbers and release notes.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
	}),
	execute: async ({ owner, repo }) => {
		return {
			success: true,
			releases: [
				{
					tag_name: "v1.0.0",
					name: "Release 1.0.0",
					published_at: "2024-01-01",
				},
			],
		};
	},
	defer_loading: true,
});

export const githubGetWorkflowRuns = tool({
	description:
		"Get GitHub Actions workflow runs for CI/CD pipeline status and history.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		workflow_id: z.string().optional(),
	}),
	execute: async ({ owner, repo, workflow_id }) => {
		return {
			success: true,
			runs: [
				{
					id: 12345,
					status: "completed",
					conclusion: "success",
					created_at: "2024-01-20",
				},
			],
		};
	},
	defer_loading: true,
});

export const githubTriggerWorkflow = tool({
	description:
		"Trigger a GitHub Actions workflow manually with optional input parameters.",
	inputSchema: z.object({
		owner: z.string().describe("Repository owner"),
		repo: z.string().describe("Repository name"),
		workflow_id: z.string().describe("Workflow ID or filename"),
		ref: z.string().describe("Git reference (branch/tag)"),
	}),
	execute: async ({ owner, repo, workflow_id, ref }) => {
		return {
			success: true,
			message: "Workflow triggered successfully",
			workflow_id,
			ref,
		};
	},
	defer_loading: true,
});

// ====================================================================
// SLACK TOOLS (~15 tools)
// ====================================================================

export const slackSearchMessages = tool({
	description:
		"Search for messages across all Slack channels using keywords or phrases.",
	inputSchema: z.object({
		query: z.string().describe("Search query"),
		channel: z.string().optional().describe("Limit to specific channel"),
	}),
	execute: async ({ query, channel }) => {
		return {
			success: true,
			messages: [
				{
					text: `Message containing "${query}"`,
					user: "user123",
					channel: channel || "general",
					timestamp: "2024-01-20T10:30:00Z",
				},
			],
		};
	},
	defer_loading: false, // Static tool
});

export const slackSendMessage = tool({
	description: "Send a message to a Slack channel or direct message to a user.",
	inputSchema: z.object({
		channel: z.string().describe("Channel ID or name"),
		text: z.string().describe("Message text"),
		thread_ts: z.string().optional().describe("Thread timestamp for replies"),
	}),
	execute: async ({ channel, text, thread_ts }) => {
		return {
			success: true,
			message: {
				channel,
				text,
				ts: "1234567890.123456",
				thread_ts,
			},
		};
	},
	defer_loading: true,
});

export const slackListChannels = tool({
	description:
		"List all Slack channels in the workspace including public and private channels.",
	inputSchema: z.object({
		exclude_archived: z.boolean().optional().default(true),
	}),
	execute: async ({ exclude_archived }) => {
		return {
			success: true,
			channels: [
				{ id: "C123", name: "general", is_private: false },
				{ id: "C456", name: "engineering", is_private: false },
			],
		};
	},
	defer_loading: true,
});

export const slackGetChannelInfo = tool({
	description:
		"Get detailed information about a Slack channel including members and purpose.",
	inputSchema: z.object({
		channel: z.string().describe("Channel ID"),
	}),
	execute: async ({ channel }) => {
		return {
			success: true,
			channel: {
				id: channel,
				name: "engineering",
				purpose: "Engineering discussions",
				num_members: 25,
			},
		};
	},
	defer_loading: true,
});

export const slackCreateChannel = tool({
	description:
		"Create a new Slack channel with specified name and privacy setting.",
	inputSchema: z.object({
		name: z.string().describe("Channel name"),
		is_private: z.boolean().optional().default(false),
	}),
	execute: async ({ name, is_private }) => {
		return {
			success: true,
			channel: { id: "C789", name, is_private },
		};
	},
	defer_loading: true,
});

export const slackInviteToChannel = tool({
	description: "Invite users to a Slack channel by user IDs.",
	inputSchema: z.object({
		channel: z.string().describe("Channel ID"),
		users: z.array(z.string()).describe("Array of user IDs"),
	}),
	execute: async ({ channel, users }) => {
		return {
			success: true,
			message: `Invited ${users.length} users to channel`,
		};
	},
	defer_loading: true,
});

export const slackGetUserProfile = tool({
	description:
		"Get Slack user profile information including name, email, and status.",
	inputSchema: z.object({
		user_id: z.string().describe("User ID"),
	}),
	execute: async ({ user_id }) => {
		return {
			success: true,
			user: {
				id: user_id,
				name: "John Doe",
				email: "john@example.com",
				title: "Software Engineer",
			},
		};
	},
	defer_loading: true,
});

export const slackSetUserStatus = tool({
	description: "Set your Slack status message and emoji.",
	inputSchema: z.object({
		status_text: z.string().describe("Status message"),
		status_emoji: z.string().describe("Status emoji"),
		status_expiration: z.number().optional().describe("Unix timestamp"),
	}),
	execute: async ({ status_text, status_emoji, status_expiration }) => {
		return {
			success: true,
			status: { text: status_text, emoji: status_emoji },
		};
	},
	defer_loading: true,
});

export const slackUploadFile = tool({
	description: "Upload a file to Slack channel or direct message.",
	inputSchema: z.object({
		channels: z.array(z.string()).describe("Channel IDs"),
		filename: z.string().describe("Filename"),
		title: z.string().optional().describe("File title"),
	}),
	execute: async ({ channels, filename, title }) => {
		return {
			success: true,
			file: { id: "F123", filename, title, channels },
		};
	},
	defer_loading: true,
});

export const slackGetThreadReplies = tool({
	description: "Get all replies in a Slack message thread.",
	inputSchema: z.object({
		channel: z.string().describe("Channel ID"),
		thread_ts: z.string().describe("Thread timestamp"),
	}),
	execute: async ({ channel, thread_ts }) => {
		return {
			success: true,
			messages: [
				{
					text: "Reply in thread",
					user: "user456",
					ts: "1234567890.123457",
				},
			],
		};
	},
	defer_loading: true,
});

export const slackAddReaction = tool({
	description: "Add an emoji reaction to a Slack message.",
	inputSchema: z.object({
		channel: z.string().describe("Channel ID"),
		timestamp: z.string().describe("Message timestamp"),
		emoji: z.string().describe("Emoji name without colons"),
	}),
	execute: async ({ channel, timestamp, emoji }) => {
		return {
			success: true,
			message: `Added :${emoji}: reaction`,
		};
	},
	defer_loading: true,
});

export const slackPinMessage = tool({
	description: "Pin a message to a Slack channel for easy access.",
	inputSchema: z.object({
		channel: z.string().describe("Channel ID"),
		timestamp: z.string().describe("Message timestamp"),
	}),
	execute: async ({ channel, timestamp }) => {
		return {
			success: true,
			message: "Message pinned successfully",
		};
	},
	defer_loading: true,
});

export const slackScheduleMessage = tool({
	description: "Schedule a Slack message to be sent at a specific time.",
	inputSchema: z.object({
		channel: z.string().describe("Channel ID"),
		text: z.string().describe("Message text"),
		post_at: z.number().describe("Unix timestamp"),
	}),
	execute: async ({ channel, text, post_at }) => {
		return {
			success: true,
			scheduled_message_id: "Q123",
			post_at,
		};
	},
	defer_loading: true,
});

export const slackGetChannelHistory = tool({
	description:
		"Get message history from a Slack channel with pagination support.",
	inputSchema: z.object({
		channel: z.string().describe("Channel ID"),
		limit: z.number().optional().default(100),
	}),
	execute: async ({ channel, limit }) => {
		return {
			success: true,
			messages: [
				{
					text: "Recent message",
					user: "user789",
					ts: "1234567890.123458",
				},
			],
		};
	},
	defer_loading: true,
});

export const slackArchiveChannel = tool({
	description: "Archive a Slack channel to hide it from active channels list.",
	inputSchema: z.object({
		channel: z.string().describe("Channel ID"),
	}),
	execute: async ({ channel }) => {
		return {
			success: true,
			message: "Channel archived successfully",
		};
	},
	defer_loading: true,
});

// ====================================================================
// SENTRY TOOLS (~15 tools)
// ====================================================================

export const sentrySearchIssues = tool({
	description:
		"Search for error issues in Sentry by query string, project, or environment.",
	inputSchema: z.object({
		query: z.string().describe("Search query"),
		project: z.string().optional().describe("Project slug"),
		environment: z.string().optional(),
	}),
	execute: async ({ query, project, environment }) => {
		return {
			success: true,
			issues: [
				{
					id: "123456",
					title: `Error: ${query}`,
					status: "unresolved",
					count: 42,
					users_affected: 15,
				},
			],
		};
	},
	defer_loading: false, // Static tool
});

export const sentryGetIssueDetails = tool({
	description:
		"Get comprehensive details about a Sentry issue including stack trace and breadcrumbs.",
	inputSchema: z.object({
		issue_id: z.string().describe("Sentry issue ID"),
	}),
	execute: async ({ issue_id }) => {
		return {
			success: true,
			issue: {
				id: issue_id,
				title: "TypeError: Cannot read property",
				status: "unresolved",
				first_seen: "2024-01-15T10:00:00Z",
				last_seen: "2024-01-20T15:30:00Z",
				count: 156,
			},
		};
	},
	defer_loading: true,
});

export const sentryResolveIssue = tool({
	description:
		"Mark a Sentry issue as resolved with optional resolution type and version.",
	inputSchema: z.object({
		issue_id: z.string().describe("Sentry issue ID"),
		status: z.enum(["resolved", "resolvedInNextRelease"]).default("resolved"),
	}),
	execute: async ({ issue_id, status }) => {
		return {
			success: true,
			issue_id,
			status,
			message: "Issue marked as resolved",
		};
	},
	defer_loading: true,
});

export const sentryAssignIssue = tool({
	description: "Assign a Sentry issue to a team member for investigation.",
	inputSchema: z.object({
		issue_id: z.string().describe("Sentry issue ID"),
		assignee: z.string().describe("User email or ID"),
	}),
	execute: async ({ issue_id, assignee }) => {
		return {
			success: true,
			message: `Issue assigned to ${assignee}`,
		};
	},
	defer_loading: true,
});

export const sentryGetProjectStats = tool({
	description:
		"Get error statistics for a Sentry project including event counts and trends.",
	inputSchema: z.object({
		project: z.string().describe("Project slug"),
		stat: z
			.enum(["received", "rejected", "blacklisted"])
			.optional()
			.default("received"),
	}),
	execute: async ({ project, stat }) => {
		return {
			success: true,
			project,
			stats: {
				total_events: 1234,
				unique_issues: 45,
				affected_users: 678,
			},
		};
	},
	defer_loading: true,
});

export const sentryListProjects = tool({
	description: "List all Sentry projects in the organization.",
	inputSchema: z.object({
		organization: z.string().describe("Organization slug"),
	}),
	execute: async ({ organization }) => {
		return {
			success: true,
			projects: [
				{
					slug: "web-app",
					name: "Web Application",
					platform: "javascript",
				},
				{ slug: "api", name: "API Service", platform: "python" },
			],
		};
	},
	defer_loading: true,
});

export const sentryGetReleaseInfo = tool({
	description:
		"Get information about a specific Sentry release including deploy status.",
	inputSchema: z.object({
		organization: z.string().describe("Organization slug"),
		version: z.string().describe("Release version"),
	}),
	execute: async ({ organization, version }) => {
		return {
			success: true,
			release: {
				version,
				date_created: "2024-01-20T10:00:00Z",
				new_issues: 5,
				total_issues: 15,
			},
		};
	},
	defer_loading: true,
});

export const sentryCreateRelease = tool({
	description: "Create a new release in Sentry for tracking deployments.",
	inputSchema: z.object({
		organization: z.string().describe("Organization slug"),
		version: z.string().describe("Release version"),
		projects: z.array(z.string()).describe("Project slugs"),
	}),
	execute: async ({ organization, version, projects }) => {
		return {
			success: true,
			release: { version, projects, created_at: new Date().toISOString() },
		};
	},
	defer_loading: true,
});

export const sentryListEvents = tool({
	description:
		"List error events for a Sentry issue with detailed event information.",
	inputSchema: z.object({
		issue_id: z.string().describe("Sentry issue ID"),
		limit: z.number().optional().default(50),
	}),
	execute: async ({ issue_id, limit }) => {
		return {
			success: true,
			events: [
				{
					event_id: "abc123",
					timestamp: "2024-01-20T15:30:00Z",
					platform: "javascript",
				},
			],
		};
	},
	defer_loading: true,
});

export const sentryGetEventDetails = tool({
	description:
		"Get full details of a specific error event including stack trace and context.",
	inputSchema: z.object({
		project: z.string().describe("Project slug"),
		event_id: z.string().describe("Event ID"),
	}),
	execute: async ({ project, event_id }) => {
		return {
			success: true,
			event: {
				id: event_id,
				message: "TypeError occurred",
				platform: "javascript",
				user: { email: "user@example.com" },
			},
		};
	},
	defer_loading: true,
});

export const sentryUpdateIssueTags = tool({
	description:
		"Update tags on a Sentry issue for better organization and filtering.",
	inputSchema: z.object({
		issue_id: z.string().describe("Sentry issue ID"),
		tags: z.record(z.string()).describe("Tag key-value pairs"),
	}),
	execute: async ({ issue_id, tags }) => {
		return {
			success: true,
			message: "Tags updated successfully",
			tags,
		};
	},
	defer_loading: true,
});

export const sentryGetTeamIssues = tool({
	description: "Get all issues assigned to a specific Sentry team.",
	inputSchema: z.object({
		organization: z.string().describe("Organization slug"),
		team: z.string().describe("Team slug"),
	}),
	execute: async ({ organization, team }) => {
		return {
			success: true,
			issues: [
				{ id: "111", title: "Database connection error", status: "unresolved" },
			],
		};
	},
	defer_loading: true,
});

export const sentryIgnoreIssue = tool({
	description:
		"Ignore a Sentry issue to hide it from default views until conditions change.",
	inputSchema: z.object({
		issue_id: z.string().describe("Sentry issue ID"),
		ignore_duration: z.number().optional().describe("Minutes to ignore"),
	}),
	execute: async ({ issue_id, ignore_duration }) => {
		return {
			success: true,
			message: "Issue ignored",
			until: ignore_duration
				? new Date(Date.now() + ignore_duration * 60000).toISOString()
				: "forever",
		};
	},
	defer_loading: true,
});

export const sentryDeleteIssue = tool({
	description: "Permanently delete a Sentry issue and all its events.",
	inputSchema: z.object({
		issue_id: z.string().describe("Sentry issue ID"),
	}),
	execute: async ({ issue_id }) => {
		return {
			success: true,
			message: "Issue deleted successfully",
		};
	},
	defer_loading: true,
});

export const sentryGetProjectAlerts = tool({
	description: "Get alert rules configured for a Sentry project.",
	inputSchema: z.object({
		organization: z.string().describe("Organization slug"),
		project: z.string().describe("Project slug"),
	}),
	execute: async ({ organization, project }) => {
		return {
			success: true,
			alerts: [
				{
					id: "alert-1",
					name: "High error rate",
					conditions: "errors > 100/hour",
				},
			],
		};
	},
	defer_loading: true,
});

// ====================================================================
// GRAFANA TOOLS (~15 tools)
// ====================================================================

export const grafanaSearchDashboards = tool({
	description:
		"Search for Grafana dashboards by name, tag, or folder. Find monitoring dashboards quickly.",
	inputSchema: z.object({
		query: z.string().describe("Search query"),
		tag: z.string().optional().describe("Filter by tag"),
	}),
	execute: async ({ query, tag }) => {
		return {
			success: true,
			dashboards: [
				{
					id: 1,
					uid: "abc123",
					title: `Dashboard matching "${query}"`,
					tags: tag ? [tag] : ["monitoring"],
				},
			],
		};
	},
	defer_loading: false, // Static tool
});

export const grafanaGetDashboard = tool({
	description:
		"Get a specific Grafana dashboard by UID including all panels and settings.",
	inputSchema: z.object({
		uid: z.string().describe("Dashboard UID"),
	}),
	execute: async ({ uid }) => {
		return {
			success: true,
			dashboard: {
				uid,
				title: "System Metrics",
				panels: 12,
				tags: ["system", "metrics"],
			},
		};
	},
	defer_loading: true,
});

export const grafanaCreateDashboard = tool({
	description: "Create a new Grafana dashboard with panels and configuration.",
	inputSchema: z.object({
		title: z.string().describe("Dashboard title"),
		tags: z.array(z.string()).optional(),
		folder_id: z.number().optional(),
	}),
	execute: async ({ title, tags, folder_id }) => {
		return {
			success: true,
			dashboard: {
				uid: "new-dash-123",
				title,
				tags,
				folder_id,
				url: "/d/new-dash-123",
			},
		};
	},
	defer_loading: true,
});

export const grafanaUpdateDashboard = tool({
	description: "Update an existing Grafana dashboard's settings or panels.",
	inputSchema: z.object({
		uid: z.string().describe("Dashboard UID"),
		title: z.string().optional(),
		tags: z.array(z.string()).optional(),
	}),
	execute: async ({ uid, title, tags }) => {
		return {
			success: true,
			message: "Dashboard updated successfully",
			uid,
		};
	},
	defer_loading: true,
});

export const grafanaDeleteDashboard = tool({
	description: "Delete a Grafana dashboard permanently.",
	inputSchema: z.object({
		uid: z.string().describe("Dashboard UID"),
	}),
	execute: async ({ uid }) => {
		return {
			success: true,
			message: "Dashboard deleted",
		};
	},
	defer_loading: true,
});

export const grafanaGetDatasources = tool({
	description:
		"List all configured datasources in Grafana including Prometheus, Elasticsearch, etc.",
	inputSchema: z.object({}),
	execute: async () => {
		return {
			success: true,
			datasources: [
				{ id: 1, name: "Prometheus", type: "prometheus" },
				{ id: 2, name: "Elasticsearch", type: "elasticsearch" },
			],
		};
	},
	defer_loading: true,
});

export const grafanaQueryMetrics = tool({
	description:
		"Query metrics data from a Grafana datasource with PromQL or similar query language.",
	inputSchema: z.object({
		datasource_id: z.number().describe("Datasource ID"),
		query: z.string().describe("Query expression"),
		from: z.string().optional().describe("Start time"),
		to: z.string().optional().describe("End time"),
	}),
	execute: async ({ datasource_id, query, from, to }) => {
		return {
			success: true,
			results: [
				{
					metric: "cpu_usage",
					values: [[1705756800, "45.5"]],
				},
			],
		};
	},
	defer_loading: true,
});

export const grafanaCreateAlert = tool({
	description: "Create a new alert rule in Grafana for monitoring conditions.",
	inputSchema: z.object({
		title: z.string().describe("Alert rule title"),
		condition: z.string().describe("Alert condition"),
		folder_uid: z.string().optional(),
	}),
	execute: async ({ title, condition, folder_uid }) => {
		return {
			success: true,
			alert: { uid: "alert-123", title, condition },
		};
	},
	defer_loading: true,
});

export const grafanaListAlerts = tool({
	description: "List all alert rules in Grafana with their current states.",
	inputSchema: z.object({
		state: z.enum(["alerting", "ok", "pending", "nodata"]).optional(),
	}),
	execute: async ({ state }) => {
		return {
			success: true,
			alerts: [
				{
					uid: "alert-1",
					title: "High CPU Usage",
					state: state || "alerting",
				},
			],
		};
	},
	defer_loading: true,
});

export const grafanaGetAlertState = tool({
	description: "Get the current state and history of a specific alert rule.",
	inputSchema: z.object({
		alert_uid: z.string().describe("Alert rule UID"),
	}),
	execute: async ({ alert_uid }) => {
		return {
			success: true,
			alert: {
				uid: alert_uid,
				state: "alerting",
				last_evaluation: "2024-01-20T15:30:00Z",
			},
		};
	},
	defer_loading: true,
});

export const grafanaCreateAnnotation = tool({
	description:
		"Create an annotation in Grafana to mark events on dashboard graphs.",
	inputSchema: z.object({
		text: z.string().describe("Annotation text"),
		tags: z.array(z.string()).optional(),
		time: z.number().optional().describe("Unix timestamp"),
	}),
	execute: async ({ text, tags, time }) => {
		return {
			success: true,
			annotation: {
				id: 789,
				text,
				tags,
				time: time || Date.now(),
			},
		};
	},
	defer_loading: true,
});

export const grafanaListFolders = tool({
	description: "List all dashboard folders in Grafana for organization.",
	inputSchema: z.object({}),
	execute: async () => {
		return {
			success: true,
			folders: [
				{ id: 1, uid: "folder-1", title: "Production" },
				{ id: 2, uid: "folder-2", title: "Development" },
			],
		};
	},
	defer_loading: true,
});

export const grafanaCreateFolder = tool({
	description: "Create a new folder in Grafana to organize dashboards.",
	inputSchema: z.object({
		title: z.string().describe("Folder title"),
	}),
	execute: async ({ title }) => {
		return {
			success: true,
			folder: { id: 10, uid: "new-folder", title },
		};
	},
	defer_loading: true,
});

export const grafanaGetOrganization = tool({
	description: "Get information about the current Grafana organization.",
	inputSchema: z.object({}),
	execute: async () => {
		return {
			success: true,
			organization: {
				id: 1,
				name: "Main Org",
				users: 25,
			},
		};
	},
	defer_loading: true,
});

export const grafanaSnapshotDashboard = tool({
	description:
		"Create a shareable snapshot of a Grafana dashboard for external viewing.",
	inputSchema: z.object({
		dashboard_uid: z.string().describe("Dashboard UID"),
		expires: z.number().optional().describe("Expiration in seconds"),
	}),
	execute: async ({ dashboard_uid, expires }) => {
		return {
			success: true,
			snapshot: {
				key: "snapshot-abc123",
				url: "https://grafana.example.com/dashboard/snapshot/snapshot-abc123",
				expires_at: expires ? Date.now() + expires * 1000 : null,
			},
		};
	},
	defer_loading: true,
});

// ====================================================================
// EXPORT ALL TOOLS
// ====================================================================

export const allTools = {
	// GitHub tools
	github_search_repositories: githubSearchRepositories,
	github_get_user: githubGetUser,
	github_list_pull_requests: githubListPullRequests,
	github_create_issue: githubCreateIssue,
	github_get_issue: githubGetIssue,
	github_update_issue: githubUpdateIssue,
	github_list_commits: githubListCommits,
	github_get_commit: githubGetCommit,
	github_create_pull_request: githubCreatePullRequest,
	github_merge_pull_request: githubMergePullRequest,
	github_list_branches: githubListBranches,
	github_create_branch: githubCreateBranch,
	github_list_releases: githubListReleases,
	github_get_workflow_runs: githubGetWorkflowRuns,
	github_trigger_workflow: githubTriggerWorkflow,

	// Slack tools
	slack_search_messages: slackSearchMessages,
	slack_send_message: slackSendMessage,
	slack_list_channels: slackListChannels,
	slack_get_channel_info: slackGetChannelInfo,
	slack_create_channel: slackCreateChannel,
	slack_invite_to_channel: slackInviteToChannel,
	slack_get_user_profile: slackGetUserProfile,
	slack_set_user_status: slackSetUserStatus,
	slack_upload_file: slackUploadFile,
	slack_get_thread_replies: slackGetThreadReplies,
	slack_add_reaction: slackAddReaction,
	slack_pin_message: slackPinMessage,
	slack_schedule_message: slackScheduleMessage,
	slack_get_channel_history: slackGetChannelHistory,
	slack_archive_channel: slackArchiveChannel,

	// Sentry tools
	sentry_search_issues: sentrySearchIssues,
	sentry_get_issue_details: sentryGetIssueDetails,
	sentry_resolve_issue: sentryResolveIssue,
	sentry_assign_issue: sentryAssignIssue,
	sentry_get_project_stats: sentryGetProjectStats,
	sentry_list_projects: sentryListProjects,
	sentry_get_release_info: sentryGetReleaseInfo,
	sentry_create_release: sentryCreateRelease,
	sentry_list_events: sentryListEvents,
	sentry_get_event_details: sentryGetEventDetails,
	sentry_update_issue_tags: sentryUpdateIssueTags,
	sentry_get_team_issues: sentryGetTeamIssues,
	sentry_ignore_issue: sentryIgnoreIssue,
	sentry_delete_issue: sentryDeleteIssue,
	sentry_get_project_alerts: sentryGetProjectAlerts,

	// Grafana tools
	grafana_search_dashboards: grafanaSearchDashboards,
	grafana_get_dashboard: grafanaGetDashboard,
	grafana_create_dashboard: grafanaCreateDashboard,
	grafana_update_dashboard: grafanaUpdateDashboard,
	grafana_delete_dashboard: grafanaDeleteDashboard,
	grafana_get_datasources: grafanaGetDatasources,
	grafana_query_metrics: grafanaQueryMetrics,
	grafana_create_alert: grafanaCreateAlert,
	grafana_list_alerts: grafanaListAlerts,
	grafana_get_alert_state: grafanaGetAlertState,
	grafana_create_annotation: grafanaCreateAnnotation,
	grafana_list_folders: grafanaListFolders,
	grafana_create_folder: grafanaCreateFolder,
	grafana_get_organization: grafanaGetOrganization,
	grafana_snapshot_dashboard: grafanaSnapshotDashboard,
};

// Export tool count for context pollution metrics
export const TOTAL_TOOLS = Object.keys(allTools).length;
export const STATIC_TOOLS = Object.values(allTools).filter(
	(t) => !t.defer_loading,
).length;
