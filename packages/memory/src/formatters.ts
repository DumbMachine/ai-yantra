const MAX_LINES = 999_999;

export function formatHumanSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)}K`;
	const mb = kb / 1024;
	if (mb < 1024) return `${mb.toFixed(1)}M`;
	const gb = mb / 1024;
	return `${gb.toFixed(1)}G`;
}

export function formatFileContent(
	path: string,
	content: string,
	viewRange?: number[],
): string {
	if (content === "") {
		return `Here's the content of ${path}:\n`;
	}

	const lines = content.split("\n");

	if (lines.length > MAX_LINES) {
		throw new Error(
			`File ${path} has ${lines.length} lines, which exceeds the maximum of ${MAX_LINES} lines`,
		);
	}

	let startLine = 1;
	let endLine = lines.length;

	if (viewRange && viewRange.length === 2) {
		startLine = viewRange[0];
		endLine = viewRange[1] === -1 ? lines.length : viewRange[1];

		if (startLine < 1) {
			throw new Error(`Invalid view_range: start line must be >= 1, got ${startLine}`);
		}
		if (endLine > lines.length) {
			throw new Error(
				`Invalid view_range: end line ${endLine} exceeds file length of ${lines.length} lines`,
			);
		}
		if (startLine > endLine) {
			throw new Error(
				`Invalid view_range: start line ${startLine} is greater than end line ${endLine}`,
			);
		}
	}

	const selectedLines = lines.slice(startLine - 1, endLine);
	const numberedLines = selectedLines.map((line, i) => {
		const lineNum = (startLine + i).toString().padStart(6, " ");
		return `${lineNum}\t${line}`;
	});

	return `Here's the content of ${path}:\n${numberedLines.join("\n")}\n`;
}

export function formatDirectoryListing(
	path: string,
	entries: Array<{ name: string; isDirectory: boolean; size: number; children?: Array<{ name: string; isDirectory: boolean; size: number }> }>,
): string {
	const lines: string[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

		if (entry.isDirectory) {
			lines.push(`${entry.name}/`);
			if (entry.children) {
				for (const child of entry.children) {
					if (child.name.startsWith(".") || child.name === "node_modules") continue;
					if (child.isDirectory) {
						lines.push(`  ${child.name}/`);
					} else {
						lines.push(`  ${child.name} (${formatHumanSize(child.size)})`);
					}
				}
			}
		} else {
			lines.push(`${entry.name} (${formatHumanSize(entry.size)})`);
		}
	}

	const displayPath = path.endsWith("/") ? path : path + "/";
	return `Here's the content of ${displayPath}:\n${lines.join("\n")}\n`;
}

export function formatEditSnippet(
	path: string,
	content: string,
	editLine: number,
): string {
	const lines = content.split("\n");
	const contextLines = 4;
	const start = Math.max(0, editLine - 1 - contextLines);
	const end = Math.min(lines.length, editLine + contextLines);

	const snippetLines = lines.slice(start, end).map((line, i) => {
		const lineNum = (start + i + 1).toString().padStart(6, " ");
		return `${lineNum}\t${line}`;
	});

	return `Here's the result of running the command on ${path}:\n${snippetLines.join("\n")}\n`;
}
