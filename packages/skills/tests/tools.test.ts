import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSkillTools } from "../src/tools.js";
import type { ResolvedSkill } from "../src/types.js";

const execCtx = { toolCallId: "test", messages: [] } as any;

describe("loadSkill", () => {
	let testDir: string;
	let skillDir: string;

	beforeEach(async () => {
		testDir = join(tmpdir(), `skills-tools-test-${Date.now()}`);
		skillDir = join(testDir, "test-skill");
		await mkdir(skillDir, { recursive: true });
		await writeFile(
			join(skillDir, "SKILL.md"),
			`---
name: test-skill
description: A test skill
---

# Test Skill

## Instructions
Do the thing.`,
		);
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("loads a file-based skill", async () => {
		const skills: ResolvedSkill[] = [
			{
				name: "test-skill",
				description: "A test skill",
				source: "file",
				directoryPath: skillDir,
			},
		];
		const tools = createSkillTools(skills);

		const result = await tools.loadSkill.execute(
			{ name: "test-skill" },
			execCtx,
		);

		expect(result).toEqual({
			success: true,
			name: "test-skill",
			skillDirectory: skillDir,
			source: "file",
			content: "# Test Skill\n\n## Instructions\nDo the thing.",
		});
	});

	it("loads a virtual skill", async () => {
		const skills: ResolvedSkill[] = [
			{
				name: "virtual-skill",
				description: "Virtual",
				source: "virtual",
				body: "# Virtual Instructions",
				files: new Map([["scripts/run.sh", "echo hi"]]),
			},
		];
		const tools = createSkillTools(skills);

		const result = await tools.loadSkill.execute(
			{ name: "virtual-skill" },
			execCtx,
		);

		expect(result).toEqual({
			success: true,
			name: "virtual-skill",
			skillDirectory: undefined,
			source: "virtual",
			content: "# Virtual Instructions",
		});
	});

	it("is case-insensitive", async () => {
		const skills: ResolvedSkill[] = [
			{
				name: "test-skill",
				description: "A test skill",
				source: "file",
				directoryPath: skillDir,
			},
		];
		const tools = createSkillTools(skills);

		const result = await tools.loadSkill.execute(
			{ name: "TEST-SKILL" },
			execCtx,
		);
		expect(result.success).toBe(true);
	});

	it("returns error for unknown skill", async () => {
		const tools = createSkillTools([
			{
				name: "test-skill",
				description: "A test skill",
				source: "file",
				directoryPath: skillDir,
			},
		]);

		const result = await tools.loadSkill.execute(
			{ name: "nonexistent" },
			execCtx,
		);

		expect(result.success).toBe(false);
		expect(result.error).toContain("not found");
		expect(result.error).toContain("test-skill");
	});
});

describe("readSkillFile", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(tmpdir(), `skills-readfile-test-${Date.now()}`);
		await mkdir(join(testDir, "scripts"), { recursive: true });
		await mkdir(join(testDir, "references"), { recursive: true });
		await writeFile(
			join(testDir, "SKILL.md"),
			`---
name: disk-skill
description: Has files
---
# Body`,
		);
		await writeFile(
			join(testDir, "scripts", "extract.py"),
			"import sys\nprint('hello')",
		);
		await writeFile(
			join(testDir, "references", "REFERENCE.md"),
			"# Reference doc",
		);
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("reads file from disk-based skill", async () => {
		const skills: ResolvedSkill[] = [
			{
				name: "disk-skill",
				description: "Has files",
				source: "file",
				directoryPath: testDir,
			},
		];
		const tools = createSkillTools(skills);

		const result = await tools.readSkillFile.execute(
			{ skill_name: "disk-skill", file_path: "scripts/extract.py" },
			execCtx,
		);

		expect(result).toEqual({
			success: true,
			skillName: "disk-skill",
			filePath: "scripts/extract.py",
			content: "import sys\nprint('hello')",
		});
	});

	it("reads file from virtual skill", async () => {
		const skills: ResolvedSkill[] = [
			{
				name: "virt-skill",
				description: "Virtual with files",
				source: "virtual",
				body: "# Body",
				files: new Map([
					["scripts/run.sh", "#!/bin/bash\necho done"],
					["assets/template.json", '{"key":"value"}'],
				]),
			},
		];
		const tools = createSkillTools(skills);

		const result = await tools.readSkillFile.execute(
			{ skill_name: "virt-skill", file_path: "scripts/run.sh" },
			execCtx,
		);

		expect(result).toEqual({
			success: true,
			skillName: "virt-skill",
			filePath: "scripts/run.sh",
			content: "#!/bin/bash\necho done",
		});
	});

	it("returns error for missing virtual file with available list", async () => {
		const skills: ResolvedSkill[] = [
			{
				name: "virt-skill",
				description: "Virtual",
				source: "virtual",
				body: "# Body",
				files: new Map([["scripts/a.sh", "echo a"]]),
			},
		];
		const tools = createSkillTools(skills);

		const result = await tools.readSkillFile.execute(
			{ skill_name: "virt-skill", file_path: "scripts/b.sh" },
			execCtx,
		);

		expect(result.success).toBe(false);
		expect(result.error).toContain("not found");
		expect(result.error).toContain("scripts/a.sh");
	});

	it("returns error for unknown skill", async () => {
		const tools = createSkillTools([]);

		const result = await tools.readSkillFile.execute(
			{ skill_name: "nope", file_path: "scripts/a.sh" },
			execCtx,
		);

		expect(result.success).toBe(false);
		expect(result.error).toContain("not found");
	});

	it("returns error for missing disk file", async () => {
		const skills: ResolvedSkill[] = [
			{
				name: "disk-skill",
				description: "Has files",
				source: "file",
				directoryPath: testDir,
			},
		];
		const tools = createSkillTools(skills);

		const result = await tools.readSkillFile.execute(
			{ skill_name: "disk-skill", file_path: "scripts/nonexistent.py" },
			execCtx,
		);

		expect(result.success).toBe(false);
	});
});
