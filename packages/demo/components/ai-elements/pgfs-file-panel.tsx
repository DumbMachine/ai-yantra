"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Folder, RefreshCw } from "lucide-react";
import {
	FileTree,
	FileTreeFolder,
	FileTreeFile,
} from "@/components/ai-elements/file-tree";

interface FileNode {
	name: string;
	path: string;
	isDirectory: boolean;
	size?: number;
	children?: FileNode[];
}

interface PgFsFilePanelProps {
	isActive?: boolean;
	onFileSelect?: (path: string) => void;
	selectedPath?: string;
}

function buildFileTree(nodes: FileNode[]): FileNode[] {
	// Sort: directories first, then by name
	return nodes.sort((a, b) => {
		if (a.isDirectory && !b.isDirectory) return -1;
		if (!a.isDirectory && b.isDirectory) return 1;
		return a.name.localeCompare(b.name);
	});
}

function renderFileTree(nodes: FileNode[], level: number = 0): React.ReactNode {
	return nodes.map((node) => {
		if (node.isDirectory) {
			const sortedChildren = node.children ? buildFileTree(node.children) : [];
			return (
				<FileTreeFolder key={node.path} path={node.path} name={node.name}>
					{sortedChildren.length > 0 &&
						renderFileTree(sortedChildren, level + 1)}
				</FileTreeFolder>
			);
		}
		return <FileTreeFile key={node.path} path={node.path} name={node.name} />;
	});
}

export function PgFsFilePanel({
	isActive = true,
	onFileSelect,
	selectedPath,
}: PgFsFilePanelProps) {
	const [files, setFiles] = useState<FileNode[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [internalSelectedPath, setInternalSelectedPath] = useState<
		string | undefined
	>(selectedPath);

	const fetchFiles = useCallback(async () => {
		if (!isActive) return;
		setIsLoading(true);
		try {
			const response = await fetch("/api/chat", {
				headers: { demo: "pg-fs" },
			});
			if (response.ok) {
				const data = await response.json();
				setFiles(data.files || []);
			}
		} catch (error) {
			console.error("Failed to fetch files:", error);
		} finally {
			setIsLoading(false);
		}
	}, [isActive]);

	useEffect(() => {
		fetchFiles();
		// Refresh every 5 seconds when active
		if (isActive) {
			const interval = setInterval(fetchFiles, 5000);
			return () => clearInterval(interval);
		}
	}, [fetchFiles, isActive]);

	const sortedFiles = buildFileTree(files);

	return (
		<div className="flex flex-col h-full border-r bg-muted/30 w-72">
			<div className="flex items-center gap-2 px-3 py-2 border-b h-12">
				<Folder className="size-3.5 text-muted-foreground" />
				<span className="text-xs font-medium">pg-fs Files</span>
				<Button
					variant="ghost"
					size="sm"
					className="ml-auto h-6 w-6 p-0"
					onClick={fetchFiles}
					disabled={isLoading}
				>
					{isLoading ? (
						<Loader2 className="size-3 animate-spin" />
					) : (
						<RefreshCw className="size-3" />
					)}
				</Button>
			</div>
			<ScrollArea className="flex-1">
				{sortedFiles.length === 0 ? (
					<div className="p-4 text-[10px] text-muted-foreground text-center">
						No files yet. Start coding to create some!
					</div>
				) : (
					<div className="p-2">
						<FileTree
							selectedPath={internalSelectedPath}
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							onSelect={
								((path: string) => {
									setInternalSelectedPath(path);
									onFileSelect?.(path);
								}) as any
							}
							className="border-0 bg-transparent"
						>
							{renderFileTree(sortedFiles)}
						</FileTree>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
