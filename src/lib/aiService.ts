import { supabase } from "@/lib/supabase";

export interface GeneratedArticle {
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

async function getSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

    if (error || !data) return null;
    return data.value;
}

const toNumber = (value?: string | null) => {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
};

const getArticleModelSetting = async () => {
    const articleModel = await getSetting('gemini_article_model');
    if (articleModel) return articleModel;
    return (await getSetting('gemini_model')) || 'gemini-2.0-flash';
};

const getArticleThinkingBudget = async () => {
    return toNumber(await getSetting('gemini_article_thinking_budget'));
};

const estimateMaxOutputTokens = (targetWordCount?: number, languageCount?: number) => {
    const words = targetWordCount && targetWordCount > 0 ? targetWordCount : 800;
    const langs = languageCount && languageCount > 0 ? languageCount : 1;
    const estimated = Math.round(words * langs * 2.2);
    return Math.min(8192, Math.max(2048, estimated));
};

const buildThinkingConfig = (model: string, thinkingBudget?: number | null) => {
    if (!thinkingBudget || thinkingBudget <= 0) return null;
    if (!/gemini-2\\.5/i.test(model)) return null;
    return {
        thinkingConfig: { thinkingBudget },
        thinking_config: { thinkingBudget }
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
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
        ? `\n\n### RESEARCH SOURCES\nCRITICAL: Analyze and synthesize the following sources to enrich the article. You MUST cite specific facts/figures from these sources where possible.\n${links.join('\n')}`
        : '';
    const researchBrief = researchFindings
        ? `\n\n### RESEARCH BRIEF (PRE-COMPILED)\nUse the following research notes and sources. Do NOT invent new sources; cite from these notes.\n${researchFindings}`
        : '';
    const researchGuidance = researchFindings
        ? `- **Research Depth**: Deep (provided). Use the research brief below; do not call external tools.`
        : getResearchGuidance(researchDepth);
    const selectedStyle = STYLE_GUIDES[type] || STYLE_GUIDES['Deep Dive'];
    const lengthGuide = getLengthGuide(length, targetWordCount);
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

### OUTPUT FORMAT
IMPORTANT: Return ONLY raw JSON. No markdown, no commentary. Even with Google grounding enabled, output JSON only.
{
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
        ? `\n\n### RESEARCH SOURCES\nAnalyze and synthesize these sources. Prioritize verifiable facts and cite the sources explicitly in the JSON.\n${links.join('\n')}`
        : '';

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
            responseMimeType: "application/json",
            response_mime_type: "application/json",
            responseSchema: getResearchPackResponseSchema(),
            response_schema: getResearchPackResponseSchema(),
            temperature: 0.3,
            maxOutputTokens: 4096,
            ...(thinkingConfig || {})
        },
        tools: [{ googleSearch: {} }]
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
    console.log('[AI] Using Gemini model:', selectedModel);

    const { useGrounding = false, customPrompt, signal, sources: providedSources } = options;
    const targetLanguages = options.targetLanguages || ['sk', 'en', 'de', 'cn'];
    const thinkingBudget = options.thinkingBudgetOverride ?? await getArticleThinkingBudget();
    const maxOutputTokens = estimateMaxOutputTokens(options.targetWordCount, targetLanguages.length);
    const thinkingConfig = buildThinkingConfig(selectedModel, thinkingBudget);

    const finalPrompt = customPrompt || getAIArticlePrompt(prompt, links, options);

    const body: any = {
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: {
            // JSON mode is incompatible with Grounding/Tools in some Gemini versions
            // We'll try to use it if Grounding is OFF, otherwise we rely on the prompt to request JSON
            responseMimeType: "application/json",
            response_mime_type: "application/json",
            maxOutputTokens,
            ...(thinkingConfig || {}),
            ...(useGrounding ? {} : { responseSchema: getArticleResponseSchema(targetLanguages), response_schema: getArticleResponseSchema(targetLanguages) })
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
    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    const groundingMetadata = result?.candidates?.[0]?.groundingMetadata;
    const usageMetadata = result?.usageMetadata;

    if (!content) throw new Error(formatGeminiError(result));

    try {
        let parsedContent = tryParseJson(content);
        if (!parsedContent) {
            parsedContent = await repairJsonWithGemini(content, selectedModel, apiKey, signal);
        }

        // Normalize HTML formatting for each language before appending sources
        parsedContent.content_sk = normalizeArticleHtml(parsedContent.content_sk || '');
        parsedContent.content_en = normalizeArticleHtml(parsedContent.content_en || '');
        parsedContent.content_de = normalizeArticleHtml(parsedContent.content_de || '');
        parsedContent.content_cn = normalizeArticleHtml(parsedContent.content_cn || '');

        // Enhance formatting if the output is too plain
        const languageLabels: Record<string, string> = {
            sk: 'Slovak (SK)',
            en: 'English (EN)',
            de: 'German (DE)',
            cn: 'Chinese (CN)',
        };
        const enhancements = await Promise.all([
            enhanceArticleFormatting(parsedContent.content_sk || '', languageLabels.sk, signal),
            enhanceArticleFormatting(parsedContent.content_en || '', languageLabels.en, signal),
            enhanceArticleFormatting(parsedContent.content_de || '', languageLabels.de, signal),
            enhanceArticleFormatting(parsedContent.content_cn || '', languageLabels.cn, signal),
        ]);
        parsedContent.content_sk = addHeadingAnchors(enhancements[0] || parsedContent.content_sk || '');
        parsedContent.content_en = addHeadingAnchors(enhancements[1] || parsedContent.content_en || '');
        parsedContent.content_de = addHeadingAnchors(enhancements[2] || parsedContent.content_de || '');
        parsedContent.content_cn = addHeadingAnchors(enhancements[3] || parsedContent.content_cn || '');

        const appendSources = (sourceItems: Array<{ url: string; title?: string }>) => {
            if (!sourceItems.length) return;
            const hasSources = ['content_sk', 'content_en', 'content_de', 'content_cn']
                .some((field) => String((parsedContent as any)[field] || '').includes('Sources & References'));
            if (!hasSources) {
                const sourcesHtml = `\n\n<h3>Sources & References</h3>\n<ol>${sourceItems.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title || s.url}</a></li>`).join('')}</ol>`;
                parsedContent.content_sk = (parsedContent.content_sk || '') + sourcesHtml;
                parsedContent.content_en = (parsedContent.content_en || '') + sourcesHtml;
                parsedContent.content_de = (parsedContent.content_de || '') + sourcesHtml;
                parsedContent.content_cn = (parsedContent.content_cn || '') + sourcesHtml;
            }
            parsedContent.sources = sourceItems;
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
            appendSources(sourceItems);
        } else if (providedSources && providedSources.length > 0) {
            const sanitizedSources = providedSources
                .filter((s): s is { url: string; title?: string } => Boolean(s?.url))
                .map((s) => ({ url: s.url, title: s.title }));
            appendSources(sanitizedSources);
        }

        // Add usage metadata if available
        if (usageMetadata) {
            parsedContent.usage = {
                promptTokens: usageMetadata.promptTokenCount || 0,
                completionTokens: usageMetadata.candidatesTokenCount || 0,
                totalTokens: usageMetadata.totalTokenCount || 0
            };
        }

        return parsedContent;
    } catch (e) {
        console.error("Failed to parse Gemini response as JSON", content);
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
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/);
        let cleanContent = jsonMatch ? jsonMatch[1] : content;

        const firstOpen = cleanContent.indexOf('{');
        const lastClose = cleanContent.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            cleanContent = cleanContent.substring(firstOpen, lastClose + 1);
        }

        const parsed = JSON.parse(cleanContent);
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
