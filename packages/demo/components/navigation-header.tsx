"use client";

import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { BookOpen, Brain, Code2, Database, Search, Terminal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const demos = [
	{
		id: "pg-fs",
		title: "pg-fs Coding Agent",
		href: "/pg-fs",
		description: "AI-powered coding with PostgreSQL-backed filesystem",
		icon: Database,
	},
	{
		id: "programmable-calls",
		title: "Programmable Calls",
		description: "Dynamic tool orchestration and execution",
		icon: Code2,
	},
	{
		id: "tool-search",
		title: "Tool Search",
		href: "/tool-search",
		description: "Regex & BM25 tool discovery without context flooding",
		icon: Search,
	},
	{
		id: "skills",
		title: "Agent Skills",
		description: "Progressive skill loading from ~/.skills",
		icon: BookOpen,
	},
	{
		id: "memory",
		title: "Memory",
		description: "Persistent agent memory across conversations",
		icon: Brain,
	},
	{
		id: "chat",
		title: "Chat",
		href: "/chat",
		description: "Multi-provider chat interface",
		icon: Terminal,
	},
];

export function DemosMenu({
	onSelect,
	activeId,
}: {
	onSelect?: (id: string) => void;
	activeId?: string;
}) {
	const pathname = usePathname();

	return (
		<NavigationMenu className="flex-1">
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuTrigger className="text-xs">
						Demos
					</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="w-100 p-2">
							<div className="mb-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
								Choose a demo
							</div>
							<div className="grid gap-1">
								{demos.map((demo) => {
									const Icon = demo.icon;
									const isActive = onSelect
										? activeId === demo.id
										: pathname === demo.href;

									if (onSelect) {
										return (
											<button
												key={demo.id}
												onClick={() => onSelect(demo.id)}
												className={cn(
													"flex items-start gap-3 rounded-none p-2.5 transition-colors text-left",
													"hover:bg-muted focus:bg-muted",
													isActive && "bg-muted/50",
												)}
											>
												<Icon className="mt-0.5 size-4 text-muted-foreground" />
												<div className="flex flex-col gap-0.5">
													<span className="text-xs font-medium">
														{demo.title}
													</span>
													<span className="text-[10px] text-muted-foreground line-clamp-1">
														{demo.description}
													</span>
												</div>
											</button>
										);
									}

									return (
										<Link
											key={demo.href}
											href={demo.href}
											className={cn(
												"flex items-start gap-3 rounded-none p-2.5 transition-colors",
												"hover:bg-muted focus:bg-muted",
												isActive && "bg-muted/50",
											)}
										>
											<Icon className="mt-0.5 size-4 text-muted-foreground" />
											<div className="flex flex-col gap-0.5">
												<span className="text-xs font-medium">
													{demo.title}
												</span>
												<span className="text-[10px] text-muted-foreground line-clamp-1">
													{demo.description}
												</span>
											</div>
										</Link>
									);
								})}
							</div>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	);
}

export function Header() {
	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 items-center px-4">
				<Link href="/" className="flex items-center gap-x-2 font-semibold">
					<span className="text-sm">CIPHER</span>
				</Link>
			</div>
		</header>
	);
}
