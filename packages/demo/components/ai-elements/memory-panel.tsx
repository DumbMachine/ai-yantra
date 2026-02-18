"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	Brain,
	ChevronRight,
	File,
	Folder,
	Loader2,
	RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface MemoryFileNode {
	name: string;
	path: string;
	isDirectory: boolean;
	size?: number;
	children?: MemoryFileNode[];
}

interface MemoryPanelProps {
	isActive?: boolean;
}

function MemoryTreeItem({
	node,
	level = 0,
}: {
	node: MemoryFileNode;
	level?: number;
}) {
	const [expanded, setExpanded] = useState(false);

	if (node.isDirectory) {
		return (
			<div>
				<button
					onClick={() => setExpanded(!expanded)}
					className="flex items-center gap-1.5 w-full px-2 py-1 text-left hover:bg-muted/50 rounded-sm transition-colors"
					style={{ paddingLeft: `${level * 12 + 8}px` }}
				>
					<ChevronRight
						className={`size-3 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
					/>
					<Folder className="size-3 text-muted-foreground" />
					<span className="text-[11px] text-foreground truncate">
						{node.name}
					</span>
				</button>
				{expanded && node.children && (
					<div>
						{node.children.map((child) => (
							<MemoryTreeItem
								key={child.path}
								node={child}
								level={level + 1}
							/>
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50 rounded-sm transition-colors"
			style={{ paddingLeft: `${level * 12 + 22}px` }}
		>
			<File className="size-3 text-muted-foreground" />
			<span className="text-[11px] text-foreground truncate">{node.name}</span>
		</div>
	);
}

export function MemoryPanel({ isActive = true }: MemoryPanelProps) {
	const [files, setFiles] = useState<MemoryFileNode[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const fetchFiles = useCallback(async () => {
		if (!isActive) return;
		setIsLoading(true);
		try {
			const response = await fetch("/api/chat", {
				headers: { demo: "memory" },
			});
			if (response.ok) {
				const data = await response.json();
				setFiles(data.files || []);
			}
		} catch (error) {
			console.error("Failed to fetch memory files:", error);
		} finally {
			setIsLoading(false);
		}
	}, [isActive]);

	useEffect(() => {
		fetchFiles();
		if (isActive) {
			const interval = setInterval(fetchFiles, 5000);
			return () => clearInterval(interval);
		}
	}, [fetchFiles, isActive]);

	const totalFiles = files.reduce((acc, f) => {
		if (f.isDirectory) return acc + (f.children?.length || 0);
		return acc + 1;
	}, 0);

	return (
		<div className="flex flex-col h-full border-r bg-muted/30 w-72">
			<div className="flex items-center gap-2 px-3 py-2 border-b h-12">
				<Brain className="size-3.5 text-muted-foreground" />
				<span className="text-xs font-medium">Memory Files</span>
				<span className="ml-auto text-[10px] text-muted-foreground">
					{totalFiles} {totalFiles === 1 ? "file" : "files"}
				</span>
				<Button
					variant="ghost"
					size="sm"
					className="h-6 w-6 p-0"
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
				{files.length === 0 ? (
					<div className="p-4 text-center space-y-2">
						<Brain className="size-6 mx-auto text-muted-foreground/50" />
						<p className="text-[11px] text-muted-foreground">
							No memories yet. Start a conversation and the assistant will
							create memories automatically.
						</p>
					</div>
				) : (
					<div className="p-2">
						{files.map((node) => (
							<MemoryTreeItem key={node.path} node={node} />
						))}
					</div>
				)}
			</ScrollArea>

			<Separator />

			<div className="p-3 space-y-2">
				<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
					How Memory Works
				</h4>
				<div className="text-[10px] text-muted-foreground space-y-1.5 leading-relaxed">
					<p>
						The assistant stores notes, preferences, and context in{" "}
						<code className="text-foreground">/memories</code> so it can recall
						them across conversations.
					</p>
					<p>
						Memories persist in a local SQLite database and survive session
						restarts.
					</p>
				</div>
			</div>
		</div>
	);
}
