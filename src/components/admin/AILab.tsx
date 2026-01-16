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
import { generateAIArticle, GeneratedArticle, getAIArticlePrompt } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const AILab = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [links, setLinks] = useState<string[]>(['']);
    const [articleType, setArticleType] = useState('Deep Dive');
    const [articleLength, setArticleLength] = useState('Medium');
    const [useGrounding, setUseGrounding] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<GeneratedArticle | null>(null);
    const [activeTab, setActiveTab] = useState<'sk' | 'en'>('sk');
    const [currentModel, setCurrentModel] = useState<string>('');
    const [modelSupportsGrounding, setModelSupportsGrounding] = useState<boolean>(true);

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
            length: articleLength
        });
        setCustomPrompt(p);
        setShowPromptEditor(true);
    };

    const handleResetPrompt = () => {
        const p = getAIArticlePrompt(prompt || '[Your topic here]', links.filter(l => l.trim() !== ''), {
            type: articleType,
            length: articleLength
        });
        setCustomPrompt(p);
        toast.success('Prompt reset to default');
    };

    const handleGenerate = async () => {
        if (!prompt && !customPrompt) {
            toast.error('Please enter a topic or prompt');
            return;
        }

        setGenerating(true);
        try {
            const validLinks = links.filter(l => l.trim() !== '');
            const content = await generateAIArticle(prompt, validLinks, {
                type: articleType,
                length: articleLength,
                useGrounding: useGrounding,
                customPrompt: showPromptEditor ? customPrompt : undefined
            });
            setGeneratedContent(content);
            toast.success('Article generated successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Generation failed');
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!generatedContent || !user) return;

        try {
            // 1. Generate slug
            const slug = generatedContent.title_sk
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // 2. Insert article
            const { data: article, error: articleError } = await supabase
                .from('articles')
                .insert({
                    title_sk: generatedContent.title_sk,
                    title_en: generatedContent.title_en,
                    slug: slug,
                    excerpt_sk: generatedContent.excerpt_sk,
                    excerpt_en: generatedContent.excerpt_en,
                    content_sk: generatedContent.content_sk,
                    content_en: generatedContent.content_en,
                    meta_title_sk: generatedContent.meta_title_sk,
                    meta_title_en: generatedContent.meta_title_en,
                    meta_description_sk: generatedContent.meta_description_sk,
                    meta_description_en: generatedContent.meta_description_en,
                    meta_keywords_sk: generatedContent.meta_keywords_sk,
                    meta_keywords_en: generatedContent.meta_keywords_en,
                    author_id: user.id,
                    is_published: false, // Changed from 'published' to 'is_published' to match schema
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
                        <div className="grid grid-cols-2 gap-4">
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
                                <Select value={articleLength} onValueChange={setArticleLength}>
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

                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-primary/10">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <GlobalSearchIcon size={16} className="text-primary" />
                                    Deep Research (Search Grounding)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Use Google Search to find latest information.
                                    {currentModel && (
                                        <span className="block text-[10px] text-primary mt-1">
                                            Current Model: {currentModel}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <Switch
                                checked={useGrounding}
                                onCheckedChange={setUseGrounding}
                            />
                        </div>

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
                                    Research & Generate Article
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
                                    >
                                        SK
                                    </Button>
                                    <Button
                                        variant={activeTab === 'en' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="h-7 px-3 text-xs"
                                        onClick={() => setActiveTab('en')}
                                    >
                                        EN
                                    </Button>
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
                                            {activeTab === 'sk' ? generatedContent.title_sk : generatedContent.title_en}
                                        </h1>
                                        <p className="text-muted-foreground italic border-l-2 pl-4 py-1">
                                            {activeTab === 'sk' ? generatedContent.excerpt_sk : generatedContent.excerpt_en}
                                        </p>
                                    </div>

                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: activeTab === 'sk' ? generatedContent.content_sk : generatedContent.content_en
                                        }}
                                    />

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
                                            <p><strong>Meta Title:</strong> {activeTab === 'sk' ? generatedContent.meta_title_sk : generatedContent.meta_title_en}</p>
                                            <p><strong>Meta Desc:</strong> {activeTab === 'sk' ? generatedContent.meta_description_sk : generatedContent.meta_description_en}</p>
                                            <p><strong>Keywords:</strong> {activeTab === 'sk' ? generatedContent.meta_keywords_sk : generatedContent.meta_keywords_en}</p>
                                        </div>
                                    </div>
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
