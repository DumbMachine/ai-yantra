import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Skills } from "../src/index.js";

const execCtx = { toolCallId: "test", messages: [] } as any;

describe("Skills.create", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(tmpdir(), `skills-main-test-${Date.now()}`);
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("discovers file-based skills", async () => {
		const skillDir = join(testDir, "pdf");
		await mkdir(skillDir);
		await writeFile(
			join(skillDir, "SKILL.md"),
			`---
name: pdf-processing
description: Extract text from PDFs
---
# PDF Processing`,
		);

		const instance = await Skills.create({ directories: [testDir] });
		expect(instance.skills).toHaveLength(1);
		expect(instance.skills[0].name).toBe("pdf-processing");
	});

	it("merges file and virtual skills", async () => {
		const skillDir = join(testDir, "pdf");
		await mkdir(skillDir);
		await writeFile(
			join(skillDir, "SKILL.md"),
			`---
name: pdf-processing
description: Extract text from PDFs
---
# PDF`,
		);

		const instance = await Skills.create({
			directories: [testDir],
			definitions: [
				{
					name: "code-review",
					description: "Review code",
					content: "# Code Review",
				},
			],
		});

		expect(instance.skills).toHaveLength(2);
		expect(instance.skills.map((s) => s.name).sort()).toEqual([
			"code-review",
			"pdf-processing",
		]);
	});

	it("file-based skills take priority over virtual with same name", async () => {
		const skillDir = join(testDir, "my-skill");
		await mkdir(skillDir);
		await writeFile(
			join(skillDir, "SKILL.md"),
			`---
name: my-skill
description: File version
---
# File`,
		);

		const instance = await Skills.create({
			directories: [testDir],
			definitions: [
				{
					name: "my-skill",
					description: "Virtual version",
					content: "# Virtual",
				},
			],
		});

		expect(instance.skills).toHaveLength(1);
		expect(instance.skills[0].description).toBe("File version");
		expect(instance.skills[0].source).toBe("file");
	});
});

describe("Skills.fromDefinitions", () => {
	it("creates virtual skills", () => {
		const instance = Skills.fromDefinitions([
			{
				name: "skill-a",
				description: "First",
				content: "# A",
				files: [{ path: "scripts/run.sh", content: "echo a" }],
			},
			{
				name: "skill-b",
				description: "Second",
				content: "# B",
			},
		]);

		expect(instance.skills).toHaveLength(2);
		expect(instance.skills[0].source).toBe("virtual");
		expect(instance.skills[0].files?.get("scripts/run.sh")).toBe("echo a");
	});

	it("deduplicates by name", () => {
		const instance = Skills.fromDefinitions([
			{ name: "dup", description: "First", content: "# 1" },
			{ name: "dup", description: "Second", content: "# 2" },
		]);

		expect(instance.skills).toHaveLength(1);
		expect(instance.skills[0].description).toBe("First");
	});
});

describe("Skills.fromPaths", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(tmpdir(), `skills-paths-test-${Date.now()}`);
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("loads skills from explicit directory paths", async () => {
		const dir1 = join(testDir, "skill-a");
		const dir2 = join(testDir, "skill-b");
		await mkdir(dir1);
		await mkdir(dir2);

		await writeFile(
			join(dir1, "SKILL.md"),
			`---
name: skill-a
description: First
---
# A`,
		);
		await writeFile(
			join(dir2, "SKILL.md"),
			`---
name: skill-b
description: Second
---
# B`,
		);

		const instance = await Skills.fromPaths([dir1, dir2]);
		expect(instance.skills).toHaveLength(2);
	});

	it("skips invalid paths", async () => {
		const instance = await Skills.fromPaths(["/nonexistent"]);
		expect(instance.skills).toHaveLength(0);
	});
});

describe("buildPrompt", () => {
	it("includes skill names and readSkillFile mention", () => {
		const instance = Skills.fromDefinitions([
			{
				name: "pdf-processing",
				description: "Extract text from PDFs",
				content: "# PDF",
			},
		]);

		const prompt = instance.buildPrompt();
		expect(prompt).toContain("## Skills");
		expect(prompt).toContain("loadSkill");
		expect(prompt).toContain("readSkillFile");
		expect(prompt).toContain(
			"pdf-processing: Extract text from PDFs",
		);
	});

	it("returns empty when no skills", () => {
		const instance = Skills.fromDefinitions([]);
		expect(instance.buildPrompt()).toBe("");
	});
});

describe("end-to-end tool usage", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(tmpdir(), `skills-e2e-test-${Date.now()}`);
		await mkdir(join(testDir, "scripts"), { recursive: true });
		await writeFile(
			join(testDir, "SKILL.md"),
			`---
name: disk-skill
description: A disk skill
---
# Disk Skill
Run scripts/setup.sh to get started.`,
		);
		await writeFile(
			join(testDir, "scripts", "setup.sh"),
			"#!/bin/bash\necho setup",
		);
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("file-based: loadSkill then readSkillFile", async () => {
		const instance = await Skills.fromPaths([testDir]);

		const loaded = await instance.tools.loadSkill.execute(
			{ name: "disk-skill" },
			execCtx,
		);
		expect(loaded.success).toBe(true);
		expect(loaded.content).toContain("scripts/setup.sh");

		const file = await instance.tools.readSkillFile.execute(
			{ skill_name: "disk-skill", file_path: "scripts/setup.sh" },
			execCtx,
		);
		expect(file.success).toBe(true);
		expect(file.content).toBe("#!/bin/bash\necho setup");
	});

	it("virtual: loadSkill then readSkillFile", () => {
		const instance = Skills.fromDefinitions([
			{
				name: "virt-skill",
				description: "Virtual",
				content: "# Virtual\nSee references/guide.md",
				files: [
					{ path: "references/guide.md", content: "# Guide\nStep 1" },
					{ path: "assets/config.json", content: '{"port":3000}' },
				],
			},
		]);

		return (async () => {
			const loaded = await instance.tools.loadSkill.execute(
				{ name: "virt-skill" },
				execCtx,
			);
			expect(loaded.success).toBe(true);
			expect(loaded.content).toContain("references/guide.md");

			const ref = await instance.tools.readSkillFile.execute(
				{
					skill_name: "virt-skill",
					file_path: "references/guide.md",
				},
				execCtx,
			);
			expect(ref.success).toBe(true);
			expect(ref.content).toBe("# Guide\nStep 1");

			const asset = await instance.tools.readSkillFile.execute(
				{
					skill_name: "virt-skill",
					file_path: "assets/config.json",
				},
				execCtx,
			);
			expect(asset.success).toBe(true);
			expect(asset.content).toBe('{"port":3000}');
		})();
	});
});
