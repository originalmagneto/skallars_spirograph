import { supabase } from "@/lib/supabase";

export type AISettingsSnapshot = {
    geminiApiKey: string | null;
    geminiImageApiKey: string | null;
    geminiModel: string | null;
    geminiImageModel: string | null;
    geminiArticleModel: string | null;
    geminiArticleThinkingBudget: number | null;
    geminiArticlePromptDefaultInstructions: string | null;
    geminiArticlePromptSlovakNativeInstructions: string | null;
    geminiTranslationPromptDefaultInstructions: string | null;
    imageEngine: "turbo" | "gemini";
    priceInputPerM: number | null;
    priceOutputPerM: number | null;
    geminiRequestBudgetUsd: number | null;
    geminiQuotaDailyTokens: number | null;
    geminiQuotaMonthlyTokens: number | null;
    geminiQuotaDailyUsd: number | null;
    geminiQuotaMonthlyUsd: number | null;
    geminiRequestCooldownSeconds: number | null;
};

export type GeminiModel = {
    name: string;
    displayName: string;
    description: string;
    supportedGenerationMethods: string[];
};

const DEFAULTS = {
    geminiModel: "gemini-2.0-flash",
    geminiImageModel: "imagen-3.0-generate-001",
    imageEngine: "gemini" as const,
};

const toNumber = (value?: string | null) => {
    if (!value) return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export const fetchAISettings = async (): Promise<AISettingsSnapshot> => {
    const { data } = await supabase.from("settings").select("key, value");
    const map: Record<string, string> = {};
    (data || []).forEach((row: any) => {
        if (row.key) map[row.key] = row.value;
    });

    const imageEngine = map.image_model === "turbo" ? "turbo" : "gemini";
    return {
        geminiApiKey: map.gemini_api_key || null,
        geminiImageApiKey: map.gemini_image_api_key || null,
        geminiModel: map.gemini_model || DEFAULTS.geminiModel,
        geminiImageModel: map.gemini_image_model || DEFAULTS.geminiImageModel,
        geminiArticleModel: map.gemini_article_model || null,
        geminiArticleThinkingBudget: toNumber(map.gemini_article_thinking_budget),
        geminiArticlePromptDefaultInstructions: map.gemini_article_prompt_default_instructions || null,
        geminiArticlePromptSlovakNativeInstructions: map.gemini_article_prompt_slovak_native_instructions || null,
        geminiTranslationPromptDefaultInstructions: map.gemini_translation_prompt_default_instructions || null,
        imageEngine,
        priceInputPerM: toNumber(map.gemini_price_input_per_million),
        priceOutputPerM: toNumber(map.gemini_price_output_per_million),
        geminiRequestBudgetUsd: toNumber(map.gemini_request_budget_usd),
        geminiQuotaDailyTokens: toNumber(map.gemini_quota_daily_tokens),
        geminiQuotaMonthlyTokens: toNumber(map.gemini_quota_monthly_tokens),
        geminiQuotaDailyUsd: toNumber(map.gemini_quota_daily_usd),
        geminiQuotaMonthlyUsd: toNumber(map.gemini_quota_monthly_usd),
        geminiRequestCooldownSeconds: toNumber(map.gemini_request_cooldown_seconds),
    };
};

export const resolveImageKey = (settings: AISettingsSnapshot) => {
    return settings.geminiImageApiKey || settings.geminiApiKey || "";
};

export const fetchGeminiModels = async (apiKey: string): Promise<GeminiModel[]> => {
    if (!apiKey) return [];
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!response.ok) throw new Error("Unable to load models");
    const data = await response.json();
    return (data.models || []).map((model: any) => ({
        name: model.name.replace("models/", ""),
        displayName: model.displayName || model.name.replace("models/", ""),
        description: model.description || "",
        supportedGenerationMethods: model.supportedGenerationMethods || [],
    }));
};

export const filterTextModels = (models: GeminiModel[]) =>
    models.filter(
        (model) =>
            model.supportedGenerationMethods.includes("generateContent") &&
            model.name.includes("gemini")
    );

export const filterImageModels = (models: GeminiModel[]) =>
    models.filter(
        (model) =>
            model.supportedGenerationMethods.includes("imageGeneration") ||
            model.supportedGenerationMethods.includes("predict") ||
            model.supportedGenerationMethods.includes("generateContent") ||
            model.name.includes("imagen") ||
            model.name.includes("image")
    );
