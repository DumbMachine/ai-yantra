"use client";
import React from "react";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { LanguageModelUsage, TextUIPart, ToolUIPart, UIMessage } from "ai";

import {
	Attachment,
	AttachmentPreview,
	AttachmentRemove,
	Attachments,
} from "@/components/ai-elements/attachments";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorLogoGroup,
	ModelSelectorName,
	ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	PromptInputHeader,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { CheckIcon, Code2, Database, GlobeIcon, Search } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "@/components/ai-elements/tool";

import {
	Context,
	ContextContent,
	ContextContentBody,
	ContextContentFooter,
	ContextContentHeader,
	ContextTrigger,
} from "@/components/ai-elements/context";
import { PgFsFilePanel } from "@/components/ai-elements/pgfs-file-panel";
import { ToolSearchPanel } from "@/components/ai-elements/tool-search-panel";
import { PTCPanel } from "@/components/ai-elements/ptc-panel";
import { DemosMenu } from "@/components/navigation-header";
import { cn } from "@/lib/utils";
import { TOTAL_TOOLS } from "@/lib/example-tools";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

// Demo configurations
type DemoType = "chat" | "pg-fs" | "programmable-calls" | "tool-search";

interface DemoConfig {
	id: DemoType;
	name: string;
	description: string;
	icon: React.ElementType;
	apiEndpoint: string;
}

const demos: DemoConfig[] = [
	{
		id: "pg-fs",
		name: "pg-fs Coding Agent",
		description: "AI-powered coding with PostgreSQL-backed filesystem",
		icon: Database,
		apiEndpoint: "/api/chat",
	},
	{
		id: "chat",
		name: "Chat",
		description: "Multi-provider chat interface",
		icon: GlobeIcon,
		apiEndpoint: "/api/chat",
	},
	{
		id: "programmable-calls",
		name: "Programmable Tool Calls",
		description: "Dynamic tool orchestration and execution",
		icon: Code2,
		apiEndpoint: "/api/chat",
	},
	{
		id: "tool-search",
		name: "Tool Search",
		description: "Regex & BM25 tool discovery without context flooding",
		icon: Search,
		apiEndpoint: "/api/chat",
	},
];

const suggestionsMap: Map<DemoType, string[]> = new Map([
	[
		"pg-fs",
		[
			"What's in the markting folder?",
			"Create a haiku about postgres as a file system",
			"Put that into a new folder for haikus",
		],
	],
	["programmable-calls", []],
	["tool-search", []],
	["chat", []],
]);

// Model definitions with provider/model format
const models = [
	{
		chef: "OpenAI",
		chefSlug: "openai",
		id: "openai/gpt-4o",
		name: "GPT-4o",
		providers: ["openai"],
	},
	{
		chef: "OpenAI",
		chefSlug: "openai",
		id: "openai/gpt-4o-mini",
		name: "GPT-4o Mini",
		providers: ["openai"],
	},
	{
		chef: "Anthropic",
		chefSlug: "anthropic",
		id: "anthropic/claude-opus-4-20250514",
		name: "Claude 4 Opus",
		providers: ["anthropic"],
	},
	{
		chef: "Anthropic",
		chefSlug: "anthropic",
		id: "anthropic/claude-sonnet-4-20250514",
		name: "Claude 4 Sonnet",
		providers: ["anthropic"],
	},
	{
		chef: "GitHub Copilot",
		chefSlug: "github-copilot",
		id: "github-copilot/grok-code-fast-1",
		name: "Grok Code Fast",
		providers: ["github-copilot"],
	},
	{
		chef: "GitHub Copilot",
		chefSlug: "github-copilot",
		id: "github-copilot/claude-sonnet-4.5",
		name: "Claude Sonnet 4.5",
		providers: ["github-copilot"],
	},
];

const chefs = ["OpenAI", "Anthropic", "GitHub Copilot"];

const AttachmentItem = ({
	attachment,
	onRemove,
}: {
	attachment: { id: string; name: string; type: string; url: string };
	onRemove: (id: string) => void;
}) => {
	const handleRemove = useCallback(() => {
		onRemove(attachment.id);
	}, [onRemove, attachment.id]);

	return (
		<Attachment
			data={{
				id: attachment.id,
				url: attachment.url,
				mediaType: attachment.type,
				filename: attachment.name,
				type: "file",
			}}
			onRemove={handleRemove}
		>
			<AttachmentPreview />
			<AttachmentRemove />
		</Attachment>
	);
};

const SuggestionItem = ({
	suggestion,
	onClick,
}: {
	suggestion: string;
	onClick: (suggestion: string) => void;
}) => {
	const handleClick = useCallback(() => {
		onClick(suggestion);
	}, [onClick, suggestion]);

	return <Suggestion onClick={handleClick} suggestion={suggestion} />;
};

const PromptInputAttachmentsDisplay = () => {
	const attachments = usePromptInputAttachments();

	const handleRemove = useCallback(
		(id: string) => {
			attachments.remove(id);
		},
		[attachments],
	);

	if (attachments.files.length === 0) {
		return null;
	}

	return (
		<Attachments variant="inline">
			{attachments.files.map((attachment) => (
				<AttachmentItem
					attachment={{
						id: attachment.id,
						name: attachment.filename || "file",
						type: attachment.mediaType || "application/octet-stream",
						url: attachment.url,
					}}
					key={attachment.id}
					onRemove={handleRemove}
				/>
			))}
		</Attachments>
	);
};

const ModelItem = ({
	m,
	isSelected,
	onSelect,
}: {
	m: (typeof models)[0];
	isSelected: boolean;
	onSelect: (id: string) => void;
}) => {
	const handleSelect = useCallback(() => {
		onSelect(m.id);
	}, [onSelect, m.id]);

	return (
		<ModelSelectorItem onSelect={handleSelect} value={m.id}>
			<ModelSelectorLogo provider={m.chefSlug} />
			<ModelSelectorName>{m.name}</ModelSelectorName>
			<ModelSelectorLogoGroup>
				{m.providers.map((provider) => (
					<ModelSelectorLogo key={provider} provider={provider} />
				))}
			</ModelSelectorLogoGroup>
			{isSelected ? (
				<CheckIcon className="ml-auto size-4" />
			) : (
				<div className="ml-auto size-4" />
			)}
		</ModelSelectorItem>
	);
};

const Example = () => {
	const [activeDemo, setActiveDemo] = useState<DemoType>("pg-fs");
	const [model, setModel] = useState<string>(models[4].id); // Default to GitHub Copilot
	const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
	const [text, setText] = useState<string>("");
	const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
	const [usage, setUsage] = useState<LanguageModelUsage | undefined>(undefined);
	const usageRef = useRef<LanguageModelUsage | undefined>(undefined);
	const [activeTools, setActiveTools] = useState<string[]>([]);
	const [usePTC, setUsePTC] = useState<boolean>(true);
	const [ptcTokenUsage, setPtcTokenUsage] = useState<{
		ptc?: number;
		regular?: number;
	}>({});

	const currentDemo = demos.find((d) => d.id === activeDemo) || demos[0];
	const suggestions = useMemo(() => {
		return suggestionsMap.get(activeDemo) || [];
	}, [activeDemo]);

	const handleSuggestionClick = useCallback((suggestion: string) => {
		setText(suggestion);
	}, []);

	const { messages, sendMessage, status, error } = useChat({
		transport: new DefaultChatTransport({
			api: currentDemo.apiEndpoint,
		}),
		onData: (message) => {
			console.log("Received message:", { message });
			switch (message.type) {
				case "data-usage": {
					const usageData = message.data as LanguageModelUsage;
					usageRef.current = usageData;
					setUsage(usageData);
					break;
				}
				case "data-active-tools": {
					const toolsData = message.data as {
						activeTools: string[];
						totalTools: number;
						strategy: string;
					};
					setActiveTools(toolsData.activeTools);
					break;
				}
				case "data-ptc-tokens": {
					const tokenData = message.data as { ptc?: number; regular?: number };
					setPtcTokenUsage((prev) => ({
						...prev,
						...tokenData,
					}));
					break;
				}
			}
		},
	});

	const selectedModelData = useMemo(
		() => models.find((m) => m.id === model),
		[model],
	);

	const handleSubmit = useCallback(
		(message: PromptInputMessage) => {
			const hasText = Boolean(message.text);
			const hasAttachments = Boolean(message.files?.length);

			if (!(hasText || hasAttachments)) {
				return;
			}

			if (message.files?.length) {
				toast.success("Files attached", {
					description: `${message.files.length} file(s) attached to message`,
				});
			}

			// Send message with model in the body
			sendMessage(
				{ text: message.text || "Sent with attachments" },
				{
					body: {
						model: model,
						activeDemo,
						usePTC: activeDemo === "programmable-calls" ? usePTC : undefined,
					},
				},
			);
			setText("");
		},
		[sendMessage, model, activeDemo, usePTC],
	);

	const handleTextChange = useCallback(
		(event: React.ChangeEvent<HTMLTextAreaElement>) => {
			setText(event.target.value);
		},
		[],
	);

	const toggleWebSearch = useCallback(() => {
		setUseWebSearch((prev) => !prev);
	}, []);

	const handleModelSelect = useCallback((modelId: string) => {
		setModel(modelId);
		setModelSelectorOpen(false);
	}, []);

	const isSubmitDisabled = useMemo(
		() => !(text.trim() || status) || status === "streaming",
		[text, status],
	);

	// Extract text content from message parts
	const getMessageText = useCallback((message: UIMessage) => {
		return message.parts
			.filter((part): part is TextUIPart => part.type === "text")
			.map((part) => part.text)
			.join("");
	}, []);

	const maxTokens = selectedModelData?.chef === "Anthropic" ? 200000 : 128000;
	const usedTokens = usage?.totalTokens ?? 0;

	return (
		// <div className="flex h-[calc(100vh-1px)]">
		<div className="flex h-full">
			{activeDemo === "pg-fs" && (
				<PgFsFilePanel isActive={activeDemo === "pg-fs"} />
			)}
			{activeDemo === "tool-search" && (
				<ToolSearchPanel
					activeTools={activeTools}
					totalTools={TOTAL_TOOLS}
					isActive={activeDemo === "tool-search"}
				/>
			)}
			{activeDemo === "programmable-calls" && (
				<PTCPanel
					usePTC={usePTC}
					onTogglePTC={setUsePTC}
					tokenUsage={ptcTokenUsage}
					isActive={activeDemo === "programmable-calls"}
				/>
			)}

			<div className="relative flex flex-1 flex-col divide-y">
				{/* Demo & Context Header */}
				<div className="flex items-center justify-between px-4 border-b bg-background h-12">
					<DemosMenu
						onSelect={(id) => setActiveDemo(id as DemoType)}
						activeId={activeDemo}
					/>

					<div className="flex-1" />
					<Context
						maxTokens={maxTokens}
						modelId={model.split("/")[1]}
						usedTokens={usedTokens}
						usage={usage}
					>
						<ContextTrigger />
						<ContextContent>
							<ContextContentHeader />
							<ContextContentBody />
							<ContextContentFooter />
						</ContextContent>
					</Context>
				</div>

				<Conversation className="">
					<ConversationContent className="h-full overflow-y-auto no-scrollbar">
						{messages.map((message, idx) => (
							<div
								key={message.id}
								className={cn(
									message.role === "user"
										? "flex-1 flex-col items-end self-end"
										: "flex-1 flex-col items-start",
								)}
							>
								{message.parts && message.parts.length > 0 ? (
									message.parts.map((part, i) => {
										switch (part.type) {
											case "text": {
												// For user messages, use RichMessageContent to render inline mentions
												if (message.role === "user") {
													return (
														<React.Fragment key={`${message.id}-${i}`}>
															<Message from="user">
																<MessageContent>
																	{/* <RichMessageContent parts={message.parts} /> */}
																	<MessageResponse>{part.text}</MessageResponse>
																</MessageContent>
															</Message>
														</React.Fragment>
													);
												}

												// For assistant/system messages, render plain text
												return (
													<React.Fragment key={`${message.id}-${i}`}>
														<Message
															from={
																message.role as "user" | "assistant" | "system"
															}
														>
															<MessageContent>
																<MessageResponse>{part.text}</MessageResponse>
															</MessageContent>
														</Message>
													</React.Fragment>
												);
											}

											default: {
												if (part.type.startsWith("tool-")) {
													const toolPart = part as ToolUIPart;
													return (
														<div
															key={`${message.id}-tool-call-${i}`}
															className=""
														>
															<Tool defaultOpen={true}>
																<ToolHeader
																	type={toolPart.type}
																	state={toolPart.state}
																/>
																<ToolContent>
																	<ToolInput input={toolPart.input ?? "{}"} />
																	<ToolOutput
																		output={
																			<MessageResponse>
																				{JSON.stringify(
																					toolPart.output ?? "",
																					null,
																					2,
																				)}
																			</MessageResponse>
																		}
																		errorText={toolPart.errorText ?? ""}
																	/>
																</ToolContent>
															</Tool>
														</div>
													);
												}

												const ignoredTypes = ["step-start"];
												if (ignoredTypes.includes(part.type)) {
													return null;
												}

												console.warn("Unknown message part type:", {
													type: part.type,
													part,
												});
												return null;
											}
										}
									})
								) : (
									// This is a fallback for messages without parts, prolly not the case anymore since uimessage supports parts
									<Message
										from={message.role as "user" | "assistant" | "system"}
										key={message.id}
									>
										<MessageContent>
											{/* <MessageResponse>No content</MessageResponse> */}
										</MessageContent>
									</Message>
								)}
							</div>
						))}

						{status === "streaming" && (
							<Message from="assistant" key="streaming-indicator">
								<MessageContent>
									<MessageResponse>Thinking...</MessageResponse>
								</MessageContent>
							</Message>
						)}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				{error && (
					<div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
						An error occurred: {error.message}
					</div>
				)}

				<div className="grid shrink-0 gap-4 pt-4">
					<Suggestions className="px-4">
						{suggestions.map((suggestion) => (
							<SuggestionItem
								key={suggestion}
								onClick={handleSuggestionClick}
								suggestion={suggestion}
							/>
						))}
					</Suggestions>
					<div className="w-full px-4 pb-4">
						<PromptInput globalDrop multiple onSubmit={handleSubmit}>
							<PromptInputHeader>
								<PromptInputAttachmentsDisplay />
							</PromptInputHeader>
							<PromptInputBody>
								<PromptInputTextarea onChange={handleTextChange} value={text} />
							</PromptInputBody>
							<PromptInputFooter>
								<PromptInputTools>
									<PromptInputActionMenu>
										<PromptInputActionMenuTrigger />
										<PromptInputActionMenuContent>
											<PromptInputActionAddAttachments />
										</PromptInputActionMenuContent>
									</PromptInputActionMenu>
									<ModelSelector
										onOpenChange={setModelSelectorOpen}
										open={modelSelectorOpen}
									>
										<ModelSelectorTrigger>
											<PromptInputButton>
												{selectedModelData?.chefSlug && (
													<ModelSelectorLogo
														provider={selectedModelData.chefSlug}
													/>
												)}
												{selectedModelData?.name && (
													<ModelSelectorName>
														{selectedModelData.name}
													</ModelSelectorName>
												)}
											</PromptInputButton>
										</ModelSelectorTrigger>
										<ModelSelectorContent>
											<ModelSelectorInput placeholder="Search models..." />
											<ModelSelectorList>
												<ModelSelectorEmpty>
													No models found.
												</ModelSelectorEmpty>
												{chefs.map((chef) => (
													<ModelSelectorGroup heading={chef} key={chef}>
														{models
															.filter((m) => m.chef === chef)
															.map((m) => (
																<ModelItem
																	isSelected={model === m.id}
																	key={m.id}
																	m={m}
																	onSelect={handleModelSelect}
																/>
															))}
													</ModelSelectorGroup>
												))}
											</ModelSelectorList>
										</ModelSelectorContent>
									</ModelSelector>
								</PromptInputTools>
								<PromptInputSubmit
									disabled={isSubmitDisabled}
									status={status}
								/>
							</PromptInputFooter>
						</PromptInput>
					</div>
				</div>
			</div>
		</div>
	);
};

export default function Page() {
	return (
		<div className="h-[calc(100vh-80px)] w-full">
			<Example />
		</div>
	);
}
