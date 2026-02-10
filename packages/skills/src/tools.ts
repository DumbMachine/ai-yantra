import { tool } from "ai";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { stripFrontmatter } from "./discovery.js";
import type { ResolvedSkill } from "./types.js";

export function createSkillTools(skills: ResolvedSkill[]) {
	return {
		loadSkill: tool({
			description:
				"Load a skill to get specialized instructions for a task. Use this when the user's request matches an available skill's description. Returns the skill body and directory path for accessing bundled resources.",
			inputSchema: z.object({
				name: z
					.string()
					.describe("The skill name to load (case-insensitive)"),
			}),
			execute: async ({ name }) => {
				try {
					const skill = skills.find(
						(s) => s.name.toLowerCase() === name.toLowerCase(),
					);

					if (!skill) {
						return {
							success: false,
							error: `Skill '${name}' not found. Available: ${skills.map((s) => s.name).join(", ")}`,
						};
					}

					let body: string;

					if (skill.source === "virtual") {
						body = skill.body ?? "";
					} else {
						const skillFile = join(skill.directoryPath!, "SKILL.md");
						const content = await readFile(skillFile, "utf-8");
						body = stripFrontmatter(content);
					}

					return {
						success: true,
						name: skill.name,
						skillDirectory:
							skill.source === "file" ? skill.directoryPath : undefined,
						source: skill.source,
						content: body,
					};
				} catch (error) {
					return {
						success: false,
						error:
							error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),

		readSkillFile: tool({
			description:
				"Read a referenced file from a skill (scripts, references, assets, or any relative path). For file-based skills, reads from disk. For virtual skills, reads from in-memory content.",
			inputSchema: z.object({
				skill_name: z
					.string()
					.describe("The skill name that owns the file"),
				file_path: z
					.string()
					.describe(
						"Relative path within the skill directory (e.g. scripts/extract.py, references/REFERENCE.md)",
					),
			}),
			execute: async ({ skill_name, file_path }) => {
				try {
					const skill = skills.find(
						(s) => s.name.toLowerCase() === skill_name.toLowerCase(),
					);

					if (!skill) {
						return {
							success: false,
							error: `Skill '${skill_name}' not found`,
						};
					}

					if (skill.source === "virtual") {
						const content = skill.files?.get(file_path);
						if (content === undefined) {
							const available = skill.files
								? Array.from(skill.files.keys())
								: [];
							return {
								success: false,
								error: `File '${file_path}' not found in skill '${skill_name}'. Available: ${available.join(", ") || "none"}`,
							};
						}
						return {
							success: true,
							skillName: skill_name,
							filePath: file_path,
							content,
						};
					}

					const fullPath = join(skill.directoryPath!, file_path);
					const content = await readFile(fullPath, "utf-8");
					return {
						success: true,
						skillName: skill_name,
						filePath: file_path,
						content,
					};
				} catch (error) {
					return {
						success: false,
						error:
							error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
		}),
	};
}

export type SkillTools = ReturnType<typeof createSkillTools>;
