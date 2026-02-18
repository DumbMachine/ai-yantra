import type { SkillDefinition } from "@ai-yantra/skills";

export const exampleSkills: SkillDefinition[] = [
	{
		name: "api-design",
		description:
			"Design RESTful APIs following best practices. Use when the user needs help designing endpoints, request/response schemas, error handling, or API documentation.",
		content: `# API Design

## When to use this skill
Use when the user asks about:
- Designing REST API endpoints
- Request/response schema design
- API error handling patterns
- API versioning strategies
- OpenAPI/Swagger documentation

## Design Principles

1. **Use nouns for resources, not verbs**: \`/users\` not \`/getUsers\`
2. **Use HTTP methods correctly**: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)
3. **Use plural nouns**: \`/users\` not \`/user\`
4. **Nest resources for relationships**: \`/users/{id}/posts\`
5. **Use query params for filtering**: \`/users?role=admin&status=active\`

## Status Codes

| Code | Meaning | When to use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable | Semantic validation error |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Error | Server-side failure |

## Error Response Format

Always return consistent error objects. See the template at assets/error-response.json for the standard format.

## Pagination

Use cursor-based pagination for large collections. See references/pagination.md for patterns.

## Versioning

Prefer URL path versioning: \`/v1/users\`, \`/v2/users\`.
See references/versioning.md for the full comparison of strategies.`,
		files: [
			{
				path: "assets/error-response.json",
				content: JSON.stringify(
					{
						error: {
							code: "VALIDATION_ERROR",
							message: "Human-readable error message",
							details: [
								{
									field: "email",
									message: "Must be a valid email address",
									code: "INVALID_FORMAT",
								},
							],
							requestId: "req_abc123",
							timestamp: "2025-01-15T10:30:00Z",
						},
					},
					null,
					2,
				),
			},
			{
				path: "assets/openapi-template.yaml",
				content: `openapi: 3.1.0
info:
  title: API Name
  version: 1.0.0
  description: API description

servers:
  - url: https://api.example.com/v1
    description: Production

paths:
  /resources:
    get:
      summary: List resources
      parameters:
        - name: cursor
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Resource"
                  pagination:
                    $ref: "#/components/schemas/CursorPagination"
    post:
      summary: Create resource
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateResourceInput"
      responses:
        "201":
          description: Created

components:
  schemas:
    Resource:
      type: object
      properties:
        id:
          type: string
          format: uuid
        createdAt:
          type: string
          format: date-time
    CursorPagination:
      type: object
      properties:
        nextCursor:
          type: string
          nullable: true
        hasMore:
          type: boolean
    CreateResourceInput:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          maxLength: 255`,
			},
			{
				path: "references/pagination.md",
				content: `# Pagination Patterns

## Cursor-Based (Recommended)

Best for real-time data and large datasets. Stable under concurrent writes.

\`\`\`
GET /posts?cursor=eyJpZCI6MTAwfQ&limit=20
\`\`\`

Response:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTIwfQ",
    "hasMore": true
  }
}
\`\`\`

## Offset-Based

Simpler but can skip/duplicate items during concurrent writes.

\`\`\`
GET /posts?offset=40&limit=20
\`\`\`

Response:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "offset": 40,
    "limit": 20
  }
}
\`\`\`

## When to use which

| Pattern | Pros | Cons |
|---------|------|------|
| Cursor | Stable, performant | Can't jump to page N |
| Offset | Simple, jumpable | Unstable under writes |`,
			},
			{
				path: "references/versioning.md",
				content: `# API Versioning Strategies

## URL Path (Recommended)

\`\`\`
/v1/users
/v2/users
\`\`\`

Pros: Clear, easy to route, easy to deprecate
Cons: URL pollution

## Header-Based

\`\`\`
Accept: application/vnd.api.v2+json
\`\`\`

Pros: Clean URLs
Cons: Harder to test, less discoverable

## Query Parameter

\`\`\`
/users?version=2
\`\`\`

Pros: Easy to add
Cons: Optional param can cause confusion

## Recommendation

Use URL path versioning. It's the most explicit, easiest to cache, and simplest to document.
Only bump major version when making breaking changes.`,
			},
		],
	},
	{
		name: "code-review",
		description:
			"Perform thorough code reviews with structured checklists. Use when the user wants a code review, wants to check code quality, or asks about review best practices.",
		content: `# Code Review

## When to use this skill
Use when the user:
- Asks for a code review
- Wants to check code quality
- Needs review guidelines or checklists
- Asks about best practices for reviewing code

## Review Process

1. **Read the code** - Understand what it does before commenting
2. **Check correctness** - Does it do what it's supposed to?
3. **Check security** - Any vulnerabilities? (see references/security-checklist.md)
4. **Check performance** - Any obvious bottlenecks?
5. **Check maintainability** - Is it readable and well-structured?
6. **Check tests** - Are there tests? Are edge cases covered?

## Review Categories

### Critical (Must Fix)
- Security vulnerabilities (injection, XSS, auth bypass)
- Data loss risks
- Race conditions
- Memory leaks
- Broken functionality

### Important (Should Fix)
- Missing error handling
- Missing input validation
- Performance issues
- Missing tests for critical paths
- API contract violations

### Suggestions (Nice to Have)
- Naming improvements
- Code organization
- Documentation gaps
- Style consistency

## Review Template

Use the template at assets/review-template.md when structuring your review.

## Security Checklist

Always run through references/security-checklist.md for any code that handles user input, authentication, or data access.`,
		files: [
			{
				path: "assets/review-template.md",
				content: `## Code Review Summary

**PR**: [title]
**Author**: [name]
**Reviewer**: AI Assistant

### Overview
[1-2 sentence summary of what this change does]

### Correctness
- [ ] Logic is correct
- [ ] Edge cases handled
- [ ] Error handling appropriate

### Security
- [ ] No injection vulnerabilities
- [ ] Auth/authz checked
- [ ] Sensitive data not logged
- [ ] Input validated

### Performance
- [ ] No N+1 queries
- [ ] No unnecessary allocations
- [ ] Caching considered where appropriate

### Maintainability
- [ ] Code is readable
- [ ] Functions are focused (single responsibility)
- [ ] No dead code
- [ ] Types are accurate

### Tests
- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases tested

### Findings

#### Critical
[list or "None"]

#### Important
[list or "None"]

#### Suggestions
[list or "None"]`,
			},
			{
				path: "references/security-checklist.md",
				content: `# Security Review Checklist

## Input Handling
- [ ] All user input is validated
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] HTML output is escaped to prevent XSS
- [ ] File paths are sanitized (no path traversal)
- [ ] JSON parsing has size limits
- [ ] File uploads check type and size

## Authentication & Authorization
- [ ] Auth required on all protected endpoints
- [ ] Password hashing uses bcrypt/scrypt/argon2
- [ ] Tokens have expiration
- [ ] Rate limiting on auth endpoints
- [ ] Authorization checked for resource access (not just authentication)

## Data Protection
- [ ] Secrets not hardcoded
- [ ] Sensitive data not logged
- [ ] PII encrypted at rest
- [ ] HTTPS enforced
- [ ] CORS configured correctly

## Dependencies
- [ ] No known vulnerable dependencies
- [ ] Dependencies pinned to specific versions
- [ ] Lock file committed

## Error Handling
- [ ] Internal errors don't leak stack traces to client
- [ ] Error messages don't reveal system internals
- [ ] Failed auth returns generic message (not "user not found" vs "wrong password")`,
			},
		],
	},
	{
		name: "git-workflow",
		description:
			"Git branching strategies, commit conventions, and release workflows. Use when the user needs help with git branching, commit messages, merge strategies, or release processes.",
		content: `# Git Workflow

## When to use this skill
Use when the user asks about:
- Git branching strategies
- Commit message conventions
- Merge vs rebase workflows
- Release processes
- Git hooks or automation

## Branching Strategy: Trunk-Based with Short-Lived Branches

### Branch Types
- \`main\` - Production-ready code, always deployable
- \`feature/<ticket>-<description>\` - New features (max 2-3 days)
- \`fix/<ticket>-<description>\` - Bug fixes
- \`release/<version>\` - Release preparation (if needed)

### Rules
1. Branch from \`main\`, merge back to \`main\`
2. Keep branches short-lived (< 3 days)
3. Use pull requests for all merges
4. Require at least 1 approval
5. Squash merge to keep history clean

## Commit Convention

Follow Conventional Commits. See references/commit-convention.md for the full spec.

Format: \`<type>(<scope>): <description>\`

Types: feat, fix, docs, style, refactor, test, chore, perf, ci

Examples:
\`\`\`
feat(auth): add OAuth2 login flow
fix(api): handle null response from payment gateway
docs(readme): add deployment instructions
refactor(users): extract validation into shared module
\`\`\`

## Release Process

See references/release-process.md for the step-by-step release workflow.

## Git Hooks

See scripts/pre-commit.sh for a pre-commit hook that enforces commit conventions and runs linting.`,
		files: [
			{
				path: "references/commit-convention.md",
				content: `# Conventional Commits

## Format

\`\`\`
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
\`\`\`

## Types

| Type | Description | SemVer |
|------|-------------|--------|
| feat | New feature | MINOR |
| fix | Bug fix | PATCH |
| docs | Documentation only | - |
| style | Formatting, no code change | - |
| refactor | Code change that neither fixes nor adds | - |
| test | Adding or updating tests | - |
| chore | Maintenance tasks | - |
| perf | Performance improvement | PATCH |
| ci | CI/CD changes | - |

## Breaking Changes

Add \`!\` after type or \`BREAKING CHANGE:\` in footer:

\`\`\`
feat(api)!: change response format for /users endpoint

BREAKING CHANGE: The users endpoint now returns { data: [...] } instead of a flat array.
\`\`\`

## Scope

The scope should identify the module or area affected:
- \`auth\`, \`api\`, \`ui\`, \`db\`, \`config\`, etc.
- Keep it short and consistent across the project

## Description Rules

- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Max 72 characters`,
			},
			{
				path: "references/release-process.md",
				content: `# Release Process

## Steps

1. **Create release branch**
   \`\`\`bash
   git checkout -b release/v1.2.0 main
   \`\`\`

2. **Bump version**
   - Update package.json version
   - Update CHANGELOG.md
   - Commit: \`chore(release): bump version to 1.2.0\`

3. **Final testing**
   - Run full test suite
   - Verify staging deployment
   - Get sign-off from QA

4. **Merge to main**
   \`\`\`bash
   git checkout main
   git merge --no-ff release/v1.2.0
   git tag v1.2.0
   git push origin main --tags
   \`\`\`

5. **Post-release**
   - Verify production deployment
   - Close related issues/milestones
   - Delete release branch
   - Announce release

## Hotfix Process

1. Branch from latest tag: \`git checkout -b fix/critical-bug v1.2.0\`
2. Fix, test, and merge to main
3. Tag as patch: \`v1.2.1\``,
			},
			{
				path: "scripts/pre-commit.sh",
				content: `#!/bin/bash
# Pre-commit hook: validates commit message format and runs lint

# Conventional commit pattern
COMMIT_MSG_PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci)(\(.+\))?(!)?: .{1,72}$"

# Validate commit message
commit_msg=$(cat "$1" 2>/dev/null || echo "")
if [ -n "$commit_msg" ]; then
  if ! echo "$commit_msg" | head -1 | grep -qE "$COMMIT_MSG_PATTERN"; then
    echo "ERROR: Commit message does not follow Conventional Commits format."
    echo ""
    echo "Expected: <type>(<scope>): <description>"
    echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci"
    echo ""
    echo "Examples:"
    echo "  feat(auth): add login endpoint"
    echo "  fix(api): handle null response"
    echo ""
    exit 1
  fi
fi

# Run lint on staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -n "$STAGED_FILES" ]; then
  echo "Running lint on staged files..."

  # JavaScript/TypeScript
  JS_FILES=$(echo "$STAGED_FILES" | grep -E '\\.(js|jsx|ts|tsx)$' || true)
  if [ -n "$JS_FILES" ]; then
    npx eslint $JS_FILES --fix
    git add $JS_FILES
  fi
fi

echo "Pre-commit checks passed."
exit 0`,
			},
		],
	},
];

export const TOTAL_SKILLS = exampleSkills.length;
