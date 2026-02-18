import crypto from "crypto";

export class FileSystemUtils {
	static hashContent(content: string): string {
		return crypto.createHash("sha256").update(content).digest("hex");
	}

	static generateId(): string {
		return crypto.randomUUID();
	}

	static pathToTreePath(path: string): string {
		return path
			.split("/")
			.filter(Boolean)
			.map((segment) => segment.replace(/[^a-zA-Z0-9]/g, "_"))
			.join(".");
	}

	static normalizePath(path: string): string {
		const parts = path.split("/").filter(Boolean);
		const normalized: string[] = [];

		for (const part of parts) {
			if (part === "..") {
				normalized.pop();
			} else if (part !== ".") {
				normalized.push(part);
			}
		}

		return "/" + normalized.join("/");
	}

	static getParentPath(path: string): string | null {
		const normalized = FileSystemUtils.normalizePath(path);
		if (normalized === "/") return null;

		const lastSlash = normalized.lastIndexOf("/");
		return lastSlash === 0 ? "/" : normalized.substring(0, lastSlash);
	}

	static getFileName(path: string): string {
		const normalized = FileSystemUtils.normalizePath(path);
		const lastSlash = normalized.lastIndexOf("/");
		return normalized.substring(lastSlash + 1);
	}

	static isValidPath(path: string): boolean {
		if (!path.startsWith("/")) return false;
		if (path.includes("//")) return false;
		return true;
	}
}
