"use client";

import { useCallback, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Code2, Zap, ZapOff, TrendingDown, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface PTCPanelProps {
	isActive?: boolean;
	usePTC?: boolean;
	onTogglePTC?: (enabled: boolean) => void;
	tokenUsage?: {
		ptc?: number;
		regular?: number;
	};
}

export function PTCPanel({
	isActive = true,
	usePTC = true,
	onTogglePTC,
	tokenUsage = {},
}: PTCPanelProps) {
	const [localUsePTC, setLocalUsePTC] = useState(usePTC);

	const handleToggle = useCallback(() => {
		const newValue = !localUsePTC;
		setLocalUsePTC(newValue);
		onTogglePTC?.(newValue);
	}, [localUsePTC, onTogglePTC]);

	const ptcTokens = tokenUsage.ptc || 0;
	const regularTokens = tokenUsage.regular || 0;
	const savings = regularTokens > 0 ? ((regularTokens - ptcTokens) / regularTokens) * 100 : 0;
	const isSaving = savings > 0;

	return (
		<div className="flex flex-col h-full border-r bg-muted/30 w-72">
			{/* Header */}
			<div className="flex flex-col gap-2 px-3 py-2 border-b min-h-12">
				<div className="flex items-center gap-2">
					<Code2 className="size-3.5 text-muted-foreground" />
					<span className="text-xs font-medium">Programmable Tool Calls</span>
					{localUsePTC ? (
						<Badge
							variant="secondary"
							className="ml-auto text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
						>
							<Zap className="size-2.5 mr-1" />
							ON
						</Badge>
					) : (
						<Badge
							variant="secondary"
							className="ml-auto text-[10px] px-1.5 py-0 bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
						>
							<ZapOff className="size-2.5 mr-1" />
							OFF
						</Badge>
					)}
				</div>

				{/* PTC Toggle */}
				<div className="flex items-center justify-between py-1">
					<span className="text-[10px] text-muted-foreground">Enable PTC</span>
					<Switch
						checked={localUsePTC}
						onCheckedChange={handleToggle}
						className="scale-75"
					/>
				</div>
			</div>

			{/* Token Usage Comparison */}
			<div className="px-3 py-3 border-b bg-muted/20">
				<div className="space-y-3">
					<div className="flex items-center gap-1.5 text-[10px] font-medium">
						{isSaving ? (
							<TrendingDown className="size-3 text-emerald-600" />
						) : (
							<TrendingUp className="size-3 text-red-600" />
						)}
						<span className="text-muted-foreground">Token Usage</span>
					</div>

					{/* PTC Mode */}
					<div className="space-y-1">
						<div className="flex items-center justify-between text-[10px]">
							<span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
								<Zap className="size-2.5" />
								With PTC:
							</span>
							<span className="font-medium text-emerald-600 dark:text-emerald-400">
								{ptcTokens.toLocaleString()} tokens
							</span>
						</div>
						{regularTokens > 0 && (
							<Progress
								value={(ptcTokens / regularTokens) * 100}
								className="h-1.5 bg-gray-200 dark:bg-gray-700"
							/>
						)}
					</div>

					{/* Regular Mode */}
					<div className="space-y-1">
						<div className="flex items-center justify-between text-[10px]">
							<span className="text-red-600 dark:text-red-400 flex items-center gap-1">
								<ZapOff className="size-2.5" />
								Regular tools:
							</span>
							<span className="font-medium text-red-600 dark:text-red-400">
								{regularTokens.toLocaleString()} tokens
							</span>
						</div>
						{regularTokens > 0 && (
							<Progress
								value={100}
								className="h-1.5 bg-gray-200 dark:bg-gray-700"
							/>
						)}
					</div>

					{/* Savings */}
					{regularTokens > 0 && (
						<div className="pt-2 border-t">
							<div className="flex items-center justify-between text-[10px]">
								<span className="text-muted-foreground">Token Savings:</span>
								<span className={`font-medium ${isSaving ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
									{savings > 0 ? '-' : '+'}{Math.abs(savings).toFixed(1)}%
								</span>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* PTC Benefits */}
			<ScrollArea className="flex-1">
				<div className="p-3 space-y-4">
					{/* How PTC Works */}
					<div className="space-y-2">
						<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
							How PTC Works
						</h4>
						<div className="text-[10px] text-muted-foreground space-y-2 leading-relaxed">
							<p>
								<strong className="text-foreground">Traditional:</strong> LLM calls tools one-by-one,
								requiring multiple round trips and consuming more tokens.
							</p>
							<p>
								<strong className="text-foreground">With PTC:</strong> LLM writes JavaScript code
								with multiple tool calls in a single response, then executes once.
							</p>
						</div>
					</div>

					<Separator />

					{/* Benefits */}
					<div className="space-y-2">
						<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
							Key Benefits
						</h4>
						<div className="space-y-2">
							<div className="flex items-start gap-2">
								<div className="size-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
								<div className="text-[10px] text-muted-foreground">
									<strong className="text-foreground">Reduced Latency:</strong> Fewer LLM round trips
								</div>
							</div>
							<div className="flex items-start gap-2">
								<div className="size-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
								<div className="text-[10px] text-muted-foreground">
									<strong className="text-foreground">Better Context:</strong> LLM maintains execution context
								</div>
							</div>
							<div className="flex items-start gap-2">
								<div className="size-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
								<div className="text-[10px] text-muted-foreground">
									<strong className="text-foreground">Complex Logic:</strong> Conditionals, loops, data processing
								</div>
							</div>
							<div className="flex items-start gap-2">
								<div className="size-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
								<div className="text-[10px] text-muted-foreground">
									<strong className="text-foreground">Token Efficiency:</strong> Consolidated responses
								</div>
							</div>
						</div>
					</div>

					<Separator />

					{/* Example */}
					<div className="space-y-2">
						<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
							Example Use Case
						</h4>
						<div className="text-[10px] text-muted-foreground space-y-2">
							<p className="font-medium text-foreground">
								"Analyze Q4 expenses for Engineering department"
							</p>
							<p>
								<strong className="text-foreground">Without PTC:</strong> Multiple separate tool calls
								for team members, expenses, budget checks, and reporting.
							</p>
							<p>
								<strong className="text-foreground">With PTC:</strong> Single JavaScript program
								that fetches all data, processes it, and generates a comprehensive report.
							</p>
						</div>
					</div>
				</div>
			</ScrollArea>
		</div>
	);
}