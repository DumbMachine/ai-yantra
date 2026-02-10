import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	SkillFrontmatter,
	SkillDefinition,
	ResolvedSkill,
} from "./types.js";

const NAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const CONSECUTIVE_HYPHENS_RE = /--/;

export function validateName(name: string): string | null {
	if (!name || name.length > 64) return "name must be 1-64 characters";
	if (!NAME_RE.test(name))
		return "name must be lowercase alphanumeric and hyphens, cannot start/end with hyphen";
	if (CONSECUTIVE_HYPHENS_RE.test(name))
		return "name must not contain consecutive hyphens";
	return null;
}

export function parseFrontmatter(
	content: string,
): SkillFrontmatter | null {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match?.[1]) return null;

	const result: Record<string, any> = {};
	let currentKey: string | null = null;
	let currentIndent = 0;
	let nestedObj: Record<string, string> | null = null;

	for (const line of match[1].split("\n")) {
		if (line.trim() === "") continue;

		const indent = line.length - line.trimStart().length;

		if (indent > 0 && currentKey && nestedObj !== null) {
			const colonIdx = line.indexOf(":");
			if (colonIdx !== -1) {
				const key = line.slice(0, colonIdx).trim();
				const value = line.slice(colonIdx + 1).trim();
				if (key && value) nestedObj[key] = value;
			}
			continue;
		}

		if (nestedObj !== null && currentKey) {
			result[currentKey] = nestedObj;
			nestedObj = null;
			currentKey = null;
		}

		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;

		const key = line.slice(0, colonIdx).trim();
		const value = line.slice(colonIdx + 1).trim();

		if (!value) {
			currentKey = key;
			currentIndent = indent;
			nestedObj = {};
		} else {
			result[key] = value;
			currentKey = key;
			currentIndent = indent;
			nestedObj = null;
		}
	}

	if (nestedObj !== null && currentKey) {
		result[currentKey] = nestedObj;
	}

	if (!result.name || !result.description) return null;

	return result as SkillFrontmatter;
}

export function stripFrontmatter(content: string): string {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	return match ? content.slice(match[0].length).trim() : content.trim();
}

function frontmatterToResolved(
	fm: SkillFrontmatter,
	directoryPath: string,
): ResolvedSkill {
	return {
		name: fm.name,
		description: fm.description,
		license: fm.license,
		compatibility: fm.compatibility,
		metadata: fm.metadata as Record<string, string> | undefined,
		allowedTools: fm["allowed-tools"]?.split(/\s+/).filter(Boolean),
		source: "file",
		directoryPath,
	};
}

export async function discoverSkills(
	directories: string[],
): Promise<ResolvedSkill[]> {
	const skills: ResolvedSkill[] = [];
	const seenNames = new Set<string>();

	for (const dir of directories) {
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const skillDir = join(dir, entry.name);
			const skillFile = join(skillDir, "SKILL.md");

			try {
				const content = await readFile(skillFile, "utf-8");
				const fm = parseFrontmatter(content);
				if (!fm) continue;

				const nameError = validateName(fm.name);
				if (nameError) continue;

				if (seenNames.has(fm.name)) continue;
				seenNames.add(fm.name);

				skills.push(frontmatterToResolved(fm, skillDir));
			} catch {
				continue;
			}
		}
	}

	return skills;
}

export async function loadSkillFromPath(
	directoryPath: string,
): Promise<ResolvedSkill | null> {
	const skillFile = join(directoryPath, "SKILL.md");
	try {
		const content = await readFile(skillFile, "utf-8");
		const fm = parseFrontmatter(content);
		if (!fm) return null;
		return frontmatterToResolved(fm, directoryPath);
	} catch {
		return null;
	}
}

export function resolveDefinition(def: SkillDefinition): ResolvedSkill {
	const files = new Map<string, string>();
	if (def.files) {
		for (const f of def.files) {
			files.set(f.path, f.content);
		}
	}

	return {
		name: def.name,
		description: def.description,
		license: def.license,
		compatibility: def.compatibility,
		metadata: def.metadata,
		allowedTools: def.allowedTools,
		source: "virtual",
		body: def.content,
		files,
	};
}
