"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
    CheckmarkCircle01Icon,
    ArrowRight01Icon,
    GlobalSearchIcon,
    AiMagicIcon,
    Link01Icon,
    PlusSignIcon,
    Cancel01Icon,
    News01Icon,
    Search01Icon,
    FloppyDiskIcon,
    ViewIcon
} from 'hugeicons-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { generateAIArticle, generateAIOutline, GeneratedArticle, getAIArticlePrompt } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const AILab = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [links, setLinks] = useState<string[]>(['']);
    const [articleType, setArticleType] = useState('Deep Dive');
    const [articleLength, setArticleLength] = useState('Medium');
    const [researchDepth, setResearchDepth] = useState<'Quick' | 'Deep'>('Quick');
    const [targetWordCount, setTargetWordCount] = useState(800);
    const [customPrompt, setCustomPrompt] = useState('');
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<GeneratedArticle | null>(null);
    const [useOutlineWorkflow, setUseOutlineWorkflow] = useState(false);
    const [outlineText, setOutlineText] = useState('');
    const [outlineNotes, setOutlineNotes] = useState('');
    const [outlineSources, setOutlineSources] = useState<Array<{ title?: string; url?: string }>>([]);
    const [outlineGenerating, setOutlineGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'sk' | 'en'>('sk');
    const [currentModel, setCurrentModel] = useState<string>('');
    const [modelSupportsGrounding, setModelSupportsGrounding] = useState<boolean>(true);

    const [targetLanguages, setTargetLanguages] = useState<string[]>(['sk', 'en']);
    const [toneStyle, setToneStyle] = useState('Client-Friendly');
    const [toneInstructions, setToneInstructions] = useState('Clear, approachable, and confidence-building. Avoid legalese unless essential, explain terms briefly.');
    const [toneCustom, setToneCustom] = useState(false);

    const lengthDefaults: Record<string, number> = {
        Short: 400,
        Medium: 800,
        Large: 1300,
        Comprehensive: 1700,
        Report: 2500,
    };

    const toneDefaults: Record<string, string> = {
        'Client-Friendly': 'Clear, approachable, and confidence-building. Avoid legalese unless essential, explain terms briefly.',
        'Legal Memo': 'Formal, precise, and risk-aware. Use structured reasoning and cite applicable rules where relevant.',
        'News Brief': 'Concise, factual, and timely. Emphasize what happened and why it matters now.',
        'Executive': 'Strategic, high-level, and decision-oriented. Focus on implications, not minutiae.',
        'Neutral': 'Balanced and objective. Avoid strong opinions or marketing language.',
    };

    // Fetch model settings on load
    useEffect(() => {
        const init = async () => {
            const { data: settings } = await supabase.from('settings').select('key, value');
            const model = settings?.find(s => s.key === 'gemini_model')?.value || 'gemini-2.0-flash';
            const apiKey = settings?.find(s => s.key === 'gemini_api_key')?.value;

            setCurrentModel(model);

            // Verify capabilities if we have an API key
            if (apiKey) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`);
                    if (response.ok) {
                        const data = await response.json();
                        // Check if model supports generateContent (standard) 
                        // Note: Specific tool support isn't always explicitly listed in a simple way for all models,
                        // but generally modern Gemini models support tools. 
                        // We mainly want to ensure we aren't using a text-only legacy model if any.
                        // For now we assume true unless we detect specific legacy models, 
                        // but the user wants to KNOW.

                        // Actually, let's look for "googleSearch" in "supportedGenerationMethods" if available? 
                        // The API returns `supportedGenerationMethods` as a list of strings like "generateContent".
                        // It doesn't explicitly list "googleSearch". 
                        // However, we can warn the user if it's a model known to have issues.

                        // For now, we'll just display the model name.
                    }
                } catch (e) {
                    console.error("Failed to fetch model info", e);
                }
            }
        };
        init();
    }, []);

    useEffect(() => {
        const next = lengthDefaults[articleLength] || 800;
        setTargetWordCount(next);
    }, [articleLength]);

    useEffect(() => {
        if (!toneCustom) {
            setToneInstructions(toneDefaults[toneStyle] || '');
        }
    }, [toneStyle, toneCustom]);

    const addLink = () => setLinks([...links, '']);
    const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index));
    const updateLink = (index: number, val: string) => {
        const newLinks = [...links];
        newLinks[index] = val;
        setLinks(newLinks);
    };

    const handlePreparePrompt = () => {
        const p = getAIArticlePrompt(prompt || '[Your topic here]', links.filter(l => l.trim() !== ''), {
            type: articleType,
            length: articleLength,
            targetLanguages,
            researchDepth,
            targetWordCount,
            tone: toneStyle,
            toneInstructions
        });
        setCustomPrompt(p);
        setShowPromptEditor(true);
    };

    const handleResetPrompt = () => {
        const p = getAIArticlePrompt(prompt || '[Your topic here]', links.filter(l => l.trim() !== ''), {
            type: articleType,
            length: articleLength,
            targetLanguages,
            researchDepth,
            targetWordCount,
            tone: toneStyle,
            toneInstructions
        });
        setCustomPrompt(p);
        toast.success('Prompt reset to default');
    };

    const toggleLanguage = (lang: string) => {
        setTargetLanguages(prev =>
            prev.includes(lang)
                ? prev.filter(l => l !== lang)
                : [...prev, lang]
        );
    };

    const languageLabels: Record<string, string> = {
        sk: 'Slovak (SK)',
        en: 'English (EN)',
        de: 'German (DE)',
        cn: 'Chinese (CN)',
    };

    const handleGenerate = async () => {
        if (!prompt && !customPrompt) {
            toast.error('Please enter a topic or prompt');
            return;
        }

        if (targetLanguages.length === 0) {
            toast.error('Please select at least one language');
            return;
        }

        setGenerating(true);
        try {
            const validLinks = links.filter(l => l.trim() !== '');
            if (useOutlineWorkflow && !outlineText && !showPromptEditor) {
                await handleGenerateOutline();
                setGenerating(false);
                return;
            }
            const content = await generateAIArticle(prompt, validLinks, {
                type: articleType,
                length: articleLength,
                useGrounding: researchDepth === 'Deep',
                customPrompt: showPromptEditor ? customPrompt : undefined,
                targetLanguages,
                researchDepth,
                targetWordCount,
                tone: toneStyle,
                toneInstructions,
                outline: useOutlineWorkflow && outlineText && !showPromptEditor ? outlineText : undefined
            });
            setGeneratedContent(content);

            // Log token usage if available
            if (user && content.usage) {
                try {
                    await supabase.from('ai_usage_logs').insert({
                        user_id: user.id,
                        action: 'generate_article',
                        model: await supabase.from('settings').select('value').eq('key', 'gemini_model').single().then(r => r.data?.value || 'gemini-2.0-flash'),
                        input_tokens: content.usage.promptTokens,
                        output_tokens: content.usage.completionTokens,
                        total_tokens: content.usage.totalTokens
                    });
                } catch (err) {
                    console.error('Failed to log AI usage:', err);
                }
            }

            toast.success('Article generated successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Generation failed');
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateOutline = async () => {
        if (!prompt && !customPrompt) {
            toast.error('Please enter a topic or prompt');
            return;
        }
        if (targetLanguages.length === 0) {
            toast.error('Please select at least one language');
            return;
        }
        setOutlineGenerating(true);
        try {
            const validLinks = links.filter(l => l.trim() !== '');
            const primaryLang = targetLanguages[0] || 'en';
            const outlineResult = await generateAIOutline(prompt, validLinks, {
                type: articleType,
                length: articleLength,
                researchDepth,
                targetWordCount,
                tone: toneStyle,
                toneInstructions,
                languageLabel: languageLabels[primaryLang] || primaryLang,
                useGrounding: researchDepth === 'Deep',
            });
            setOutlineText(outlineResult.outline.join('\n'));
            setOutlineNotes(outlineResult.notes || '');
            setOutlineSources(outlineResult.sources || []);
            toast.success('Outline generated');
        } catch (error: any) {
            toast.error(error.message || 'Outline generation failed');
        } finally {
            setOutlineGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!generatedContent || !user) return;

        try {
            // 1. Generate slug from the first available title
            const titleForSlug = generatedContent.title_sk || generatedContent.title_en || generatedContent.title_de || generatedContent.title_cn || 'untitled-article';
            const slug = titleForSlug
                .toLowerCase()
                .normalize('NFD') // Separate accents
                .replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
                .replace(/(^-|-$)/g, '') // Remove leading/trailing hyphens
                + '-' + Date.now().toString().slice(-4); // Add unique suffix to prevent collisions

            // 2. Insert article
            const { data: article, error: articleError } = await supabase
                .from('articles')
                .insert({
                    title_sk: generatedContent.title_sk || '',
                    title_en: generatedContent.title_en || '',
                    title_de: generatedContent.title_de || '',
                    title_cn: generatedContent.title_cn || '',
                    slug: slug,
                    excerpt_sk: generatedContent.excerpt_sk || '',
                    excerpt_en: generatedContent.excerpt_en || '',
                    excerpt_de: generatedContent.excerpt_de || '',
                    excerpt_cn: generatedContent.excerpt_cn || '',
                    content_sk: generatedContent.content_sk || '',
                    content_en: generatedContent.content_en || '',
                    content_de: generatedContent.content_de || '',
                    content_cn: generatedContent.content_cn || '',
                    meta_title_sk: generatedContent.meta_title_sk || '',
                    meta_title_en: generatedContent.meta_title_en || '',
                    meta_title_de: generatedContent.meta_title_de || '',
                    meta_title_cn: generatedContent.meta_title_cn || '',
                    meta_description_sk: generatedContent.meta_description_sk || '',
                    meta_description_en: generatedContent.meta_description_en || '',
                    meta_description_de: generatedContent.meta_description_de || '',
                    meta_description_cn: generatedContent.meta_description_cn || '',
                    meta_keywords_sk: generatedContent.meta_keywords_sk || '',
                    meta_keywords_en: generatedContent.meta_keywords_en || '',
                    meta_keywords_de: generatedContent.meta_keywords_de || '',
                    meta_keywords_cn: generatedContent.meta_keywords_cn || '',
                    author_id: user.id,
                    is_published: false,
                })
                .select()
                .single();

            if (articleError) throw articleError;

            // 3. Handle Tags
            if (generatedContent.tags && generatedContent.tags.length > 0) {
                for (const tagName of generatedContent.tags) {
                    const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                    // Upsert tag
                    let { data: tag } = await supabase
                        .from('tags')
                        .select('id')
                        .eq('slug', tagSlug)
                        .maybeSingle();

                    if (!tag) {
                        const { data: newTag, error: tagError } = await supabase
                            .from('tags')
                            .insert({ name_sk: tagName, name_en: tagName, slug: tagSlug })
                            .select()
                            .single();
                        if (tagError) continue;
                        tag = newTag;
                    }

                    // Link tag to article
                    if (tag) {
                        await supabase.from('article_tags').insert({
                            article_id: article.id,
                            tag_id: tag.id
                        });
                    }
                }
            }

            toast.success('Article saved as draft!');
            router.push(`/admin/articles/edit/${article.id}`); // Adjusted route to match current project
        } catch (error: any) {
            toast.error(error.message || 'Failed to save article');
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Pane */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AiMagicIcon size={24} className="text-primary" />
                            <CardTitle>AI Article Generator</CardTitle>
                        </div>
                        <CardDescription>
                            Provide a topic and research links to generate a complete, bilingual article.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Target Languages</Label>
                            <div className="flex flex-wrap gap-2">
                                {['sk', 'en', 'de', 'cn'].map((lang) => (
                                    <div
                                        key={lang}
                                        onClick={() => toggleLanguage(lang)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-all border ${targetLanguages.includes(lang)
                                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {targetLanguages.includes(lang) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            {lang === 'sk' && 'Slovak (SK)'}
                                            {lang === 'en' && 'English (EN)'}
                                            {lang === 'de' && 'German (DE)'}
                                            {lang === 'cn' && 'Chinese (CN)'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Article Type</Label>
                                <Select value={articleType} onValueChange={setArticleType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Deep Dive">Deep Dive</SelectItem>
                                        <SelectItem value="News">News</SelectItem>
                                        <SelectItem value="Trends">Trends</SelectItem>
                                        <SelectItem value="Law">Law</SelectItem>
                                        <SelectItem value="Accounting">Accounting</SelectItem>
                                        <SelectItem value="Tax">Tax</SelectItem>
                                        <SelectItem value="Regulatory">Regulatory</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Length</Label>
                                <Select value={articleLength} onValueChange={(value) => setArticleLength(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select length" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Short">Short (300-500w)</SelectItem>
                                        <SelectItem value="Medium">Medium (700-900w)</SelectItem>
                                        <SelectItem value="Large">Large (1200w+)</SelectItem>
                                        <SelectItem value="Comprehensive">Comprehensive (1500-2000w)</SelectItem>
                                        <SelectItem value="Report">Deep Report (2500w+)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-primary/10">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <GlobalSearchIcon size={16} className="text-primary" />
                                Research Depth
                            </Label>
                            <Select value={researchDepth} onValueChange={(value) => setResearchDepth(value as 'Quick' | 'Deep')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select depth" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Quick">Quick (No web grounding)</SelectItem>
                                    <SelectItem value="Deep">Deep (Use Google Search)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {researchDepth === 'Deep'
                                    ? 'Deep mode uses Google Search grounding to verify facts.'
                                    : 'Quick mode uses only your prompt + links; no external search.'}
                                {currentModel && (
                                    <span className="block text-[10px] text-primary mt-1">
                                        Current Model: {currentModel}
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Target Word Count</Label>
                                <Input
                                    type="number"
                                    min={300}
                                    max={3000}
                                    value={targetWordCount}
                                    onChange={(e) => setTargetWordCount(Math.max(300, Math.min(3000, parseInt(e.target.value) || 0)))}
                                    className="w-28"
                                />
                            </div>
                            <Slider
                                min={300}
                                max={3000}
                                step={50}
                                value={[targetWordCount]}
                                onValueChange={(value) => setTargetWordCount(value[0] ?? 800)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Word count target is enforced in the prompt (±10%).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Tone / Voice</Label>
                            <Select value={toneStyle} onValueChange={(value) => { setToneStyle(value); setToneCustom(false); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tone" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Client-Friendly">Client-Friendly</SelectItem>
                                    <SelectItem value="Legal Memo">Legal Memo</SelectItem>
                                    <SelectItem value="News Brief">News Brief</SelectItem>
                                    <SelectItem value="Executive">Executive</SelectItem>
                                    <SelectItem value="Neutral">Neutral</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Tone Instructions (customizable)</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                            setToneInstructions(toneDefaults[toneStyle] || '');
                                            setToneCustom(false);
                                        }}
                                    >
                                        Reset to Default
                                    </Button>
                                </div>
                                <Textarea
                                    value={toneInstructions}
                                    onChange={(e) => {
                                        setToneInstructions(e.target.value);
                                        setToneCustom(true);
                                    }}
                                    rows={3}
                                    placeholder="Add your own tone instructions..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-primary/10">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <PlusSignIcon size={16} className="text-primary" />
                                    Outline-First Workflow
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Generate an outline first, review it, then create the full article.
                                </p>
                            </div>
                            <Switch
                                checked={useOutlineWorkflow}
                                onCheckedChange={(value) => {
                                    setUseOutlineWorkflow(value);
                                    if (!value) {
                                        setOutlineText('');
                                        setOutlineNotes('');
                                        setOutlineSources([]);
                                    }
                                }}
                            />
                        </div>
                        {useOutlineWorkflow && showPromptEditor && (
                            <p className="text-[10px] text-muted-foreground">
                                Outline workflow is disabled while the custom prompt editor is enabled.
                            </p>
                        )}

                        {useOutlineWorkflow && !showPromptEditor && (
                            <div className="space-y-2">
                                <Label>Outline (editable)</Label>
                                <Textarea
                                    value={outlineText}
                                    onChange={(e) => setOutlineText(e.target.value)}
                                    rows={6}
                                    placeholder="Generate an outline or write your own structure here..."
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Outline is injected into the prompt for the final article.
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleGenerateOutline}
                                        disabled={outlineGenerating}
                                    >
                                        {outlineGenerating ? 'Generating...' : 'Generate Outline'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setOutlineText('');
                                            setOutlineNotes('');
                                            setOutlineSources([]);
                                        }}
                                    >
                                        Clear
                                    </Button>
                                </div>
                                {outlineNotes && (
                                    <div className="text-xs text-muted-foreground">
                                        <strong>Notes:</strong> {outlineNotes}
                                    </div>
                                )}
                                {outlineSources.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                        <strong>Outline Sources:</strong>
                                        <ul className="list-disc list-inside">
                                            {outlineSources.map((source, idx) => (
                                                <li key={`${source.url}-${idx}`}>
                                                    {source.title || source.url}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-primary/10">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <PlusSignIcon size={16} className="text-primary" rotate={showPromptEditor ? 45 : 0} />
                                    Customize System Prompt
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    View and edit the exact instructions sent to AI.
                                </p>
                            </div>
                            <Switch
                                checked={showPromptEditor}
                                onCheckedChange={(val) => {
                                    if (val && !customPrompt) handlePreparePrompt();
                                    setShowPromptEditor(val);
                                }}
                            />
                        </div>

                        {showPromptEditor && (
                            <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs uppercase text-muted-foreground">System Prompt Editor</Label>
                                    <Button variant="ghost" size="sm" onClick={handleResetPrompt} className="text-xs h-7">
                                        Reset to Default
                                    </Button>
                                </div>
                                <Textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    rows={10}
                                    className="font-mono text-xs bg-muted/50"
                                    placeholder="Click 'Customize System Prompt' to generate the default prompt based on your settings..."
                                />
                                <p className="text-[10px] text-orange-500 font-medium">
                                    ⚠️ Caution: Manually changing the JSON structure instructions might break generation.
                                </p>
                            </div>
                        )}

                        {!showPromptEditor && (
                            <div className="space-y-2">
                                <Label htmlFor="prompt">Topic / Content Description</Label>
                                <Textarea
                                    id="prompt"
                                    placeholder="e.g., New trademark regulations in the EU for 2026 and their impact on SMEs..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={4}
                                />
                            </div>
                        )}

                        {!showPromptEditor && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <Link01Icon size={16} />
                                        Research Links (News, Sources)
                                    </Label>
                                    <Button variant="ghost" size="sm" onClick={addLink} className="h-8 px-2">
                                        <PlusSignIcon size={14} className="mr-1" /> Add
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {links.map((link, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="https://..."
                                                value={link}
                                                onChange={(e) => updateLink(index, e.target.value)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeLink(index)}
                                                disabled={links.length === 1}
                                            >
                                                <Cancel01Icon size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full bg-primary hover:bg-primary/90"
                        >
                            {generating ? (
                                <>Generating...</>
                            ) : (
                                <>
                                    <Search01Icon size={18} className="mr-2" />
                                    {useOutlineWorkflow && !outlineText && !showPromptEditor ? 'Generate Outline' : 'Research & Generate Article'}
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Preview Pane */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ViewIcon size={24} className="text-muted-foreground" />
                                <CardTitle>Article Preview</CardTitle>
                            </div>
                            {generatedContent && (
                                <div className="flex bg-muted rounded-md p-1 gap-1">
                                    <Button
                                        variant={activeTab === 'sk' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="h-7 px-3 text-xs"
                                        onClick={() => setActiveTab('sk')}
                                        disabled={!generatedContent.title_sk && !generatedContent.content_sk}
                                    >
                                        SK
                                    </Button>
                                    <Button
                                        variant={activeTab === 'en' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="h-7 px-3 text-xs"
                                        onClick={() => setActiveTab('en')}
                                        disabled={!generatedContent.title_en && !generatedContent.content_en}
                                    >
                                        EN
                                    </Button>
                                    {/* Additional languages dynamically shown if they exist */}
                                    {(generatedContent.title_de || generatedContent.content_de) && (
                                        <Button
                                            variant={activeTab === 'de' as any ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="h-7 px-3 text-xs"
                                            onClick={() => setActiveTab('de' as any)}
                                        >
                                            DE
                                        </Button>
                                    )}
                                    {(generatedContent.title_cn || generatedContent.content_cn) && (
                                        <Button
                                            variant={activeTab === 'cn' as any ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="h-7 px-3 text-xs"
                                            onClick={() => setActiveTab('cn' as any)}
                                        >
                                            CN
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[400px]">
                        {generatedContent ? (
                            <ScrollArea className="h-[500px] pr-4">
                                <div className="space-y-6">
                                    <div>
                                        <h1 className="text-2xl font-bold mb-2">
                                            {(generatedContent as any)[`title_${activeTab}`]}
                                        </h1>
                                        <p className="text-muted-foreground italic border-l-2 pl-4 py-1">
                                            {(generatedContent as any)[`excerpt_${activeTab}`]}
                                        </p>
                                    </div>

                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: (generatedContent as any)[`content_${activeTab}`] || '<p>No content generated for this language.</p>'
                                        }}
                                    />

                                    {generatedContent.sources && generatedContent.sources.length > 0 && (
                                        <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                                <GlobalSearchIcon size={14} className="text-primary" />
                                                Sources & References
                                            </h3>
                                            <ul className="text-xs list-disc list-inside space-y-1">
                                                {generatedContent.sources.map((source, idx) => (
                                                    <li key={`${source.url}-${idx}`}>
                                                        <a
                                                            href={source.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline"
                                                        >
                                                            {source.title || source.url}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t flex flex-wrap gap-2">
                                        {generatedContent.tags.map(tag => (
                                            <Badge key={tag} variant="outline">{tag}</Badge>
                                        ))}
                                    </div>

                                    <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <CheckmarkCircle01Icon size={14} className="text-green-500" />
                                            Generated SEO Data
                                        </h3>
                                        <div className="text-xs space-y-1">
                                            <p><strong>Meta Title:</strong> {(generatedContent as any)[`meta_title_${activeTab}`]}</p>
                                            <p><strong>Meta Desc:</strong> {(generatedContent as any)[`meta_description_${activeTab}`]}</p>
                                            <p><strong>Keywords:</strong> {(generatedContent as any)[`meta_keywords_${activeTab}`]}</p>
                                        </div>
                                    </div>

                                    {generatedContent.usage && (
                                        <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                                <AiMagicIcon size={14} className="text-blue-500" />
                                                Token Usage Stats
                                            </h3>
                                            <div className="grid grid-cols-3 gap-2 text-xs text-center">
                                                <div className="bg-background rounded p-2 border">
                                                    <p className="text-muted-foreground text-[10px] uppercase">Input</p>
                                                    <p className="font-mono font-medium">{generatedContent.usage.promptTokens}</p>
                                                </div>
                                                <div className="bg-background rounded p-2 border">
                                                    <p className="text-muted-foreground text-[10px] uppercase">Output</p>
                                                    <p className="font-mono font-medium">{generatedContent.usage.completionTokens}</p>
                                                </div>
                                                <div className="bg-background rounded p-2 border">
                                                    <p className="text-muted-foreground text-[10px] uppercase">Total</p>
                                                    <p className="font-mono font-medium">{generatedContent.usage.totalTokens}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/50 text-muted-foreground text-center p-8">
                                <div>
                                    <News01Icon size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>Generated content will appear here.</p>
                                    <p className="text-xs">Select your parameters and click Generate.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    {generatedContent && (
                        <CardFooter className="pt-4 border-t">
                            <Button onClick={handleSave} className="w-full">
                                <FloppyDiskIcon size={18} className="mr-2" />
                                Save as Draft and Edit
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AILab;
