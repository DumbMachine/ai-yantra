import { FileSystemUtils } from "pg-fs";

const MEMORIES_PREFIX = "/memories";

export function validateMemoryPath(path: string): string {
	const normalized = FileSystemUtils.normalizePath(path);

	if (normalized !== MEMORIES_PREFIX && !normalized.startsWith(MEMORIES_PREFIX + "/")) {
		throw new Error(
			`Invalid memory path: ${path}. All memory paths must be under /memories`,
		);
	}

	return normalized;
}
