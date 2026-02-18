"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
	ScrollArea,
	ScrollBar,
} from "@/components/ui/scroll-area";
import type { ComponentProps } from "react";
import { useCallback } from "react";

export interface DemoScenario {
	id: string;
	title: string;
	description: string;
	message: string;
	badge?: string;
}

export type ScenarioCardsProps = ComponentProps<typeof ScrollArea>;

export const ScenarioCards = ({
	className,
	children,
	...props
}: ScenarioCardsProps) => (
	<ScrollArea className="w-full overflow-x-auto whitespace-nowrap" {...props}>
		<div
			className={cn(
				"flex w-max flex-nowrap items-stretch gap-2",
				className,
			)}
		>
			{children}
		</div>
		<ScrollBar className="hidden" orientation="horizontal" />
	</ScrollArea>
);

export interface ScenarioCardProps {
	scenario: DemoScenario;
	onClick?: (message: string) => void;
	className?: string;
}

export const ScenarioCard = ({
	scenario,
	onClick,
	className,
}: ScenarioCardProps) => {
	const handleClick = useCallback(() => {
		onClick?.(scenario.message);
	}, [onClick, scenario.message]);

	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				"flex flex-col items-start gap-1.5 rounded-lg border border-border/60 bg-card px-3.5 py-2.5",
				"text-left whitespace-normal cursor-pointer transition-all",
				"hover:border-border hover:bg-muted/50 hover:shadow-sm",
				"w-[220px] shrink-0",
				className,
			)}
		>
			<div className="flex items-center gap-2 w-full">
				<span className="text-xs font-medium text-foreground leading-tight line-clamp-1">
					{scenario.title}
				</span>
				{scenario.badge && (
					<Badge
						variant="secondary"
						className="text-[9px] px-1.5 py-0 h-4 shrink-0 ml-auto"
					>
						{scenario.badge}
					</Badge>
				)}
			</div>
			<span className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
				{scenario.description}
			</span>
		</button>
	);
};
