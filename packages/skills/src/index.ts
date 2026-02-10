import { homedir } from "node:os";
import { join } from "node:path";
import {
	discoverSkills,
	loadSkillFromPath,
	resolveDefinition,
} from "./discovery.js";
import { createSkillTools } from "./tools.js";
import type {
	ResolvedSkill,
	SkillDefinition,
	SkillsConfig,
} from "./types.js";

export * from "./types.js";
export * from "./discovery.js";
export * from "./tools.js";

export class Skills {
	public readonly skills: ResolvedSkill[];
	public readonly tools: ReturnType<typeof createSkillTools>;

	private constructor(skills: ResolvedSkill[]) {
		this.skills = skills;
		this.tools = createSkillTools(skills);
	}

	static async create(config?: Partial<SkillsConfig>): Promise<Skills> {
		const directories = config?.directories ?? [
			join(homedir(), ".skills"),
		];
		const fileSkills = await discoverSkills(directories);

		const virtualSkills = (config?.definitions ?? []).map(resolveDefinition);

		const seenNames = new Set(fileSkills.map((s) => s.name));
		const deduped = [
			...fileSkills,
			...virtualSkills.filter((s) => {
				if (seenNames.has(s.name)) return false;
				seenNames.add(s.name);
				return true;
			}),
		];

		return new Skills(deduped);
	}

	static fromDefinitions(definitions: SkillDefinition[]): Skills {
		const seenNames = new Set<string>();
		const skills: ResolvedSkill[] = [];

		for (const def of definitions) {
			if (seenNames.has(def.name)) continue;
			seenNames.add(def.name);
			skills.push(resolveDefinition(def));
		}

		return new Skills(skills);
	}

	static async fromPaths(directoryPaths: string[]): Promise<Skills> {
		const seenNames = new Set<string>();
		const skills: ResolvedSkill[] = [];

		for (const dirPath of directoryPaths) {
			const skill = await loadSkillFromPath(dirPath);
			if (!skill) continue;
			if (seenNames.has(skill.name)) continue;
			seenNames.add(skill.name);
			skills.push(skill);
		}

		return new Skills(skills);
	}

	buildPrompt(): string {
		if (this.skills.length === 0) return "";

		const skillsList = this.skills
			.map((s) => `- ${s.name}: ${s.description}`)
			.join("\n");

		return `## Skills

Use the \`loadSkill\` tool to load a skill when the user's request matches a skill description.
After loading a skill, use \`readSkillFile\` to access any referenced files (scripts, references, assets).

Available skills:
${skillsList}`;
	}
}

export async function createSkills(
	config?: Partial<SkillsConfig>,
): Promise<Skills> {
	return Skills.create(config);
}
