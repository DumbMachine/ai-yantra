import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type ModelProviderFunction = (modelName: string) => LanguageModel;

export function getModelProvider(modelSlug: string): LanguageModel {
	const [provider, modelName] = modelSlug.split("/");

	const lmstudio = createOpenAICompatible({
		name: "lmstudio",
		baseURL: "http://localhost:4141",
	});

	// Provider mapping with proper types
	const providers: Record<string, ModelProviderFunction> = {
		openai,
		anthropic,
		lmstudio,
	};

	// Validate provider exists
	if (!provider || !modelName) {
		throw new Error(
			`Invalid model slug format: "${modelSlug}". Expected format: "provider/model-name"`,
		);
	}

	const selectedProvider = providers[provider.toLowerCase()];

	if (!selectedProvider) {
		throw new Error(
			`Unknown provider: "${provider}". Available providers: ${Object.keys(providers).join(", ")}`,
		);
	}

	// Return the model instance
	try {
		return selectedProvider(modelName);
	} catch (error) {
		throw new Error(
			`Failed to initialize model "${modelName}" with provider "${provider}": ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

// Optional: Helper function for safe model provider retrieval
export function getModelProviderSafe(modelSlug: string): {
	success: boolean;
	model: LanguageModel | null;
	error: string | null;
} {
	try {
		return { success: true, model: getModelProvider(modelSlug), error: null };
	} catch (error) {
		return {
			success: false,
			model: null,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
