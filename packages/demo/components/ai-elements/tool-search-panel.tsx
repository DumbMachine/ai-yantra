"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ToolSearchPanelProps {
	isActive?: boolean;
	activeTools?: string[];
	totalTools?: number;
}

export function ToolSearchPanel({
	isActive = true,
	activeTools = [],
	totalTools = 60,
}: ToolSearchPanelProps) {
	const [localActiveTools, setLocalActiveTools] =
		useState<string[]>(activeTools);

	useEffect(() => {
		if (activeTools && activeTools.length > 0) {
			setLocalActiveTools(activeTools);
		}
	}, [activeTools]);

	// Separate static and dynamic tools
	const staticTools = localActiveTools.filter(
		(tool) => tool.includes("_search_") || tool === "tool_search",
	);
	const dynamicTools = localActiveTools.filter(
		(tool) => !staticTools.includes(tool),
	);

	// Calculate context pollution metrics
	const activeCount = localActiveTools.length;
	const contextSaved =
		totalTools > 0 ? ((totalTools - activeCount) / totalTools) * 100 : 0;
	const contextUsed = totalTools > 0 ? (activeCount / totalTools) * 100 : 0;

	return (
		<div className="flex flex-col h-full border-r bg-muted/30 w-72">
			{/* Header */}
			<div className="flex flex-col gap-2 px-3 py-2 border-b min-h-12">
				<div className="flex items-center gap-2">
					<Search className="size-3.5 text-muted-foreground" />
					<span className="text-xs font-medium">Active Tools</span>
					<Badge
						variant="secondary"
						className="ml-auto text-[10px] px-1.5 py-0"
					>
						{activeCount}/{totalTools}
					</Badge>
				</div>

				{/* Context Pollution Metrics */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between text-[10px]">
						<span className="text-muted-foreground">Context Usage</span>
						<span className="font-medium">{contextUsed.toFixed(1)}%</span>
					</div>
					<Progress value={contextUsed} className="h-1.5" />

					<div className="flex items-center justify-between text-[10px]">
						<span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
							<Zap className="size-2.5" />
							Context Saved
						</span>
						<span className="font-medium text-emerald-600 dark:text-emerald-400">
							{contextSaved.toFixed(1)}%
						</span>
					</div>
				</div>

				{/* Comparison */}
				<div className="pt-1.5 border-t">
					<div className="text-[9px] text-muted-foreground space-y-0.5">
						<div className="flex justify-between">
							<span>Without tool-search:</span>
							<span className="font-medium text-red-600/70 dark:text-red-400/70">
								{totalTools}/{totalTools} (100%)
							</span>
						</div>
						<div className="flex justify-between">
							<span>With tool-search:</span>
							<span className="font-medium text-emerald-600/70 dark:text-emerald-400/70">
								{activeCount}/{totalTools} ({contextUsed.toFixed(0)}%)
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Tools List */}
			<ScrollArea className="flex-1">
				{localActiveTools.length === 0 ? (
					<div className="p-4 text-[10px] text-muted-foreground text-center">
						No tools active yet. Start chatting to discover tools!
					</div>
				) : (
					<div className="p-2 space-y-3">
						{/* Static Tools */}
						{staticTools.length > 0 && (
							<div>
								<div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
									Static Tools ({staticTools.length})
								</div>
								<div className="space-y-0.5">
									{staticTools.map((tool) => (
										<div
											key={tool}
											className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/30"
										>
											<div className="size-1.5 rounded-full bg-blue-500 flex-shrink-0" />
											<span className="text-[10px] font-mono text-blue-700 dark:text-blue-300">
												{tool}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Dynamic Tools */}
						{dynamicTools.length > 0 && (
							<div>
								<div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
									Dynamic Tools ({dynamicTools.length})
								</div>
								<div className="space-y-0.5">
									{dynamicTools.map((tool) => (
										<div
											key={tool}
											className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-background border"
										>
											<div className="size-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
											<span className="text-[10px] font-mono">{tool}</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</ScrollArea>

			{/* Strategy Badge */}
			<div className="px-3 py-2 border-t bg-muted/20">
				<div className="flex items-center gap-2 text-[9px] text-muted-foreground">
					<span>Search Strategy:</span>
					<Badge variant="outline" className="text-[9px] px-1.5 py-0">
						BM25
					</Badge>
				</div>
			</div>
		</div>
	);
}
