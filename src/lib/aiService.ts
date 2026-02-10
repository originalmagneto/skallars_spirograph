import { supabase } from "@/lib/supabase";

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

    const firstOpen = cleanContent.indexOf('{');
    const lastClose = cleanContent.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1) {
        cleanContent = cleanContent.substring(firstOpen, lastClose + 1);
    }
    return cleanContent;
};

const tryParseJson = (content: string) => {
    const cleanContent = extractJsonText(content);
    try {
        return JSON.parse(cleanContent);
    } catch {
        return null;
    }
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

const hasMeaningfulArticleHtml = (html?: string) => {
    if (!html) return false;
    const normalized = String(html).trim();
    if (!normalized) return false;
    const textOnly = normalized.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const paragraphCount = (normalized.match(/<p[\s>]/gi) || []).length;
    const headingCount = (normalized.match(/<h[23][\s>]/gi) || []).length;
    return textOnly.length >= 320 && paragraphCount >= 2 && headingCount >= 1;
};

const hasCompleteMultilingualContent = (payload: any, targetLanguages: string[]) => {
    if (!payload || typeof payload !== 'object') return false;
    return targetLanguages.every((lang) => hasMeaningfulArticleHtml(payload[`content_${lang}`]));
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
            maxOutputTokens: 8192
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
    const repaired = result?.candidates?.[0]?.content?.parts?.[0]?.text;
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

const countWords = (html: string) => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return 0;
    return text.split(' ').length;
};

const shouldEnhanceFormatting = (html: string) => {
    if (!html) return false;
    const words = countWords(html);
    if (words < 180) return false;
    const hasH2 = /<h2\b/i.test(html);
    const hasH3 = /<h3\b/i.test(html);
    const hasList = /<(ul|ol)\b/i.test(html);
    const hasQuote = /<blockquote\b/i.test(html);
    const hasEm = /<em\b/i.test(html);
    let missing = 0;
    if (!hasH2) missing += 1;
    if (!hasH3) missing += 1;
    if (!hasList) missing += 1;
    if (!hasQuote) missing += 1;
    if (!hasEm) missing += 1;
    return missing >= 2;
};

const enhanceArticleFormatting = async (html: string, languageLabel: string, signal?: AbortSignal) => {
    if (!shouldEnhanceFormatting(html)) return html;
    const instruction = `Reformat the HTML into a richly structured, premium article.
Rules:
1. **Preserve Facts**: Keep all facts, numbers, names, and URLs exactly as is.
2. **Language**: Keep the language as ${languageLabel}.
3. **Format**: Use semantic HTML only. No markdown.
4. **Structure**:
   - Start with a compelling lead paragraph.
   - Use <h2> for main sections (minimum 4).
   - Use <h3> for specific subsections (frequently used).
5. **Richness**:
   - **Bold** key terms and important phrases using <strong> (aim for 2-3 highlight phrases per paragraph for skimmability).
   - Use one <blockquote> every 2-3 sections to highlight a key insight or principle.
   - Use <ul> or <ol> lists whenever listing 3+ items.
   - Use <em> for subtle emphasis.
6. **Flow**: Paragraphs should be concise (2-4 sentences).
7. **Sources**: Keep all existing citations and links.`;
    try {
        const edited = await generateAIEdit(html, {
            mode: 'rewrite',
            customInstruction: instruction,
            languageLabel,
            signal,
        });
        return edited || html;
    } catch {
        return html;
    }
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

export function getAIArticlePrompt(
    prompt: string,
    links: string[] = [],
    options: { type?: string, length?: string, targetLanguages?: string[], researchDepth?: string, targetWordCount?: number, tone?: string, toneInstructions?: string, outline?: string, researchFindings?: string } = {}
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
        researchFindings = ''
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
IMPORTANT: Return ONLY raw JSON. No markdown, no commentary. Even with Google grounding enabled, output JSON only.
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
Return ONLY raw JSON. No markdown, no commentary. Even with grounding enabled, output JSON only.
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
Return ONLY raw JSON. No markdown or commentary.
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

    let finalPrompt = customPrompt || getAIArticlePrompt(prompt, links, options);

    // Inject model-specific system instruction if available
    if (modelConfig.systemInstructionAddon) {
        finalPrompt = `${modelConfig.systemInstructionAddon}\n\n${finalPrompt}`;
    }

    const languageLabels: Record<string, string> = {
        sk: 'Slovak (SK)',
        en: 'English (EN)',
        de: 'German (DE)',
        cn: 'Chinese (CN)',
    };

    const injectCitations = (text: string, candidate: any) => {
        const supports = candidate?.groundingMetadata?.groundingSupports;
        const chunks = candidate?.groundingMetadata?.groundingChunks;
        if (!supports || !chunks || !text) return text;
        const sortedSupports = [...supports].sort((a: any, b: any) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0));
        let output = text;
        for (const support of sortedSupports) {
            const endIndex = support.segment?.endIndex;
            if (endIndex === undefined || !support.groundingChunkIndices?.length) continue;
            const links = support.groundingChunkIndices.map((i: number) => {
                const uri = chunks[i]?.web?.uri;
                return uri ? `[${i + 1}](${uri})` : null;
            }).filter(Boolean);
            if (links.length > 0) {
                output = output.slice(0, endIndex) + " " + links.join(" ") + output.slice(endIndex);
            }
        }
        return output;
    };

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
        let modelText = candidate?.content?.parts?.[0]?.text;

        if (groundingEnabled && candidate?.groundingMetadata && modelText) {
            modelText = injectCitations(modelText, candidate);
        }

        if (!modelText) throw new Error(formatGeminiError(result));
        return {
            content: modelText as string,
            groundingMetadata: candidate?.groundingMetadata,
            usageMetadata: result?.usageMetadata
        };
    };

    try {
        let output = await requestModelOutput(finalPrompt);
        let parsedContent = tryParseJson(output.content);
        if (!parsedContent) {
            parsedContent = await repairJsonWithGemini(output.content, selectedModel, apiKey, signal);
        }

        if (!hasCompleteMultilingualContent(parsedContent, targetLanguages) && links.length > 0) {
            const retryPrompt = `${finalPrompt}

### RETRY REQUIREMENT
Your previous output was incomplete. You must return full HTML article bodies for all requested languages.
- Every \`content_*\` field must include at least 4 <p> paragraphs and multiple headings.
- Do not return title-only or excerpt-only output.
- Return valid raw JSON only.`;
            output = await requestModelOutput(retryPrompt);
            parsedContent = tryParseJson(output.content) || await repairJsonWithGemini(output.content, selectedModel, apiKey, signal);
        }

        // If grounding flow still produced partial JSON, fall back to a schema-constrained pass
        // while preserving discovered source context from the grounded response.
        if (!hasCompleteMultilingualContent(parsedContent, targetLanguages) && useGrounding) {
            const groundedSources = (output.groundingMetadata?.groundingChunks || [])
                .map((chunk: any) => chunk?.web?.uri)
                .filter(Boolean)
                .slice(0, 12) as string[];
            const fallbackPrompt = `${finalPrompt}

### FALLBACK MODE
Grounded generation returned incomplete content. Regenerate with strict JSON completeness.
- Return complete HTML article fields for all requested languages.
- Keep source-backed claims where relevant.
- Output raw JSON only.

### Grounded URLs (for context)
${groundedSources.length ? groundedSources.join('\n') : 'No grounded URLs returned.'}`;
            output = await requestModelOutput(fallbackPrompt, false);
            parsedContent = tryParseJson(output.content) || await repairJsonWithGemini(output.content, selectedModel, apiKey, signal);
        }

        if (!hasCompleteMultilingualContent(parsedContent, targetLanguages)) {
            throw new Error('Generated content was incomplete for one or more target languages.');
        }

        for (const lang of targetLanguages) {
            const field = `content_${lang}`;
            // Convert any markdown syntax to HTML, then normalize
            parsedContent[field] = normalizeArticleHtml(convertMarkdownToHtml(parsedContent[field] || ''));
        }

        const enhancements = await Promise.all(
            targetLanguages.map((lang) => enhanceArticleFormatting(parsedContent[`content_${lang}`] || '', languageLabels[lang] || lang, signal))
        );
        targetLanguages.forEach((lang, index) => {
            const field = `content_${lang}`;
            parsedContent[field] = addHeadingAnchors(enhancements[index] || parsedContent[field] || '');
        });

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
        if (output.groundingMetadata?.groundingChunks) {
            output.groundingMetadata.groundingChunks.forEach((chunk: any) => {
                const uri = chunk.web?.uri;
                if (uri && !combinedSources.some(existing => existing.url === uri)) {
                    combinedSources.push({ url: uri, title: chunk.web?.title || uri });
                }
            });
        }

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
        console.error("Failed to parse Gemini response as JSON");
        if (e instanceof Error && e.message) {
            throw e;
        }
        throw new Error('Generated content was not in valid JSON format.');
    }
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
