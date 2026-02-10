import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	discoverSkills,
	parseFrontmatter,
	stripFrontmatter,
	validateName,
	resolveDefinition,
	loadSkillFromPath,
} from "../src/discovery.js";

describe("validateName", () => {
	it("accepts valid names", () => {
		expect(validateName("pdf-processing")).toBeNull();
		expect(validateName("a")).toBeNull();
		expect(validateName("code-review")).toBeNull();
		expect(validateName("data-analysis")).toBeNull();
		expect(validateName("a1b2c3")).toBeNull();
	});

	it("rejects uppercase", () => {
		expect(validateName("PDF-Processing")).not.toBeNull();
	});

	it("rejects leading/trailing hyphens", () => {
		expect(validateName("-pdf")).not.toBeNull();
		expect(validateName("pdf-")).not.toBeNull();
	});

	it("rejects consecutive hyphens", () => {
		expect(validateName("pdf--processing")).not.toBeNull();
	});

	it("rejects empty or too long", () => {
		expect(validateName("")).not.toBeNull();
		expect(validateName("a".repeat(65))).not.toBeNull();
	});
});

describe("parseFrontmatter", () => {
	it("parses required fields", () => {
		const result = parseFrontmatter(`---
name: my-skill
description: Does something useful
---

# Instructions`);

		expect(result).toEqual({
			name: "my-skill",
			description: "Does something useful",
		});
	});

	it("parses all optional fields", () => {
		const result = parseFrontmatter(`---
name: pdf-processing
description: Extract text from PDFs
license: Apache-2.0
compatibility: Requires poppler
allowed-tools: Bash(git:*) Read
metadata:
  author: example-org
  version: "1.0"
---

# Body`);

		expect(result).toEqual({
			name: "pdf-processing",
			description: "Extract text from PDFs",
			license: "Apache-2.0",
			compatibility: "Requires poppler",
			"allowed-tools": "Bash(git:*) Read",
			metadata: { author: "example-org", version: '"1.0"' },
		});
	});

	it("returns null for missing frontmatter", () => {
		expect(parseFrontmatter("# No frontmatter")).toBeNull();
	});

	it("returns null for missing required fields", () => {
		expect(parseFrontmatter("---\nname: foo\n---\n")).toBeNull();
		expect(parseFrontmatter("---\ndescription: bar\n---\n")).toBeNull();
	});
});

describe("stripFrontmatter", () => {
	it("strips frontmatter and returns body", () => {
		const content = `---
name: test
---

# Body content`;

		expect(stripFrontmatter(content)).toBe("# Body content");
	});

	it("returns trimmed content when no frontmatter", () => {
		expect(stripFrontmatter("  # Just content  ")).toBe("# Just content");
	});
});

describe("resolveDefinition", () => {
	it("creates virtual skill with files", () => {
		const resolved = resolveDefinition({
			name: "my-skill",
			description: "Does things",
			content: "# Instructions",
			files: [
				{ path: "scripts/run.sh", content: "#!/bin/bash\necho hi" },
				{ path: "references/REF.md", content: "# Ref" },
			],
		});

		expect(resolved.source).toBe("virtual");
		expect(resolved.body).toBe("# Instructions");
		expect(resolved.files?.get("scripts/run.sh")).toBe(
			"#!/bin/bash\necho hi",
		);
		expect(resolved.files?.get("references/REF.md")).toBe("# Ref");
		expect(resolved.directoryPath).toBeUndefined();
	});

	it("passes through optional metadata", () => {
		const resolved = resolveDefinition({
			name: "my-skill",
			description: "Does things",
			content: "# Body",
			license: "MIT",
			compatibility: "Requires docker",
			metadata: { author: "me" },
			allowedTools: ["Bash", "Read"],
		});

		expect(resolved.license).toBe("MIT");
		expect(resolved.compatibility).toBe("Requires docker");
		expect(resolved.metadata).toEqual({ author: "me" });
		expect(resolved.allowedTools).toEqual(["Bash", "Read"]);
	});
});

describe("discoverSkills", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(tmpdir(), `skills-test-${Date.now()}`);
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("discovers skills with all frontmatter fields", async () => {
		const skillDir = join(testDir, "my-skill");
		await mkdir(skillDir);
		await writeFile(
			join(skillDir, "SKILL.md"),
			`---
name: my-skill
description: A test skill
license: MIT
---

# My Skill`,
		);

		const skills = await discoverSkills([testDir]);
		expect(skills).toHaveLength(1);
		expect(skills[0].name).toBe("my-skill");
		expect(skills[0].license).toBe("MIT");
		expect(skills[0].source).toBe("file");
		expect(skills[0].directoryPath).toBe(skillDir);
	});

	it("rejects skills with invalid names", async () => {
		const skillDir = join(testDir, "BAD-SKILL");
		await mkdir(skillDir);
		await writeFile(
			join(skillDir, "SKILL.md"),
			`---
name: BAD-SKILL
description: Invalid name
---
# Bad`,
		);

		const skills = await discoverSkills([testDir]);
		expect(skills).toHaveLength(0);
	});

	it("deduplicates by name across directories", async () => {
		const dir1 = join(testDir, "dir1");
		const dir2 = join(testDir, "dir2");
		await mkdir(join(dir1, "skill-a"), { recursive: true });
		await mkdir(join(dir2, "skill-a"), { recursive: true });

		await writeFile(
			join(dir1, "skill-a", "SKILL.md"),
			`---
name: skill-a
description: First version
---
# First`,
		);
		await writeFile(
			join(dir2, "skill-a", "SKILL.md"),
			`---
name: skill-a
description: Second version
---
# Second`,
		);

		const skills = await discoverSkills([dir1, dir2]);
		expect(skills).toHaveLength(1);
		expect(skills[0].description).toBe("First version");
	});

	it("skips non-existent directories", async () => {
		const skills = await discoverSkills(["/nonexistent/path"]);
		expect(skills).toHaveLength(0);
	});
});

describe("loadSkillFromPath", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(tmpdir(), `skills-load-test-${Date.now()}`);
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("loads a skill from a directory path", async () => {
		await writeFile(
			join(testDir, "SKILL.md"),
			`---
name: loaded-skill
description: Loaded from path
---
# Body`,
		);

		const skill = await loadSkillFromPath(testDir);
		expect(skill).not.toBeNull();
		expect(skill!.name).toBe("loaded-skill");
		expect(skill!.directoryPath).toBe(testDir);
	});

	it("returns null for invalid path", async () => {
		const skill = await loadSkillFromPath("/nonexistent");
		expect(skill).toBeNull();
	});
});
