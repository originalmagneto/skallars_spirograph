import { supabase } from "@/lib/supabase";
import { AI_PROMPT_DEFAULTS } from "@/lib/aiSettings";

export interface GeneratedArticle {
    slug?: string;  // URL-friendly identifier
    title_sk?: string;
    title_en?: string;
    title_de?: string;
    title_cn?: string;
    excerpt_sk?: string;
    excerpt_en?: string;
    excerpt_de?: string;
    excerpt_cn?: string;
    content_sk?: string;
    content_en?: string;
    content_de?: string;
    content_cn?: string;
    meta_title_sk?: string;
    meta_title_en?: string;
    meta_title_de?: string;
    meta_title_cn?: string;
    meta_description_sk?: string;
    meta_description_en?: string;
    meta_description_de?: string;
    meta_description_cn?: string;
    meta_keywords_sk?: string;
    meta_keywords_en?: string;
    meta_keywords_de?: string;
    meta_keywords_cn?: string;
    tags: string[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    sources?: Array<{ title?: string; url?: string }>;
}

export interface ResearchPack {
    summary?: string;
    key_points?: string[];
    facts?: string[];
    outline?: string[];
    sources?: Array<{ title?: string; url?: string }>;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export type RecoverableArticleGenerationError = Error & {
    code?: 'ARTICLE_OUTPUT_RECOVERABLE';
    rawOutput?: string;
    model?: string;
    targetLanguages?: string[];
    groundedSources?: Array<{ title?: string; url?: string }>;
};

export const hasRecoverableArticleOutput = (error: unknown): error is RecoverableArticleGenerationError => {
    if (!error || typeof error !== 'object') return false;
    const rawOutput = (error as RecoverableArticleGenerationError).rawOutput;
    return typeof rawOutput === 'string' && rawOutput.trim().length > 0;
};

const SETTINGS_CACHE_TTL_MS = 30_000;
let settingsCache: Record<string, string> | null = null;
let settingsCacheTs = 0;

/**
 * Fetch with automatic retry for transient errors (503, 429).
 * Uses exponential backoff: 2s, 4s, 8s delays between retries.
 * If a preview model fails after all retries, automatically fallback to stable model.
 */
const FALLBACK_STABLE_MODEL = 'gemini-2.5-flash';

const fetchWithRetry = async (
    url: string,
    options: RequestInit,
    maxRetries = 3
): Promise<Response> => {
    let lastError: Error | null = null;
    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            // Retry on 503 (overloaded) or 429 (rate limit)
            if (response.status === 503 || response.status === 429) {
                lastResponse = response;
                const delayMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
                console.warn(`[AI] ${response.status} error, retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
            }
            return response;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            // Network errors: retry with backoff
            if (attempt < maxRetries - 1) {
                const delayMs = Math.pow(2, attempt + 1) * 1000;
                console.warn(`[AI] Network error, retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    // If we exhausted retries and this was a preview model, try fallback to stable model
    const isPreviewModel = url.includes('-preview');
    if (isPreviewModel && lastResponse && (lastResponse.status === 503 || lastResponse.status === 429)) {
        console.warn(`[AI] Preview model overloaded. Falling back to stable model: ${FALLBACK_STABLE_MODEL}`);
        const fallbackUrl = url.replace(/gemini-[^:]+/, FALLBACK_STABLE_MODEL);
        try {
            const fallbackResponse = await fetch(fallbackUrl, options);
            if (fallbackResponse.ok || (fallbackResponse.status !== 503 && fallbackResponse.status !== 429)) {
                console.log(`[AI] Fallback to ${FALLBACK_STABLE_MODEL} succeeded`);
                return fallbackResponse;
            }
        } catch (fallbackErr) {
            console.error('[AI] Fallback model also failed:', fallbackErr);
        }
    }

    throw lastError || new Error('Request failed after retries');
};

const loadSettingsMap = async () => {
    const now = Date.now();
    if (settingsCache && now - settingsCacheTs < SETTINGS_CACHE_TTL_MS) {
        return settingsCache;
    }

    const { data, error } = await supabase
        .from('settings')
        .select('key, value');

    if (error || !data) {
        console.warn('[AI Settings] Failed to load settings from Supabase:', error?.message || 'No data returned');
        return settingsCache || {};
    }

    const map: Record<string, string> = {};
    data.forEach((row: any) => {
        if (row?.key) map[row.key] = row.value;
    });
    settingsCache = map;
    settingsCacheTs = now;
    return map;
};

async function getSetting(key: string): Promise<string | null> {
    const map = await loadSettingsMap();
    return map[key] ?? null;
}

const toNumber = (value?: string | null) => {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
};

const getArticleModelSetting = async () => {
    // Priority: Global model from Settings is the default.
    // gemini_article_model is only used if explicitly saved in Power Controls.
    const globalModel = await getSetting('gemini_model');
    if (globalModel) return globalModel;
    const articleModel = await getSetting('gemini_article_model');
    if (articleModel) return articleModel;
    return 'gemini-2.0-flash';
};

const getArticleThinkingBudget = async () => {
    return toNumber(await getSetting('gemini_article_thinking_budget'));
};

const estimateMaxOutputTokens = (targetWordCount?: number, languageCount?: number) => {
    const words = targetWordCount && targetWordCount > 0 ? targetWordCount : 800;
    const langs = languageCount && languageCount > 0 ? languageCount : 1;
    const estimated = Math.round(words * langs * 2.5); // increased multiplier for formatting overhead
    // Cap at 32k to be safe for most modern models, but allow growing
    return Math.min(32768, Math.max(4096, estimated));
};

type ModelConfig = {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    systemInstructionAddon?: string;
    supportsThinking: boolean;
};

const getModelConfig = (model: string): ModelConfig => {
    const isPro = /pro/i.test(model);
    const isUltra = /ultra/i.test(model);
    const isFlash = /flash/i.test(model);
    const isThinking = /thinking/i.test(model);
    const isV3 = /gemini[-]?3/i.test(model); // Supports -3.0 or -3

    // Default (Flash 2.0/standard) - Increased baseline for multilang
    let config: ModelConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 16384, // Increased from 8192 to support longer articles
        supportsThinking: isThinking
    };

    if (isV3 || isPro || isUltra) {
        // High-reasoning models: Lower temp for precision, higher instruction complexity allowed
        config.temperature = 0.4;
        config.systemInstructionAddon = "Deploy your advanced reasoning capabilities to ensure maximum depth, nuance, and logical coherence.";
        config.maxOutputTokens = 32768; // Enable longer context for stronger models
    }

    if (isFlash && !isThinking) {
        // Fast models: Higher temp often helps creativity as they can be dry
        config.temperature = 0.7;
    }

    // Specific tuning for known versions
    if (isV3) {
        config.maxOutputTokens = 65536; // V3 supports massive outputs
        config.temperature = 0.3; // V3 is very steerable, lower temp prevents hallucination
    }

    return config;
};

const buildThinkingConfig = (model: string, thinkingBudget?: number | null) => {
    // Gemini 3: Use thinking_level
    // Default to 'high' as it mimics the previous 'enabled' state for reasoning models
    if (/gemini-?3/i.test(model)) {
        return { thinking_config: { thinking_level: "high" } };
    }

    // Gemini 2: Use thinking_budget_token_count
    if (!thinkingBudget || thinkingBudget <= 0) return null;
    // Only apply thinking config to models that explicitly recognize it (e.g. "flash-thinking")
    // sending this config to standard models (like gemini-2.5-flash) causes 400 errors.
    if (!/thinking/i.test(model)) return null;
    return {
        thinking_config: { include_thoughts: true, thinking_budget_token_count: thinkingBudget }
    };
};

const formatGeminiError = (result: any) => {
    const blockReason = result?.promptFeedback?.blockReason;
    const safetyRatings = result?.promptFeedback?.safetyRatings;
    const finishReason = result?.candidates?.[0]?.finishReason;
    const modelVersion = result?.modelVersion;
    if (blockReason) {
        return `Blocked by safety filters: ${blockReason}${safetyRatings ? ` (${JSON.stringify(safetyRatings)})` : ''}`;
    }
    if (finishReason) {
        return `No content returned (finishReason: ${finishReason}${modelVersion ? `, model: ${modelVersion}` : ''}). Try increasing maxOutputTokens or changing the model in AI Settings.`;
    }
    try {
        return `No candidates returned. Raw response: ${JSON.stringify(result).slice(0, 800)}`;
    } catch {
        return 'No candidates returned by Gemini.';
    }
};

const extractJsonText = (content: string) => {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/);
    let cleanContent = jsonMatch ? jsonMatch[1] : content;

    const findJsonCandidate = (text: string): string => {
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            const candidate = text.substring(firstOpen, lastClose + 1);
            try {
                JSON.parse(candidate);
                return candidate;
            } catch {
                // If this block is invalid, maybe we captured garbage before the real JSON.
                // Try finding the next '{' inside the current range.
                const nextOpen = text.indexOf('{', firstOpen + 1);
                if (nextOpen !== -1 && nextOpen < lastClose) {
                    return findJsonCandidate(text.substring(nextOpen));
                }
            }
            return candidate; // Fallback to the widest capture if recursive search fails
        }
        return text;
    };

    return findJsonCandidate(cleanContent);
};

const tryParseJson = (content: string) => {
    const cleanContent = extractJsonText(content);
    try {
        return JSON.parse(cleanContent);
    } catch {
        return null;
    }
};

const extractTextFromCandidate = (candidate: any) => {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts
        .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
        .join('')
        .trim();
};

/**
 * Convert common markdown syntax to HTML.
 * Handles **bold**, *italic*, __bold__, _italic_.
 */
const convertMarkdownToHtml = (html: string): string => {
    if (!html) return html;
    return html
        // Bold: **text** or __text__
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        // Italic: *text* or _text_ (but not inside URLs or words)
        .replace(/(?<![a-zA-Z0-9])\*([^*\n]+)\*(?![a-zA-Z0-9])/g, '<em>$1</em>')
        .replace(/(?<![a-zA-Z0-9])_([^_\n]+)_(?![a-zA-Z0-9])/g, '<em>$1</em>');
};

const repairJsonWithGemini = async (
    rawContent: string,
    selectedModel: string,
    apiKey: string,
    signal?: AbortSignal
) => {
    const prompt = `You are a JSON repair tool. Your task:
1) Convert the input into STRICT valid JSON.
2) Preserve all fields and values.
3) Output ONLY JSON (no markdown, no commentary).

INPUT:
${rawContent}`;

    const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            response_mime_type: "application/json",
            temperature: 0,
            // Repair payloads can be very large for multilingual Deep Dive outputs.
            maxOutputTokens: 16384
        }
    };

    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini JSON repair failed: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const repaired = extractTextFromCandidate(result?.candidates?.[0]);
    if (!repaired) {
        throw new Error(formatGeminiError(result));
    }
    const parsed = tryParseJson(repaired);
    if (!parsed) {
        throw new Error('JSON repair did not return valid JSON.');
    }
    return parsed;
};

const normalizeArticleHtml = (html: string) => {
    if (!html) return '';
    const trimmed = html.trim();
    if (!trimmed) return '';
    const hasBlockTags = /<(p|h1|h2|h3|h4|ul|ol|li|blockquote|table|figure)\b/i.test(trimmed);
    if (hasBlockTags) return trimmed;

    const paragraphs = trimmed
        .replace(/\r/g, '')
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => `<p>${block.replace(/\n+/g, '<br />')}</p>`);

    return paragraphs.join('\n');
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const rawTextToHtml = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const blocks = trimmed
        .replace(/\r/g, '')
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean);
    if (blocks.length === 0) return '';
    return blocks
        .map((block) => `<p>${escapeHtml(block).replace(/\n+/g, '<br />')}</p>`)
        .join('\n');
};

const slugifyHeading = (text: string) => {
    const normalized = text
        .toLowerCase()
        .replace(/<[^>]+>/g, ' ')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return encodeURIComponent(normalized || text.toLowerCase().trim());
};

const addHeadingAnchors = (html: string) => {
    if (!html) return html;
    const used: Record<string, number> = {};
    return html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
        if (/id=/.test(attrs) || /anchor-link/.test(inner)) return match;
        const textOnly = inner.replace(/<[^>]+>/g, '').trim();
        if (!textOnly) return match;
        let slug = slugifyHeading(textOnly);
        const count = used[slug] || 0;
        used[slug] = count + 1;
        if (count > 0) slug = `${slug}-${count + 1}`;

        const classMatch = attrs.match(/class="([^"]*)"/i);
        const existingClass = classMatch ? classMatch[1] : '';
        const baseClass = `ghost-heading ghost-heading-${level} ghost-heading-group group flex items-center`;
        const mergedClass = existingClass ? `${existingClass} ${baseClass}` : baseClass;
        const cleanedAttrs = attrs.replace(/class="[^"]*"/i, '').trim();
        const classAttr = ` class="${mergedClass.trim()}"`;
        const idAttr = ` id="${slug}"`;
        const anchor = `<a href="#${slug}" class="ghost-anchor-link anchor-link ml-2 text-primary opacity-0 group-hover:opacity-100">#</a>`;
        return `<h${level}${cleanedAttrs ? ' ' + cleanedAttrs : ''}${idAttr}${classAttr}>${inner}${anchor}</h${level}>`;
    });
};

const toUrlSlug = (value: string) => {
    return value
        .toLowerCase()
        .replace(/<[^>]*>/g, ' ')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

const normalizeSourceList = (sources: Array<{ title?: string; url?: string }> = []) => {
    const deduped: Array<{ title?: string; url?: string }> = [];
    sources.forEach((source) => {
        const url = source?.url?.trim();
        if (!url) return;
        if (deduped.some((item) => item.url === url)) return;
        deduped.push({ url, title: source?.title?.trim() || url });
    });
    return deduped;
};

const finalizeRecoveredArticle = (
    payload: any,
    targetLanguages: string[],
    extraSources: Array<{ title?: string; url?: string }> = []
): GeneratedArticle => {
    const result: GeneratedArticle = { ...(payload || {}) };

    targetLanguages.forEach((lang) => {
        const contentField = `content_${lang}` as keyof GeneratedArticle;
        const currentValue = (result as any)[contentField];
        if (typeof currentValue === 'string' && currentValue.trim()) {
            (result as any)[contentField] = addHeadingAnchors(normalizeArticleHtml(convertMarkdownToHtml(currentValue)));
        }
    });

    if (typeof (result as any).tags === 'string') {
        result.tags = String((result as any).tags)
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
    } else if (!Array.isArray(result.tags)) {
        result.tags = [];
    }

    const mergedSources = normalizeSourceList([
        ...(Array.isArray(result.sources) ? result.sources : []),
        ...extraSources
    ]);
    if (mergedSources.length > 0) {
        result.sources = mergedSources;
    }

    if (!result.slug) {
        const fallbackTitle = targetLanguages
            .map((lang) => (result as any)[`title_${lang}`])
            .find((title) => typeof title === 'string' && title.trim().length > 0);
        if (fallbackTitle) {
            result.slug = toUrlSlug(fallbackTitle) || undefined;
        }
    }

    return result;
};

const createRawFallbackArticle = (
    rawOutput: string,
    targetLanguages: string[],
    sources: Array<{ title?: string; url?: string }> = []
): GeneratedArticle => {
    const fallbackBody = normalizeArticleHtml(rawTextToHtml(rawOutput));
    const article: GeneratedArticle = {
        slug: `recovered-${Date.now()}`,
        tags: [],
        sources: normalizeSourceList(sources)
    };

    targetLanguages.forEach((lang) => {
        (article as any)[`title_${lang}`] = 'Recovered AI Draft';
        (article as any)[`excerpt_${lang}`] = 'Recovered from raw AI output after JSON parsing failed. Review and refine before publishing.';
        (article as any)[`content_${lang}`] = fallbackBody || '<p>Recovered draft is empty.</p>';
        (article as any)[`meta_title_${lang}`] = '';
        (article as any)[`meta_description_${lang}`] = '';
        (article as any)[`meta_keywords_${lang}`] = '';
    });

    return article;
};

const fillMissingArticleFields = (payload: any, targetLanguages: string[]) => {
    const result: any = { ...(payload || {}) };
    const firstTitle = targetLanguages
        .map((lang) => String(result[`title_${lang}`] || '').trim())
        .find(Boolean) || 'Recovered AI Draft';
    const firstExcerpt = targetLanguages
        .map((lang) => String(result[`excerpt_${lang}`] || '').trim())
        .find(Boolean) || 'Generated draft. Please review and refine.';
    const firstContent = targetLanguages
        .map((lang) => String(result[`content_${lang}`] || '').trim())
        .find(Boolean) || '<p>Generated draft content is incomplete. Please regenerate or recover from raw output.</p>';

    targetLanguages.forEach((lang) => {
        if (!String(result[`title_${lang}`] || '').trim()) {
            result[`title_${lang}`] = `${firstTitle}`;
        }
        if (!String(result[`excerpt_${lang}`] || '').trim()) {
            result[`excerpt_${lang}`] = firstExcerpt;
        }
        if (!String(result[`content_${lang}`] || '').trim()) {
            result[`content_${lang}`] = firstContent;
        }
        if (result[`meta_title_${lang}`] == null) result[`meta_title_${lang}`] = '';
        if (result[`meta_description_${lang}`] == null) result[`meta_description_${lang}`] = '';
        if (result[`meta_keywords_${lang}`] == null) result[`meta_keywords_${lang}`] = '';
    });

    if (typeof result.tags === 'string') {
        result.tags = result.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }
    if (!Array.isArray(result.tags)) {
        result.tags = [];
    }

    if (!result.slug) {
        result.slug = toUrlSlug(firstTitle) || `recovered-${Date.now()}`;
    }

    return result;
};

const STYLE_GUIDES: Record<string, string> = {
    'Deep Dive': `
- **Structure**: Comprehensive analysis. Introduction -> Background -> Key Issues (H2) -> Detailed Analysis (H3s) -> Strategic Implications -> Conclusion.
- **Tone**: Authoritative, analytical, thought-provoking.
- **Formatting**: Dense with **bolded key concepts**, frequent subheadings, and blockquotes for emphasis.
- **Focus**: Explore the 'why' and 'how'. Connect dots between disparate trends.`,
    'News': `
- **Structure**: Journalistic "Inverted Pyramid". Lead (Who/What/When) -> Key Details (H2) -> Context & Quotes (H3) -> Implementation.
- **Tone**: Objective, factual, concise, urgent.
- **Formatting**: Short paragraphs. **Bold** names and dates. Use blockquotes for statements.
- **Focus**: What happened? Who is involved? Why does it matter right now?`,
    'Trends': `
- **Structure**: Pattern recognition. Current State -> The Shift (H2) -> Evidence/Data (H3s) -> Future Outlook.
- **Tone**: Forward-looking, speculative but grounded, exciting.
- **Formatting**: Use bullet lists for data points. **Bold** prediction statements.
- **Focus**: Identify new shifts. Use data to support predictions.`,
    'Law': `
- **Structure**: Formal legal brief. Issue/Topic -> Relevant Legislation (H2) -> Analysis (H3) -> Practical Application -> Risks.
- **Tone**: Precise, formal, guarded but clear.
- **Formatting**: Strict hierarchy. **Bold** defined terms or specific Act names. Use lists for conditions.
- **Focus**: Cite specific laws (Acts, Paragraphs). Focus on compliance and risk.`,
    'Tax': `
- **Structure**: Advisory. Situation -> Tax Implications (H2) -> Calculations/Examples (H3) -> Recommendations.
- **Tone**: Practical, advisory, detailed.
- **Formatting**: Use lists for steps. **Bold** deadlines and rates.
- **Focus**: Specific tax rates, deadlines, and deductions. Optimization.`,
    'Accounting': `
- **Structure**: Technical. Standard/Principle -> Application (H2) -> Reporting Impact (H3) -> Example.
- **Tone**: Technical, clear, methodical.
- **Formatting**: Structured. **Bold** account names or standards (e.g., **IFRS 16**).
- **Focus**: Financial statements (Balance Sheet, P&L). IFRS/SAS standards.`,
    'Regulatory': `
- **Structure**: Compliance brief. Regulation -> Scope (H2) -> Requirements (H3) -> Timeline -> Action Plan.
- **Tone**: Clear, precise, compliance-first.
- **Formatting**: Checklist style lists. **Bold** dates and penalties.
- **Focus**: Applicability, deadlines, and actionable compliance guidance.`,
};

const LANGUAGE_LABELS: Record<string, string> = {
    sk: 'Slovak (SK)',
    en: 'English (EN)',
    de: 'German (DE)',
    cn: 'Chinese (CN)',
};

const TONE_GUIDES: Record<string, string> = {
    'Client-Friendly': 'Clear, approachable, and confidence-building. Avoid legalese unless essential, explain terms briefly.',
    'Legal Memo': 'Formal, precise, and risk-aware. Use structured reasoning and cite applicable rules where relevant.',
    'News Brief': 'Concise, factual, and timely. Emphasize what happened and why it matters now.',
    'Executive': 'Strategic, high-level, and decision-oriented. Focus on implications, not minutiae.',
    'Neutral': 'Balanced and objective. Avoid strong opinions or marketing language.',
};

const getLengthGuide = (length: string, targetWordCount?: number) => {
    let lengthGuide = 'Standard depth (700-900 words). Balanced capability and detail.';
    if (length === 'Short') lengthGuide = 'Focus on brevity (300-500 words). Stick to the core message. No fluff.';
    if (length === 'Large') lengthGuide = 'Extensive coverage (1200w+). Include historical context, multiple perspectives, and detailed examples.';
    if (length === 'Comprehensive') lengthGuide = 'Very extensive (1500-2000 words). Cover every angle. Multiple sections, data points, and deep analysis.';
    if (length === 'Report') lengthGuide = 'Maximum depth (2500 words+). Whitepaper quality. Executive summary + Detailed Chapters + Recommendations.';
    if (targetWordCount && targetWordCount > 0) {
        lengthGuide = `Target ~${targetWordCount} words. Keep within ±10% unless the topic clearly requires more.`;
    }
    return lengthGuide;
};

const getResearchGuidance = (researchDepth: string) => (
    researchDepth === 'Deep'
        ? `- **Research Depth**: Deep. Use Google Search grounding when available to verify claims and include citations.`
        : `- **Research Depth**: Quick. Use only the provided links and prior knowledge; do not fabricate sources.`
);

const getToneGuide = (tone: string, toneInstructions?: string) => {
    const selectedTone = TONE_GUIDES[tone] || TONE_GUIDES['Client-Friendly'];
    return `${selectedTone}${toneInstructions ? `\n- **Custom Tone Instructions**: ${toneInstructions}` : ''}`;
};

const getArticleResponseSchema = (targetLanguages: string[]) => {
    const properties: Record<string, any> = {};
    targetLanguages.forEach((lang) => {
        properties[`title_${lang}`] = { type: 'STRING' };
        properties[`excerpt_${lang}`] = { type: 'STRING' };
        properties[`content_${lang}`] = { type: 'STRING' };
        properties[`meta_title_${lang}`] = { type: 'STRING' };
        properties[`meta_description_${lang}`] = { type: 'STRING' };
        properties[`meta_keywords_${lang}`] = { type: 'STRING' };
    });
    properties.tags = {
        type: 'ARRAY',
        items: { type: 'STRING' }
    };
    properties.sources = {
        type: 'ARRAY',
        items: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                url: { type: 'STRING' }
            }
        }
    };

    return {
        type: 'OBJECT',
        properties
    };
};

const getOutlineResponseSchema = () => ({
    type: 'OBJECT',
    properties: {
        outline: {
            type: 'ARRAY',
            items: { type: 'STRING' }
        },
        notes: { type: 'STRING' }
    }
});

const getResearchPackResponseSchema = () => ({
    type: 'OBJECT',
    properties: {
        summary: { type: 'STRING' },
        key_points: { type: 'ARRAY', items: { type: 'STRING' } },
        facts: { type: 'ARRAY', items: { type: 'STRING' } },
        outline: { type: 'ARRAY', items: { type: 'STRING' } }
    }
});

const getArticleTranslationResponseSchema = () => ({
    type: 'OBJECT',
    properties: {
        title: { type: 'STRING' },
        excerpt: { type: 'STRING' },
        content: { type: 'STRING' },
        meta_title: { type: 'STRING' },
        meta_description: { type: 'STRING' },
        meta_keywords: { type: 'STRING' }
    }
});

export function getAIArticlePrompt(
    prompt: string,
    links: string[] = [],
    options: {
        type?: string;
        length?: string;
        targetLanguages?: string[];
        researchDepth?: string;
        targetWordCount?: number;
        tone?: string;
        toneInstructions?: string;
        outline?: string;
        researchFindings?: string;
        defaultInstructions?: string;
        nativeSkInstructions?: string;
    } = {}
): string {
    const {
        type = 'Deep Dive',
        length = 'Medium',
        targetLanguages = ['sk', 'en', 'de', 'cn'],
        researchDepth = 'Quick',
        targetWordCount,
        tone = 'Client-Friendly',
        toneInstructions = '',
        outline = '',
        researchFindings = '',
        defaultInstructions = '',
        nativeSkInstructions = ''
    } = options;
    const researchContext = links.length > 0
        ? `\n\n### RESEARCH SOURCES (PRIMARY & EXPANDED)\n1. PRIMARY: Analyze these specific user-provided URLs first:\n${links.join('\n')}\n2. EXPANDED: Use Google Grounding to find ADDITIONAL authoritative sources to complement the primary data. Do not limit research to only the provided links. Cite both primary and discovered sources.`
        : '';
    const researchBrief = researchFindings
        ? `\n\n### RESEARCH BRIEF (PRE-COMPILED)\nUse the following research notes and sources. Do NOT invent new sources; cite from these notes.\n${researchFindings}`
        : '';
    const researchGuidance = researchFindings
        ? `- **Research Depth**: Deep (provided). Use the research brief below; do not call external tools.`
        : getResearchGuidance(researchDepth);
    const isDeepDive = type === 'Deep Dive';
    const selectedStyle = STYLE_GUIDES[type] || STYLE_GUIDES['Deep Dive'];
    let lengthGuide = getLengthGuide(length, targetWordCount);

    if (isDeepDive) {
        lengthGuide = 'Maximum depth. No word limit. Expand as necessary to cover the topic exhaustively. Ignore target word count constraints.';
        // Force instruction to ignore brevity
    }
    const toneBlock = getToneGuide(tone, toneInstructions);
    const defaultInstructionsBlock = defaultInstructions.trim()
        ? `\n\n### ADMIN DEFAULT INSTRUCTIONS\n${defaultInstructions.trim()}`
        : '';
    const slovakNativeBlock = targetLanguages.includes('sk') && nativeSkInstructions.trim()
        ? `\n\n### SLOVAK NATIVE WRITING REQUIREMENT\n${nativeSkInstructions.trim()}`
        : '';
    const outlineBlock = outline
        ? `\n\n### APPROVED OUTLINE\nUse this outline exactly. Do not add or remove sections unless strictly necessary.\n${outline}\n`
        : '';

    // Construct the language instruction and JSON structure dynamically
    const langNames = {
        'sk': 'Slovak (SK)',
        'en': 'English (EN)',
        'de': 'German (DE)',
        'cn': 'Chinese (CN)'
    };
    const selectedLangNames = targetLanguages.map(l => langNames[l as keyof typeof langNames] || l).join(', ');

    const jsonFields = targetLanguages.map(l => `  "title_${l}": "Title (${l.toUpperCase()})",
  "excerpt_${l}": "Summary (${l.toUpperCase()})",
  "content_${l}": "HTML string (${l.toUpperCase()})",
  "meta_title_${l}": "SEO Title ${l.toUpperCase()} (max 60 chars)",
  "meta_description_${l}": "SEO Desc ${l.toUpperCase()} (max 160 chars)",
  "meta_keywords_${l}": "keywords, ${l}"`).join(',\n');


    return `You are an elite expert writer for SKALLARS Law, a boutique legal practice of attorneys and legal consultants.
Your task is to write a world-class legal article that demonstrates deep expertise and strategic value.

### ARTICLE CONFIGURATION
- **Topic**: ${prompt}
- **Type**: ${type}
- **Target Length**: ${length} (${lengthGuide})
${researchGuidance}
- **Tone**: ${tone}
${researchContext}
${researchBrief}
${outlineBlock}

### STYLE GUIDELINES
${selectedStyle}

### TONE GUIDELINES
${toneBlock}
${defaultInstructionsBlock}
${slovakNativeBlock}

### WRITING RULES
1. **Professionalism**: Use professional, business-grade language. Avoid generic AI phrases.
2. **Value**: Every paragraph must add value. No filler.
3. **Multilingual**: You must generate the article in the following languages: **${selectedLangNames}** simultaneously.
3.1 **Completeness**: Never return only titles. Every language must include full \`content_*\` HTML with paragraphs and headings, even when links are provided without grounding.
4. **Formatting (CRITICAL)**: 
   - Use **HTML tags** for all content.
   - **Headings**: Use \`<h2>\` for main sections and \`<h3>\` for subsections. **Use H3 frequently** to break up text.
   - **Paragraphs**: Wrap all body text in \`<p>\` tags. Keep them short (2-4 sentences).
   - **Lists**: Use \`<ul>\` with \`<li>\` for bullet points. Include at least 2 lists in the article.
   - **Emphasis**: Use \`<strong>\` to bold **key terms**, **important concepts**, and **takeaways**. (Target: 2-3 bolded phrases per paragraph).
   - **Quotes**: Include at least one \`<blockquote>\` every major section (or every 300 words) to highlight a key insight, legal principle, or "pull quote".
   - **Subtle Emphasis**: Use \`<em>\` for foreign phrases or subtle stress.
   - **Prohibited**: Do NOT use markdown characters like \`#\`, \`**\`, or \`- \` inside the JSON strings. Use HTML only.
5. **Structure Requirements**:
   - Minimum **4** \`<h2>\` sections.
   - Each H2 section should ideally have **1-2** \`<h3>\` subsections.
   - Include at least **two** bullet lists.
   - Paragraphs should be short and punchy.
6. **Citations & Links**:
   - **Inline Citations**: When referencing specific facts from the research, use inline citations like \`<sup>[1]</sup>\`.
   - **Link Citations**: If you have the URL, allow the citation to be a link if possible, or ensure the reference list connects to it.
   - End the article with a **Sources & References** section using \`<h3>\` + \`<ol>\`.
   - Each source in the reference list must be a clickable \`<a>\` tag.
7. **SEO DATA (MANDATORY)**:
   - You MUST generate optimized \`meta_title_*\` and \`meta_description_*\` for ALL target languages.
   - Do not leave them empty.
   - \`meta_title\`: Catchy, under 60 chars.
   - \`meta_description\`: Compelling summary, under 160 chars.
   - \`tags\`: Generate 5-8 relevant tags.

### OUTPUT FORMAT
CRITICAL: Return ONLY valid raw JSON. Do NOT use markdown code blocks. Do NOT include any introductory text, thinking process, or tool logs.
{
  "slug": "url-friendly-slug-from-title",
${jsonFields},
  "sources": [{"title": "Source title", "url": "https://source.com"}],
  "tags": ["tag1", "tag2", "tag3"]
}`;
}

export function getAIOutlinePrompt(
    prompt: string,
    links: string[] = [],
    options: { type?: string, length?: string, researchDepth?: string, targetWordCount?: number, tone?: string, toneInstructions?: string, languageLabel?: string, researchFindings?: string } = {}
): string {
    const {
        type = 'Deep Dive',
        length = 'Medium',
        researchDepth = 'Quick',
        targetWordCount,
        tone = 'Client-Friendly',
        toneInstructions = '',
        languageLabel = 'English (EN)',
        researchFindings = '',
    } = options;

    const researchContext = links.length > 0
        ? `\n\n### RESEARCH SOURCES\nCRITICAL: Analyze and synthesize the following sources. Use them to shape the outline and include factual sections where appropriate.\n${links.join('\n')}`
        : '';
    const researchBrief = researchFindings
        ? `\n\n### RESEARCH BRIEF (PRE-COMPILED)\nUse the following research notes and sources. Do NOT invent new sources; cite from these notes.\n${researchFindings}`
        : '';

    const lengthGuide = getLengthGuide(length, targetWordCount);
    const researchGuidance = researchFindings
        ? `- **Research Depth**: Deep (provided). Use the research brief below; do not call external tools.`
        : getResearchGuidance(researchDepth);
    const selectedStyle = STYLE_GUIDES[type] || STYLE_GUIDES['Deep Dive'];
    const toneBlock = getToneGuide(tone, toneInstructions);

    return `You are an elite expert writer for SKALLARS Law, a boutique legal practice of attorneys and legal consultants.
Your task is to create a structured outline that will be used to write the final article.

### OUTLINE CONFIGURATION
- **Topic**: ${prompt}
- **Type**: ${type}
- **Target Length**: ${length} (${lengthGuide})
${researchGuidance}
- **Tone**: ${tone}
- **Language**: ${languageLabel}
${researchContext}
${researchBrief}

### STYLE GUIDELINES
${selectedStyle}

### TONE GUIDELINES
${toneBlock}

### OUTLINE RULES
1. Use a clear hierarchy: main sections (H2) and subsections (H3).
2. Keep sections concise but informative.
3. Include a recommended section order that matches the style guide.
4. Do NOT write the full article—only the outline.

### OUTPUT FORMAT
CRITICAL: Return ONLY valid raw JSON. Do NOT use markdown code blocks. Do NOT include any introductory text, thinking process, or tool logs.
{
  "outline": [
    "H2: Section Title",
    "H3: Subsection Title",
    "H2: Another Section Title"
  ],
  "notes": "Optional guidance for the writer (1-3 sentences)."
}`;
}

export function getAIResearchPrompt(
    prompt: string,
    links: string[] = [],
    options: { type?: string; length?: string; targetWordCount?: number; tone?: string; toneInstructions?: string } = {}
): string {
    const {
        type = 'Deep Dive',
        length = 'Medium',
        targetWordCount,
        tone = 'Client-Friendly',
        toneInstructions = '',
    } = options;

    const lengthGuide = getLengthGuide(length, targetWordCount);
    const selectedStyle = STYLE_GUIDES[type] || STYLE_GUIDES['Deep Dive'];
    const toneBlock = getToneGuide(tone, toneInstructions);
    const researchContext = links.length > 0
        ? `\n\n### RESEARCH SOURCES (PRIMARY & EXPANDED)\n1. PRIMARY: Analyze these specific user-provided URLs first:\n${links.join('\n')}\n2. EXPANDED: Use Google Search to find ADDITIONAL authoritative sources, recent data, and expert perspectives to complement the primary sources. Do not limit your research to only the provided links.`
        : '\n\n### RESEARCH DIRECTIVE\nUse Google Search to find authoritative sources, recent data, and expert perspectives on this topic.';

    return `You are a research analyst. Collect factual notes to support a future article.

### TOPIC
${prompt}

### TARGET DEPTH
${length} (${lengthGuide})

${researchContext}

### STYLE GUIDELINES
${selectedStyle}

### TONE GUIDELINES
${toneBlock}

### OUTPUT FORMAT
CRITICAL: Return ONLY valid raw JSON. Do NOT use markdown code blocks. Do NOT include any introductory text, thinking process, or tool logs.
{
  "summary": "2-4 sentence summary of the key findings",
  "key_points": ["bullet 1", "bullet 2", "bullet 3"],
  "facts": ["fact with numbers or dates", "fact with numbers or dates"],
  "outline": ["H2: Section", "H3: Subsection"]
}`;
}

export async function generateAIResearchPack(
    prompt: string,
    links: string[] = [],
    options: { type?: string; length?: string; targetWordCount?: number; tone?: string; toneInstructions?: string; signal?: AbortSignal; modelOverride?: string; thinkingBudgetOverride?: number | null } = {}
): Promise<ResearchPack> {
    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API Key not found in settings.');

    const selectedModel = options.modelOverride || await getArticleModelSetting();
    const promptText = getAIResearchPrompt(prompt, links, options);
    const { signal } = options;
    const thinkingBudget = options.thinkingBudgetOverride ?? await getArticleThinkingBudget();
    const thinkingConfig = buildThinkingConfig(selectedModel, thinkingBudget);

    const body: any = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
            // responseMimeType: "application/json" is NOT supported with tools (grounding)
            // We rely on the prompt to enforce JSON
            responseSchema: getResearchPackResponseSchema(),
            response_schema: getResearchPackResponseSchema(),
            temperature: 0.3,
            maxOutputTokens: 4096,
            ...(thinkingConfig || {})
        },
        // Use google_search (snake_case) for v1beta compliance
        tools: [{ google_search: {} }]
    };

    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Error: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const groundingMetadata = result?.candidates?.[0]?.groundingMetadata;
    const usageMetadata = result?.usageMetadata;
    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) throw new Error(formatGeminiError(result));

    let parsed = tryParseJson(content);
    if (!parsed) {
        parsed = await repairJsonWithGemini(content, selectedModel, apiKey, signal);
    }

    const responsePayload: ResearchPack = parsed || {};

    if (groundingMetadata?.groundingChunks) {
        const sourceItems = groundingMetadata.groundingChunks
            .map((chunk: any) => {
                const uri = chunk.web?.uri;
                if (!uri) return null;
                return {
                    url: uri,
                    title: chunk.web?.title || uri,
                };
            })
            .filter(Boolean) as Array<{ url: string; title?: string }>;
        if (sourceItems.length > 0) {
            responsePayload.sources = sourceItems;
        }
    }

    if (usageMetadata) {
        responsePayload.usage = {
            promptTokens: usageMetadata.promptTokenCount || 0,
            completionTokens: usageMetadata.candidatesTokenCount || 0,
            totalTokens: usageMetadata.totalTokenCount || 0
        };
    }

    return responsePayload;
}

const translateArticlePackage = async (
    article: GeneratedArticle,
    sourceLang: string,
    targetLang: string,
    selectedModel: string,
    apiKey: string,
    translationInstructions = '',
    slovakNativeInstructions = '',
    signal?: AbortSignal
): Promise<{
    title: string;
    excerpt: string;
    content: string;
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}> => {
    const sourceLabel = LANGUAGE_LABELS[sourceLang] || sourceLang;
    const targetLabel = LANGUAGE_LABELS[targetLang] || targetLang;
    const translationBlock = translationInstructions.trim()
        ? `\n\nAdditional translation instructions:\n${translationInstructions.trim()}`
        : '';
    const slovakNativeBlock = targetLang === 'sk' && slovakNativeInstructions.trim()
        ? `\n\nSlovak native style requirement:\n${slovakNativeInstructions.trim()}`
        : '';
    const payload = {
        title: (article as any)[`title_${sourceLang}`] || '',
        excerpt: (article as any)[`excerpt_${sourceLang}`] || '',
        content: (article as any)[`content_${sourceLang}`] || '',
        meta_title: (article as any)[`meta_title_${sourceLang}`] || '',
        meta_description: (article as any)[`meta_description_${sourceLang}`] || '',
        meta_keywords: (article as any)[`meta_keywords_${sourceLang}`] || ''
    };

    const prompt = `Translate this legal article package from ${sourceLabel} to ${targetLabel}.

Rules:
1) Preserve all facts and legal meaning.
2) Preserve HTML tags and structure in "content".
3) Keep links, citations, and source references intact.
4) Return strict JSON only with keys:
   title, excerpt, content, meta_title, meta_description, meta_keywords
5) Translate idiomatically in the target language, not literally from source language.
${translationBlock}
${slovakNativeBlock}

INPUT JSON:
${JSON.stringify(payload)}`;

    const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            response_mime_type: "application/json",
            responseSchema: getArticleTranslationResponseSchema(),
            response_schema: getArticleTranslationResponseSchema(),
            temperature: 0.2,
            maxOutputTokens: 16384
        }
    };

    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini translation failed: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const content = extractTextFromCandidate(result?.candidates?.[0]);
    if (!content) throw new Error(formatGeminiError(result));

    let parsed = tryParseJson(content);
    if (!parsed) {
        parsed = await repairJsonWithGemini(content, selectedModel, apiKey, signal);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Invalid translated payload for ${targetLang}.`);
    }

    return {
        title: String((parsed as any).title || ''),
        excerpt: String((parsed as any).excerpt || ''),
        content: String((parsed as any).content || ''),
        meta_title: String((parsed as any).meta_title || ''),
        meta_description: String((parsed as any).meta_description || ''),
        meta_keywords: String((parsed as any).meta_keywords || ''),
        usage: result?.usageMetadata
            ? {
                promptTokens: result.usageMetadata.promptTokenCount || 0,
                completionTokens: result.usageMetadata.candidatesTokenCount || 0,
                totalTokens: result.usageMetadata.totalTokenCount || 0
            }
            : undefined
    };
};

export async function generateAIArticle(
    prompt: string,
    links: string[] = [],
    options: { type?: string, length?: string, useGrounding?: boolean, customPrompt?: string, targetLanguages?: string[], researchDepth?: string, targetWordCount?: number, tone?: string, toneInstructions?: string, outline?: string, researchFindings?: string, sources?: Array<{ title?: string; url?: string }>, signal?: AbortSignal, modelOverride?: string, thinkingBudgetOverride?: number | null } = {}
): Promise<GeneratedArticle> {
    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API Key not found in settings.');

    // Get selected model, fallback to gemini-2.0-flash
    const selectedModel = options.modelOverride || await getArticleModelSetting();
    console.log('[AI] Using Gemini model:', selectedModel, '(override:', options.modelOverride || 'none', ')');

    const modelConfig = getModelConfig(selectedModel);
    let { useGrounding = false, customPrompt, signal, sources: providedSources } = options;
    const targetLanguages = options.targetLanguages || ['sk', 'en', 'de', 'cn'];
    const thinkingBudget = options.thinkingBudgetOverride ?? await getArticleThinkingBudget();
    const articleDefaultInstructions = (await getSetting('gemini_article_prompt_default_instructions') || AI_PROMPT_DEFAULTS.articleDefaultInstructions).trim();
    const slovakNativeInstructions = (await getSetting('gemini_article_prompt_slovak_native_instructions') || AI_PROMPT_DEFAULTS.articleSlovakNativeInstructions).trim();
    const translationDefaultInstructions = (await getSetting('gemini_translation_prompt_default_instructions') || AI_PROMPT_DEFAULTS.translationDefaultInstructions).trim();

    // Reliability mode: for multi-language generation, produce one primary language first
    // and translate it into remaining languages in separate structured calls.
    if (targetLanguages.length > 1 && !customPrompt) {
        const [primaryLang, ...otherLangs] = targetLanguages;
        const primaryArticle = await generateAIArticle(prompt, links, {
            ...options,
            targetLanguages: [primaryLang]
        });

        const merged: GeneratedArticle = {
            ...primaryArticle,
            tags: Array.isArray(primaryArticle.tags) ? [...primaryArticle.tags] : [],
            sources: normalizeSourceList([
                ...(primaryArticle.sources || []),
                ...(providedSources || [])
            ]),
            usage: primaryArticle.usage
                ? {
                    promptTokens: primaryArticle.usage.promptTokens || 0,
                    completionTokens: primaryArticle.usage.completionTokens || 0,
                    totalTokens: primaryArticle.usage.totalTokens || 0
                }
                : undefined
        };

        const setLanguageFields = (
            lang: string,
            value: {
                title: string;
                excerpt: string;
                content: string;
                meta_title: string;
                meta_description: string;
                meta_keywords: string;
            }
        ) => {
            (merged as any)[`title_${lang}`] = value.title;
            (merged as any)[`excerpt_${lang}`] = value.excerpt;
            (merged as any)[`content_${lang}`] = value.content;
            (merged as any)[`meta_title_${lang}`] = value.meta_title;
            (merged as any)[`meta_description_${lang}`] = value.meta_description;
            (merged as any)[`meta_keywords_${lang}`] = value.meta_keywords;
        };

        const getPrimaryFields = () => ({
            title: String((primaryArticle as any)[`title_${primaryLang}`] || ''),
            excerpt: String((primaryArticle as any)[`excerpt_${primaryLang}`] || ''),
            content: String((primaryArticle as any)[`content_${primaryLang}`] || ''),
            meta_title: String((primaryArticle as any)[`meta_title_${primaryLang}`] || ''),
            meta_description: String((primaryArticle as any)[`meta_description_${primaryLang}`] || ''),
            meta_keywords: String((primaryArticle as any)[`meta_keywords_${primaryLang}`] || '')
        });

        for (const lang of otherLangs) {
            try {
                const translated = await translateArticlePackage(
                    primaryArticle,
                    primaryLang,
                    lang,
                    selectedModel,
                    apiKey,
                    translationDefaultInstructions,
                    slovakNativeInstructions,
                    signal
                );
                setLanguageFields(lang, translated);
                if (translated.usage) {
                    if (!merged.usage) {
                        merged.usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
                    }
                    merged.usage.promptTokens += translated.usage.promptTokens || 0;
                    merged.usage.completionTokens += translated.usage.completionTokens || 0;
                    merged.usage.totalTokens += translated.usage.totalTokens || 0;
                }
            } catch (translationError) {
                console.warn(`[AI] Translation fallback used for ${lang}.`, translationError);
                setLanguageFields(lang, getPrimaryFields());
            }
        }

        const completed = fillMissingArticleFields(merged, targetLanguages);
        targetLanguages.forEach((lang) => {
            const field = `content_${lang}`;
            (completed as any)[field] = addHeadingAnchors(
                normalizeArticleHtml(convertMarkdownToHtml((completed as any)[field] || ''))
            );
        });

        if (Array.isArray(completed.sources) && completed.sources.length > 0) {
            const sourceItems = normalizeSourceList(completed.sources);
            const contentFields = targetLanguages.map((lang) => `content_${lang}`);
            const hasSources = contentFields.some((field) =>
                String((completed as any)[field] || '').includes('Sources & References')
            );
            if (!hasSources) {
                const sourcesHtml = `\n\n<h3>Sources & References</h3>\n<ol>${sourceItems.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title || s.url}</a></li>`).join('')}</ol>`;
                contentFields.forEach((field) => {
                    (completed as any)[field] = String((completed as any)[field] || '') + sourcesHtml;
                });
            }
            completed.sources = sourceItems;
        }

        return completed;
    }

    // Disable grounding for Gemini 2.5 as it currently causes 400 errors (likely unsupported)
    if (useGrounding && /gemini-2\.5/i.test(selectedModel)) {
        console.warn('[AI] Disabling grounding for Gemini 2.5 (unsupported)');
        useGrounding = false;
    }

    // If research findings are provided (e.g. from Deep Dive phase 1), we don't need grounding.
    // Disabling grounding allows us to use responseMimeType="application/json" which prevents parse errors.
    if (useGrounding && options.researchFindings) {
        console.log('[AI] Disabling grounding because research findings are provided.');
        useGrounding = false;
    }

    // Use model specific max tokens if available, otherwise estimate
    const isDeepDive = options.type === 'Deep Dive';
    let maxOutputTokens = modelConfig.maxOutputTokens;

    if (!isDeepDive) {
        const estimatedTokens = estimateMaxOutputTokens(options.targetWordCount, targetLanguages.length);
        maxOutputTokens = Math.max(estimatedTokens, modelConfig.maxOutputTokens);
    } else {
        // For Deep Dive, use the absolute maximum the model supports
        // ensuring we don't truncate.
        maxOutputTokens = modelConfig.maxOutputTokens;
    }

    const thinkingConfig = buildThinkingConfig(selectedModel, thinkingBudget);

    let finalPrompt = customPrompt || getAIArticlePrompt(prompt, links, {
        ...options,
        defaultInstructions: articleDefaultInstructions,
        nativeSkInstructions: slovakNativeInstructions
    });

    // Inject model-specific system instruction if available
    if (modelConfig.systemInstructionAddon) {
        finalPrompt = `${modelConfig.systemInstructionAddon}\n\n${finalPrompt}`;
    }

    const collectedGroundingChunks: any[] = [];
    const collectGroundingChunks = (metadata: any) => {
        const chunks = metadata?.groundingChunks;
        if (!Array.isArray(chunks)) return;
        chunks.forEach((chunk: any) => {
            const uri = chunk?.web?.uri;
            if (!uri) return;
            if (!collectedGroundingChunks.some((existing) => existing?.web?.uri === uri)) {
                collectedGroundingChunks.push(chunk);
            }
        });
    };
    let latestRawOutput = '';

    const requestModelOutput = async (promptText: string, groundingEnabled = useGrounding) => {
        const body: any = {
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
                // Some Gemini models reject responseSchema with grounding/tools.
                // Also, responseMimeType: "application/json" is unsupported with tools.
                ...(groundingEnabled ? {} : { responseMimeType: "application/json" }),

                // request specific params taking model config into account
                temperature: modelConfig.temperature,
                topP: modelConfig.topP,
                topK: modelConfig.topK,
                maxOutputTokens,
                ...(thinkingConfig || {}),
                ...(groundingEnabled ? {} : { responseSchema: getArticleResponseSchema(targetLanguages) })
            }
        };

        if (groundingEnabled) {
            // Use snake_case 'google_search' as per v1beta spec
            body.tools = [{ google_search: {} }];
        }

        const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API Error: ${response.statusText} - ${errorBody}`);
        }

        const result = await response.json();
        const candidate = result?.candidates?.[0];
        const modelText = extractTextFromCandidate(candidate);

        if (!modelText) throw new Error(formatGeminiError(result));
        return {
            content: modelText as string,
            groundingMetadata: candidate?.groundingMetadata,
            usageMetadata: result?.usageMetadata
        };
    };

    try {
        const parseOrRepair = async (raw: string) => {
            const direct = tryParseJson(raw);
            if (direct) return direct;

            // Grounded outputs frequently include non-JSON fragments. Avoid expensive re-generation loops.
            if (useGrounding) {
                throw new Error('Grounded output was not valid JSON.');
            }

            return await repairJsonWithGemini(raw, selectedModel, apiKey, signal);
        };

        const output = await requestModelOutput(finalPrompt);
        latestRawOutput = output.content;
        collectGroundingChunks(output.groundingMetadata);
        let parsedContent: any = await parseOrRepair(output.content);
        parsedContent = fillMissingArticleFields(parsedContent, targetLanguages);

        for (const lang of targetLanguages) {
            const field = `content_${lang}`;
            // Convert any markdown syntax to HTML, then normalize
            parsedContent[field] = addHeadingAnchors(
                normalizeArticleHtml(convertMarkdownToHtml(parsedContent[field] || ''))
            );
        }

        const appendSources = (sourceItems: Array<{ url: string; title?: string }>) => {
            if (!sourceItems.length) return;
            const contentFields = targetLanguages.map((lang) => `content_${lang}`);
            const hasSources = contentFields
                .some((field) => String((parsedContent as any)[field] || '').includes('Sources & References'));
            if (!hasSources) {
                const sourcesHtml = `\n\n<h3>Sources & References</h3>\n<ol>${sourceItems.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title || s.url}</a></li>`).join('')}</ol>`;
                contentFields.forEach((field) => {
                    parsedContent[field] = (parsedContent[field] || '') + sourcesHtml;
                });
            }
            parsedContent.sources = sourceItems;
        };

        const combinedSources: Array<{ url: string; title?: string }> = [];

        // 1. Add provided sources first (User priority)
        if (providedSources && providedSources.length > 0) {
            providedSources.forEach(s => {
                if (s.url && !combinedSources.some(existing => existing.url === s.url)) {
                    combinedSources.push({ url: s.url, title: s.title || s.url });
                }
            });
        }

        // 2. Add grounding sources (AI discovered)
        collectedGroundingChunks.forEach((chunk: any) => {
            const uri = chunk.web?.uri;
            if (uri && !combinedSources.some(existing => existing.url === uri)) {
                combinedSources.push({ url: uri, title: chunk.web?.title || uri });
            }
        });

        appendSources(combinedSources);

        // Add usage metadata if available
        if (output.usageMetadata) {
            parsedContent.usage = {
                promptTokens: output.usageMetadata.promptTokenCount || 0,
                completionTokens: output.usageMetadata.candidatesTokenCount || 0,
                totalTokens: output.usageMetadata.totalTokenCount || 0
            };
        }

        return parsedContent;
    } catch (e) {
        console.warn("[AI] Failed to parse Gemini response as JSON. Attempting auto-recovery.", e);
        if (latestRawOutput.trim()) {
            try {
                const autoRecovered = await recoverAIArticleFromRawOutput(latestRawOutput, {
                    targetLanguages,
                    modelOverride: selectedModel,
                    sources: normalizeSourceList([
                        ...(providedSources || []),
                        ...collectedGroundingChunks.map((chunk: any) => ({
                            url: chunk?.web?.uri,
                            title: chunk?.web?.title
                        }))
                    ]),
                    allowRepairCall: false,
                    allowModelRecovery: false,
                    signal
                });
                console.warn('[AI] Returned auto-recovered article after JSON parse failure.');
                return autoRecovered;
            } catch (recoveryError) {
                console.error('[AI] Auto-recovery from raw output failed.', recoveryError);
            }
        }
        if (e instanceof Error && e.message) {
            if (latestRawOutput.trim()) {
                const recoverableError = e as RecoverableArticleGenerationError;
                recoverableError.code = 'ARTICLE_OUTPUT_RECOVERABLE';
                recoverableError.rawOutput = latestRawOutput;
                recoverableError.model = selectedModel;
                recoverableError.targetLanguages = targetLanguages;
                recoverableError.groundedSources = normalizeSourceList(
                    collectedGroundingChunks.map((chunk: any) => ({
                        url: chunk?.web?.uri,
                        title: chunk?.web?.title
                    }))
                );
            }
            throw e;
        }
        const fallbackError: RecoverableArticleGenerationError = new Error('Generated content was not in valid JSON format.');
        if (latestRawOutput.trim()) {
            fallbackError.code = 'ARTICLE_OUTPUT_RECOVERABLE';
            fallbackError.rawOutput = latestRawOutput;
            fallbackError.model = selectedModel;
            fallbackError.targetLanguages = targetLanguages;
            fallbackError.groundedSources = normalizeSourceList(
                collectedGroundingChunks.map((chunk: any) => ({
                    url: chunk?.web?.uri,
                    title: chunk?.web?.title
                }))
            );
        }
        throw fallbackError;
    }
}

export async function recoverAIArticleFromRawOutput(
    rawOutput: string,
    options: {
        targetLanguages?: string[];
        modelOverride?: string;
        sources?: Array<{ title?: string; url?: string }>;
        allowRepairCall?: boolean;
        allowModelRecovery?: boolean;
        signal?: AbortSignal;
    } = {}
): Promise<GeneratedArticle> {
    const cleanedRawOutput = String(rawOutput || '').trim();
    if (!cleanedRawOutput) {
        throw new Error('No recoverable output found. Generate again and retry recovery.');
    }

    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API Key not found in settings.');

    const selectedModel = options.modelOverride || await getArticleModelSetting();
    const targetLanguages = options.targetLanguages && options.targetLanguages.length > 0
        ? options.targetLanguages
        : ['sk', 'en', 'de', 'cn'];
    const allowRepairCall = options.allowRepairCall ?? true;
    const allowModelRecovery = options.allowModelRecovery ?? false;

    let parsed: any = tryParseJson(cleanedRawOutput);
    if (!parsed && allowRepairCall) {
        try {
            parsed = await repairJsonWithGemini(cleanedRawOutput, selectedModel, apiKey, options.signal);
        } catch {
            parsed = null;
        }
    }

    if (!parsed && allowModelRecovery) {
        try {
            const recoveryPrompt = `You are a JSON formatter for a CMS.
Convert the INPUT into strict JSON with this shape:
- slug
- title_*, excerpt_*, content_*, meta_title_*, meta_description_*, meta_keywords_* for requested languages
- tags (array of strings)
- sources (array of {title,url})

Rules:
1) Preserve the original article text as much as possible.
2) Do not add commentary.
3) Output raw JSON only.
4) If a field is unavailable, return an empty string (or empty array for arrays).

INPUT:
${cleanedRawOutput}`;

            const body: any = {
                contents: [{ parts: [{ text: recoveryPrompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    response_mime_type: "application/json",
                    responseSchema: getArticleResponseSchema(targetLanguages),
                    response_schema: getArticleResponseSchema(targetLanguages),
                    temperature: 0,
                    maxOutputTokens: 16384
                }
            };

            const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify(body),
                signal: options.signal
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Gemini recovery failed: ${response.statusText} - ${errorBody}`);
            }

            const result = await response.json();
            const recoveredText = extractTextFromCandidate(result?.candidates?.[0]);
            if (!recoveredText) {
                throw new Error(formatGeminiError(result));
            }

            parsed = tryParseJson(recoveredText);
            if (!parsed) {
                parsed = await repairJsonWithGemini(recoveredText, selectedModel, apiKey, options.signal);
            }
        } catch (schemaRecoveryError) {
            console.error('[AI] Schema recovery failed. Falling back to raw text article.', schemaRecoveryError);
            return createRawFallbackArticle(cleanedRawOutput, targetLanguages, options.sources || []);
        }
    }

    if (!parsed && !allowModelRecovery) {
        return createRawFallbackArticle(cleanedRawOutput, targetLanguages, options.sources || []);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return createRawFallbackArticle(cleanedRawOutput, targetLanguages, options.sources || []);
    }
    const finalized = finalizeRecoveredArticle(parsed, targetLanguages, options.sources || []);
    const hasAnyContent = targetLanguages.some((lang) => {
        const value = (finalized as any)[`content_${lang}`];
        return typeof value === 'string' && value.trim().length > 0;
    });
    if (!hasAnyContent) {
        return createRawFallbackArticle(cleanedRawOutput, targetLanguages, options.sources || []);
    }
    return finalized;
}

export async function generateAIEdit(
    text: string,
    options: { mode: 'rewrite' | 'expand' | 'shorten' | 'simplify'; customInstruction?: string; tone?: string; toneInstructions?: string; languageLabel?: string; signal?: AbortSignal } = {
        mode: 'rewrite'
    }
): Promise<string> {
    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API Key not found in settings.');

    const selectedModel = await getSetting('gemini_model') || 'gemini-2.0-flash';
    const {
        mode,
        customInstruction = '',
        tone = 'Client-Friendly',
        toneInstructions = '',
        languageLabel = 'English (EN)',
        signal
    } = options;

    const modeGuides: Record<string, string> = {
        rewrite: 'Rewrite for clarity and flow while preserving meaning and factual accuracy.',
        expand: 'Expand with additional detail and context, but do not invent facts. Maintain structure.',
        shorten: 'Shorten the text by ~40% while preserving key facts and conclusions.',
        simplify: 'Simplify the language for a general audience without losing accuracy.',
    };

    const toneGuide = getToneGuide(tone, toneInstructions);

    const prompt = `You are an expert legal editor.
Your task is to edit the text below.

### EDIT CONFIGURATION
- **Mode**: ${mode}
- **Language**: ${languageLabel}
- **Instruction**: ${modeGuides[mode] || modeGuides.rewrite}

### TONE GUIDELINES
${toneGuide}

### RULES
1. Preserve HTML tags and structure. Output must be valid HTML.
2. Do NOT add markdown or JSON.
3. Do NOT add sources unless they already exist in the text.
4. Keep all links intact.
${customInstruction ? `5. Custom: ${customInstruction}` : ''}

### INPUT (HTML)
${text}

### OUTPUT
Return ONLY the edited HTML string.`;

    const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "text/plain",
            response_mime_type: "text/plain"
        }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Error: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error(formatGeminiError(result));

    const jsonMatch = content.match(/```html\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/);
    const cleanContent = (jsonMatch ? jsonMatch[1] : content).trim();
    return cleanContent;
}
export async function generateAIOutline(
    prompt: string,
    links: string[] = [],
    options: { type?: string, length?: string, useGrounding?: boolean, researchDepth?: string, targetWordCount?: number, tone?: string, toneInstructions?: string, languageLabel?: string, researchFindings?: string, signal?: AbortSignal, modelOverride?: string, thinkingBudgetOverride?: number | null } = {}
): Promise<{ outline: string[]; notes?: string; sources?: Array<{ title?: string; url?: string }>; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API Key not found in settings.');

    const selectedModel = options.modelOverride || await getArticleModelSetting();
    const { useGrounding = false, signal } = options;
    const thinkingBudget = options.thinkingBudgetOverride ?? await getArticleThinkingBudget();
    const thinkingConfig = buildThinkingConfig(selectedModel, thinkingBudget);
    const promptText = getAIOutlinePrompt(prompt, links, options);

    const body: any = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
            responseMimeType: "application/json",
            response_mime_type: "application/json",
            maxOutputTokens: 2048,
            ...(thinkingConfig || {}),
            ...(useGrounding ? {} : { responseSchema: getOutlineResponseSchema(), response_schema: getOutlineResponseSchema() })
        }
    };

    if (useGrounding) {
        body.tools = [{ googleSearch: {} }];
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Error: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const groundingMetadata = result?.candidates?.[0]?.groundingMetadata;
    const usageMetadata = result?.usageMetadata;
    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) throw new Error(formatGeminiError(result));

    const fallbackParse = (text: string) => {
        const lines = text
            .split('\n')
            .map((line) => line.replace(/^[\-\*\d\.\s]+/, '').trim())
            .filter(Boolean);
        return { outline: lines.length ? lines : ['H2: Introduction', 'H2: Key Points', 'H2: Conclusion'] };
    };

    try {
        let parsed = tryParseJson(content);
        if (!parsed) {
            parsed = await repairJsonWithGemini(content, selectedModel, apiKey, signal);
        }
        if (!parsed.outline || !Array.isArray(parsed.outline)) {
            return fallbackParse(content);
        }

        const responsePayload: any = {
            outline: parsed.outline,
            notes: parsed.notes,
        };

        if (groundingMetadata?.groundingChunks) {
            const sourceItems = groundingMetadata.groundingChunks
                .map((chunk: any) => {
                    const uri = chunk.web?.uri;
                    if (!uri) return null;
                    return {
                        url: uri,
                        title: chunk.web?.title || uri,
                    };
                })
                .filter(Boolean) as Array<{ url: string; title?: string }>;
            if (sourceItems.length > 0) {
                responsePayload.sources = sourceItems;
            }
        }

        if (usageMetadata) {
            responsePayload.usage = {
                promptTokens: usageMetadata.promptTokenCount || 0,
                completionTokens: usageMetadata.candidatesTokenCount || 0,
                totalTokens: usageMetadata.totalTokenCount || 0
            };
        }

        return responsePayload;
    } catch (e) {
        return fallbackParse(content);
    }
}

export async function testGeminiConnection(signal?: AbortSignal): Promise<string> {
    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API Key not found in settings.');

    const selectedModel = await getSetting('gemini_model') || 'gemini-2.0-flash';
    const body: any = {
        contents: [{ parts: [{ text: 'Reply with OK in plain text.' }] }],
        generationConfig: {
            responseMimeType: "text/plain",
            response_mime_type: "text/plain",
            maxOutputTokens: 64,
            temperature: 0,
            topP: 1,
            topK: 1
        }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Error: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error(formatGeminiError(result));
    return content.trim();
}

export async function generateAIMeta(title: string, content: string): Promise<any> {
    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API Key not found in settings.');

    // Get selected model, fallback to gemini-2.0-flash
    const selectedModel = await getSetting('gemini_model') || 'gemini-2.0-flash';

    const prompt = `Based on the following article title and content, generate SEO meta tags.
Title: ${title}
Content: ${content.substring(0, 1000)}...

Format the output as a JSON object:
{
  "meta_title": "Max 60 chars",
  "meta_description": "Max 160 chars",
  "meta_keywords": "comma separated keywords"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    if (!response.ok) throw new Error('Gemini API Error');
    const result = await response.json();
    return JSON.parse(result.candidates[0].content.parts[0].text);
}

export async function generateAIImage(
    prompt: string,
    options: {
        turbo?: boolean;
        width?: number;
        height?: number;
        aspectRatio?: string;
        imageSize?: string;
        model?: string;
        seed?: number;
    } = {}
): Promise<string> {
    const {
        turbo: forceTurbo,
        width = 1024,
        height = 1024,
        aspectRatio,
        imageSize,
        model,
        seed
    } = options;

    // Check global settings if turbo is not forced
    // Default to 'turbo' if not set or if forceTurbo is true
    let useTurbo = forceTurbo;

    if (useTurbo === undefined) {
        const globalImageModel = await getSetting('image_model');
        useTurbo = globalImageModel === 'turbo';
        // If global setting is missing, default to turbo (safer/free)
        if (globalImageModel === null) useTurbo = true;
    }

    const normalizePrompt = (value: string) => value.replace(/\s+/g, ' ').trim();
    const truncatePrompt = (value: string, max = 600) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

    if (useTurbo) {
        // Use Pollinations.ai for fast, free, high-quality Flux images
        const resolvedSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 1000000);
        const turboPrompt = truncatePrompt(normalizePrompt(prompt));
        const encodedPrompt = encodeURIComponent(turboPrompt);
        return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${resolvedSeed}&model=flux`;
    }

    // Pro mode: Use Gemini Image models (requires Gemini API key)
    const apiKey = await getSetting('gemini_image_api_key') || await getSetting('gemini_api_key');
    if (!apiKey) {
        console.warn('Gemini API key not found, falling back to Turbo mode');
        return generateAIImage(prompt, { turbo: true });
    }

    const translatePromptToEnglish = async (text: string) => {
        const apiKey = await getSetting('gemini_api_key') || await getSetting('gemini_image_api_key');
        if (!apiKey) return text;

        const model = await getSetting('gemini_model') || 'gemini-2.0-flash';
        const translationPrompt = `Translate the following text to English. Return only the translation.\n\n${text}`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: translationPrompt }] }],
                    generationConfig: { responseMimeType: "text/plain", temperature: 0.2, maxOutputTokens: 256 }
                })
            }
        );

        if (!response.ok) {
            return text;
        }

        const result = await response.json();
        const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        return content ? content.trim() : text;
    };

    try {
        // Get selected image model, fallback to Imagen default
        const imageModel = model || await getSetting('gemini_image_model') || 'imagen-3.0-generate-001';
        console.log('[AI] Generating image with Gemini model:', imageModel);

        const normalizedAspectRatio = aspectRatio || (() => {
            const ratioMap: Record<string, string> = {
                '1024x1024': '1:1',
                '1280x720': '16:9',
                '720x1280': '9:16',
                '1024x768': '4:3',
                '768x1024': '3:4',
            };
            const key = `${width}x${height}`;
            return ratioMap[key];
        })();

        const imageConfig: Record<string, string> = {};
        if (normalizedAspectRatio) imageConfig.aspectRatio = normalizedAspectRatio;
        if (imageSize) imageConfig.imageSize = imageSize;

        const makeGenerateContentRequest = async (finalPrompt: string) => {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: `Generate a professional, high-quality image for an article. The image should be: ${normalizePrompt(finalPrompt)}`
                                    }
                                ]
                            }
                        ],
                        generationConfig: {
                            responseModalities: ["Image"],
                            ...(Object.keys(imageConfig).length > 0 ? { imageConfig } : {})
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`generateContent failed: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const result = await response.json();
            const parts = result.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
            if (imagePart?.inlineData?.data) {
                const mimeType = imagePart.inlineData.mimeType || 'image/png';
                return `data:${mimeType};base64,${imagePart.inlineData.data}`;
            }
            throw new Error(formatGeminiError(result));
        };

        const makePredictRequest = async (finalPrompt: string) => {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:predict?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({
                        instances: [{ prompt: normalizePrompt(finalPrompt) }],
                        parameters: {
                            sampleCount: 1,
                            ...(normalizedAspectRatio ? { aspectRatio: normalizedAspectRatio } : {}),
                            ...(imageSize ? { imageSize } : {})
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`predict failed: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const result = await response.json();
            const predictions = Array.isArray(result?.predictions) ? result.predictions : [];
            for (const prediction of predictions) {
                const bytes =
                    prediction?.bytesBase64Encoded ||
                    prediction?.imageBytes ||
                    prediction?.image?.bytesBase64Encoded ||
                    prediction?.image?.imageBytes ||
                    prediction?.generatedImages?.[0]?.bytesBase64Encoded;
                if (bytes) {
                    const mimeType = prediction?.image?.mimeType || prediction?.mimeType || 'image/png';
                    return `data:${mimeType};base64,${bytes}`;
                }
            }
            throw new Error('No image data returned from predict.');
        };

        const looksLikeImagen = imageModel.toLowerCase().includes('imagen');
        const needsEnglish = looksLikeImagen && /[^\x00-\x7F]/.test(prompt);
        const effectivePrompt = needsEnglish ? await translatePromptToEnglish(prompt) : prompt;

        if (effectivePrompt !== prompt) {
            console.log('[AI] Translated prompt to English for Imagen model.');
        }

        try {
            if (looksLikeImagen) {
                return await makePredictRequest(effectivePrompt);
            }
            return await makeGenerateContentRequest(effectivePrompt);
        } catch (primaryError) {
            console.warn('[AI] Primary image generation failed, retrying with alternate endpoint...', primaryError);
            if (looksLikeImagen) {
                return await makeGenerateContentRequest(effectivePrompt);
            }
            return await makePredictRequest(effectivePrompt);
        }
    } catch (err) {
        console.warn('Gemini image generation failed (Handled), falling back to Turbo mode:', err);
        return generateAIImage(prompt, { turbo: true, width, height });
    }
}

export async function generateContentTranslation(text_sk: string): Promise<{ en: string; de: string; cn: string }> {
    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API Key not found in settings.');

    const selectedModel = await getSetting('gemini_model') || 'gemini-2.0-flash';

    const prompt = `Translate the following Slovak text into English, German, and Chinese (Simplified).
    
    Source Text (SK): "${text_sk}"

    Return ONLY a raw JSON object with the following structure (no markdown, no conversation):
    {
        "en": "English translation",
        "de": "German translation",
        "cn": "Chinese translation"
    }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Translation failed: ${response.statusText} - ${err}`);
    }

    const result = await response.json();
    const content = result.candidates[0]?.content?.parts[0]?.text;

    if (!content) throw new Error('No content generated');

    try {
        return JSON.parse(content);
    } catch (e) {
        // Fallback for markdown wrapping
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
        throw new Error('Invalid JSON received from AI');
    }
}
