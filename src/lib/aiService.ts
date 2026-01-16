import { supabase } from "@/lib/supabase";

export interface GeneratedArticle {
    title_sk: string;
    title_en: string;
    title_de: string;
    title_cn: string;
    excerpt_sk: string;
    excerpt_en: string;
    excerpt_de: string;
    excerpt_cn: string;
    content_sk: string;
    content_en: string;
    content_de: string;
    content_cn: string;
    meta_title_sk: string;
    meta_title_en: string;
    meta_title_de: string;
    meta_title_cn: string;
    meta_description_sk: string;
    meta_description_en: string;
    meta_description_de: string;
    meta_description_cn: string;
    meta_keywords_sk: string;
    meta_keywords_en: string;
    meta_keywords_de: string;
    meta_keywords_cn: string;
    tags: string[];
}

async function getSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error || !data) return null;
    return data.value;
}

export function getAIArticlePrompt(
    prompt: string,
    links: string[] = [],
    options: { type?: string, length?: string } = {}
): string {
    const { type = 'Deep Dive', length = 'Medium' } = options;
    const researchContext = links.length > 0
        ? `\n\n### DEEP RESEARCH SOURCES\nCRITICAL: Analyze and synthesize the following sources to enrich the article. You MUST cite specific facts/figures from these sources where possible.\n${links.join('\n')}`
        : '';

    // Style Definitions
    const styleGuides: Record<string, string> = {
        'Deep Dive': `
- **Structure**: Comprehensive analysis. Introduction -> Background -> Key Issues/Analysis -> Strategic Implications -> Conclusion.
- **Tone**: Authoritative, analytical, thought-provoking.
- **Focus**: Explore the 'why' and 'how'. Connect dots between disparate trends. Provide strategic foresight.`,
        'News': `
- **Structure**: Journalistic "Inverted Pyramid". Most important info first -> Supporting details -> Context.
- **Tone**: Objective, factual, concise, urgent.
- **Focus**: What happened? Who is involved? When? Why does it matter right now?`,
        'Trends': `
- **Structure**: Pattern recognition. Current state -> Emerging shift -> Evidence/Data -> Future prediction.
- **Tone**: Forward-looking, speculative but grounded, exciting.
- **Focus**: Identify new shifts in the market or industry. Use data to support predictions.`,
        'Law': `
- **Structure**: Formal legal brief style. Issue -> Rule/Regulation -> Analysis/Application -> Conclusion.
- **Tone**: Precise, formal, guarded but clear.
- **Focus**: Cite specific laws (Acts, Paragraphs) where applicable. Focus on compliance and legal risk.`,
        'Tax': `
- **Structure**: Advisory. Situation/Change -> Impact on Tax Liability -> Actionable Advice.
- **Tone**: Practical, advisory, detailed.
- **Focus**: Specific tax rates, deadlines, and deductions. Focus on optimization and compliance.`,
        'Accounting': `
- **Structure**: Technical. Standard/Principle -> Application -> Reporting Impact.
- **Tone**: Technical, clear, methodical.
- **Focus**: Impact on financial statements (Balance Sheet, P&L). IFRS/SAS standards.`
    };

    const selectedStyle = styleGuides[type] || styleGuides['Deep Dive'];

    let lengthGuide = 'Standard depth (700-900 words). Balanced capability and detail.';
    if (length === 'Short') lengthGuide = 'Focus on brevity (300-500 words). Stick to the core message. No fluff.';
    if (length === 'Large') lengthGuide = 'Extensive coverage (1200w+). Include historical context, multiple perspectives, and detailed examples.';
    if (length === 'Comprehensive') lengthGuide = 'Very extensive (1500-2000 words). Cover every angle. Multiple sections, data points, and deep analysis.';
    if (length === 'Report') lengthGuide = 'Maximum depth (2500 words+). Whitepaper quality. Executive summary + Detailed Chapters + Recommendations.';

    return `You are an elite expert writer for OCP (Omni Consulting Products), a premier consulting firm.
Your task is to write a world-class article that demonstrates deep expertise and strategic value.

### ARTICLE CONFIGURATION
- **Topic**: ${prompt}
- **Type**: ${type}
- **Target Length**: ${length} (${lengthGuide})
${researchContext}

### STYLE GUIDELINES
${selectedStyle}

### WRITING RULES
1. **Professionalism**: Use professional, business-grade language. Avoid generic AI phrases.
2. **Value**: Every paragraph must add value. No filler.
3. **Multilingual**: You must generate the article in **Slovak (SK)**, **English (EN)**, **German (DE)**, and **Chinese (CN)** simultaneously.
4. **Formatting**: Use HTML tags (\`<h2>\`, \`<h3>\`, \`<ul>\`, \`<li>\`, \`<p>\`, \`<strong>\`) for content. Do not use Markdown characters like # or ** inside the JSON strings.

### OUTPUT FORMAT
IMPORTANT: Return ONLY raw JSON. No markdown blocking. No conversation.
{
  "title_sk": "Title (SK)",
  "title_en": "Title (EN)",
  "title_de": "Title (DE)",
  "title_cn": "Title (CN)",
  "excerpt_sk": "Summary (SK)",
  "excerpt_en": "Summary (EN)",
  "excerpt_de": "Summary (DE)",
  "excerpt_cn": "Summary (CN)",
  "content_sk": "HTML string (SK)",
  "content_en": "HTML string (EN)",
  "content_de": "HTML string (DE)",
  "content_cn": "HTML string (CN)",
  "meta_title_sk": "SEO Title SK (max 60 chars)",
  "meta_title_en": "SEO Title EN (max 60 chars)",
  "meta_title_de": "SEO Title DE (max 60 chars)",
  "meta_title_cn": "SEO Title CN (max 60 chars)",
  "meta_description_sk": "SEO Desc SK (max 160 chars)",
  "meta_description_en": "SEO Desc EN (max 160 chars)",
  "meta_description_de": "SEO Desc DE (max 160 chars)",
  "meta_description_cn": "SEO Desc CN (max 160 chars)",
  "meta_keywords_sk": "keywords, sk",
  "meta_keywords_en": "keywords, en",
  "meta_keywords_de": "keywords, de",
  "meta_keywords_cn": "keywords, cn",
  "tags": ["tag1", "tag2", "tag3"]
}`;
}

export async function generateAIArticle(
    prompt: string,
    links: string[] = [],
    options: { type?: string, length?: string, useGrounding?: boolean, customPrompt?: string } = {}
): Promise<GeneratedArticle> {
    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API Key not found in settings.');

    // Get selected model, fallback to gemini-2.0-flash
    const selectedModel = await getSetting('gemini_model') || 'gemini-2.0-flash';
    console.log('[AI] Using Gemini model:', selectedModel);

    const { useGrounding = false, customPrompt } = options;

    const finalPrompt = customPrompt || getAIArticlePrompt(prompt, links, options);

    const body: any = {
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: {
            // JSON mode is incompatible with Grounding/Tools in some Gemini versions
            // We'll try to use it if Grounding is OFF, otherwise we rely on the prompt to request JSON
            responseMimeType: useGrounding ? "text/plain" : "application/json"
        }
    };

    if (useGrounding) {
        body.tools = [{ googleSearch: {} }];
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Error: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    let content = result.candidates[0]?.content?.parts[0]?.text;
    const groundingMetadata = result.candidates[0]?.groundingMetadata;

    if (!content) throw new Error('No content generated by Gemini.');

    try {
        // If content is wrapped in markdown code block, extract it
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/);
        let cleanContent = jsonMatch ? jsonMatch[1] : content;

        // Fallback: Find first '{' and last '}' to handle partial matches or conversational prefixes
        const firstOpen = cleanContent.indexOf('{');
        const lastClose = cleanContent.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            cleanContent = cleanContent.substring(firstOpen, lastClose + 1);
        }

        const parsedContent = JSON.parse(cleanContent);

        // Append grounding sources if available
        if (groundingMetadata?.groundingChunks) {
            const sources = groundingMetadata.groundingChunks
                .map((chunk: any) => chunk.web?.uri ? `<a href="${chunk.web.uri}" target="_blank">${chunk.web.title || chunk.web.uri}</a>` : null)
                .filter(Boolean);

            if (sources.length > 0) {
                const sourcesHtml = `\n\n<h3>Sources & References</h3>\n<ul>${sources.map((s: string) => `<li>${s}</li>`).join('')}</ul>`;
                parsedContent.content_sk += sourcesHtml;
                parsedContent.content_en += sourcesHtml;
                parsedContent.content_de += sourcesHtml;
                parsedContent.content_cn += sourcesHtml;
            }
        }

        return parsedContent;
    } catch (e) {
        console.error("Failed to parse Gemini response as JSON", content);
        throw new Error('Generated content was not in valid JSON format.');
    }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    if (!response.ok) throw new Error('Gemini API Error');
    const result = await response.json();
    return JSON.parse(result.candidates[0].content.parts[0].text);
}

export async function generateAIImage(prompt: string, options: { turbo?: boolean } = {}): Promise<string> {
    const { turbo: forceTurbo } = options;

    // Check global settings if turbo is not forced
    // Default to 'turbo' if not set or if forceTurbo is true
    let useTurbo = forceTurbo;

    if (useTurbo === undefined) {
        const globalImageModel = await getSetting('image_model');
        useTurbo = globalImageModel === 'turbo';
        // If global setting is missing, default to turbo (safer/free)
        if (globalImageModel === null) useTurbo = true;
    }

    if (useTurbo) {
        // Use Pollinations.ai for fast, free, high-quality Flux images
        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(prompt);
        return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
    }

    // Pro mode: Use Gemini's Imagen (requires Gemini API key)
    const apiKey = await getSetting('gemini_api_key');
    if (!apiKey) {
        console.warn('Gemini API key not found, falling back to Turbo mode');
        return generateAIImage(prompt, { turbo: true });
    }

    try {
        // Get selected image model, fallback to imagen-3.0-generate-001 (standard Gemini Image Gen)
        const imageModel = await getSetting('gemini_image_model') || 'imagen-3.0-generate-001';
        console.log('[AI] Generating image with Gemini model:', imageModel);

        // Use Gemini's image generation model
        // Note: Some models use :predict, others :generateContent. 
        // Generative Language API usually uses :generateContent for Imagen via Gemini 2.0 or specific endpoints.
        // We'll try the standard :generateContent endpoint which works for most new models including Gemini 2.0 Flash Exp (if supported) and Imagen 3 via API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Generate a professional, high-quality image for an article. The image should be: ${prompt}`
                        }]
                    }],
                    // Only some models support responseModalities, but it's good practice for 2.0
                    // If using Imagen 3 specifically, the body might differ, but via Generative Language API it's continuously unified.
                    generationConfig: {
                        responseModalities: ["IMAGE"]
                    }
                })
            }
        );

        if (!response.ok) {
            if (response.status === 404 && imageModel !== 'imagen-3.0-generate-001') {
                console.warn(`[AI] Model ${imageModel} not found (404). retrying with fallback: imagen-3.0-generate-001`);
                return await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `Generate a professional, high-quality image for an article. The image should be: ${prompt}` }] }],
                            generationConfig: { responseModalities: ["IMAGE"] }
                        })
                    }
                ).then(async (res) => {
                    if (!res.ok) {
                        const err = await res.text();
                        console.warn('Gemini Imagen Fallback (Imagen 3) also returned 404/Error. This is expected if the model is unavailable. Switching to Turbo...', err);
                        throw new Error('Gemini image generation failed (Fallback)');
                    }
                    const result = await res.json();
                    const parts = result.candidates?.[0]?.content?.parts || [];
                    const imagePart = parts.find((p: any) => p.inlineData);
                    if (imagePart?.inlineData?.data) {
                        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    }
                    throw new Error('No image detected in fallback response');
                });
            }

            const errorData = await response.text();
            console.error('Gemini Imagen error:', errorData);
            throw new Error('Gemini image generation failed');
        }

        const result = await response.json();

        // Extract the image data from the response
        const parts = result.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

        if (imagePart?.inlineData?.data) {
            // Return as base64 data URL
            const mimeType = imagePart.inlineData.mimeType || 'image/png';
            return `data:${mimeType};base64,${imagePart.inlineData.data}`;
        }

        throw new Error('No image data in Gemini response');
        // ... existing code ...
    } catch (err) {
        console.warn('Gemini Imagen failed (Handled), falling back to Turbo mode:', err);
        return generateAIImage(prompt, { turbo: true });
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
        headers: { 'Content-Type': 'application/json' },
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
