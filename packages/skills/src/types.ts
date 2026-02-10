export interface SkillFrontmatter {
	name: string;
	description: string;
	license?: string;
	compatibility?: string;
	metadata?: Record<string, string>;
	"allowed-tools"?: string;
}

export interface SkillFile {
	path: string;
	content: string;
}

export interface SkillDefinition {
	name: string;
	description: string;
	content: string;
	license?: string;
	compatibility?: string;
	metadata?: Record<string, string>;
	allowedTools?: string[];
	files?: SkillFile[];
}

export interface ResolvedSkill {
	name: string;
	description: string;
	license?: string;
	compatibility?: string;
	metadata?: Record<string, string>;
	allowedTools?: string[];
	source: "file" | "virtual";
	directoryPath?: string;
	body?: string;
	files?: Map<string, string>;
}

export interface SkillsConfig {
	directories?: string[];
	definitions?: SkillDefinition[];
}
