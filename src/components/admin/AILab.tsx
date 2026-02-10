"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { generateAIArticle, generateAIOutline, generateAIResearchPack, GeneratedArticle, getAIArticlePrompt, testGeminiConnection } from '@/lib/aiService';
import { fetchAISettings, fetchGeminiModels, filterTextModels, GeminiModel } from '@/lib/aiSettings';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatArticleHtml } from '@/lib/articleFormat';
import { AdminPanelHeader } from '@/components/admin/AdminPrimitives';
import { RefreshCw } from 'lucide-react';

type AILabProps = {
    redirectTab?: string;
    onDraftSaved?: (articleId: string) => void;
};

const AILab = ({ redirectTab, onDraftSaved }: AILabProps) => {
    const { user } = useAuth();
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [links, setLinks] = useState<string[]>(['']);
    const [articleType, setArticleType] = useState('Deep Dive');
    const [articleLength, setArticleLength] = useState('Medium');
    const [uiMode, setUiMode] = useState<'simple' | 'power'>('simple');
    const [researchMode, setResearchMode] = useState<'none' | 'deep' | 'grounding'>('none');
    const [targetWordCount, setTargetWordCount] = useState(800);
    const [customPrompt, setCustomPrompt] = useState('');
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [showPowerControls, setShowPowerControls] = useState(false);
    const [showSourceLinks, setShowSourceLinks] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<GeneratedArticle | null>(null);
    const [useOutlineWorkflow, setUseOutlineWorkflow] = useState(false);
    const [outlineText, setOutlineText] = useState('');
    const [outlineNotes, setOutlineNotes] = useState('');
    const [outlineSources, setOutlineSources] = useState<Array<{ title?: string; url?: string }>>([]);
    const [outlineGenerating, setOutlineGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('sk');
    const [currentModel, setCurrentModel] = useState<string>('');
    const [modelSupportsGrounding, setModelSupportsGrounding] = useState<boolean>(true);
    const [thinkingBudget, setThinkingBudget] = useState<number>(0);
    const [requestBudgetUsd, setRequestBudgetUsd] = useState<number>(0);
    const [savedModel, setSavedModel] = useState<string>('');
    const [savedThinkingBudget, setSavedThinkingBudget] = useState<number>(0);
    const [savedRequestBudgetUsd, setSavedRequestBudgetUsd] = useState<number>(0);
    const [dailyTokenQuota, setDailyTokenQuota] = useState<number>(0);
    const [monthlyTokenQuota, setMonthlyTokenQuota] = useState<number>(0);
    const [dailyUsdQuota, setDailyUsdQuota] = useState<number>(0);
    const [monthlyUsdQuota, setMonthlyUsdQuota] = useState<number>(0);
    const [requestCooldownSeconds, setRequestCooldownSeconds] = useState<number>(0);
    const [lastGenerationStartedAt, setLastGenerationStartedAt] = useState<number | null>(null);
    const [modelOptions, setModelOptions] = useState<GeminiModel[]>([]);
    const [modelLoading, setModelLoading] = useState(false);
    const [articleSettingsSaving, setArticleSettingsSaving] = useState(false);

    const [targetLanguages, setTargetLanguages] = useState<string[]>(['sk', 'en']);
    const [toneStyle, setToneStyle] = useState('Client-Friendly');
    const [toneInstructions, setToneInstructions] = useState('Clear, approachable, and confidence-building. Avoid legalese unless essential, explain terms briefly.');
    const [toneCustom, setToneCustom] = useState(false);
    const [priceInputPerM, setPriceInputPerM] = useState<number | null>(null);
    const [priceOutputPerM, setPriceOutputPerM] = useState<number | null>(null);
    const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);
    const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
    const [generationStatus, setGenerationStatus] = useState<string>('');
    const [generationElapsedMs, setGenerationElapsedMs] = useState<number>(0);
    const [lastRequestId, setLastRequestId] = useState<string | null>(null);
    const [testRunning, setTestRunning] = useState(false);
    const [researchSources, setResearchSources] = useState<Array<{ title?: string; url?: string }>>([]);
    const [researchSummary, setResearchSummary] = useState<string>('');
    const [preflightCostEstimate, setPreflightCostEstimate] = useState<number | null>(null);

    const [isSavingDraft, setIsSavingDraft] = useState(false);

    const generationControllerRef = useRef<AbortController | null>(null);
    const generationTimeoutRef = useRef<number | null>(null);
    const generationTimerRef = useRef<number | null>(null);
    const generationStartRef = useRef<number | null>(null);

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

    const articleSettingsDirty =
        currentModel !== savedModel ||
        thinkingBudget !== savedThinkingBudget ||
        requestBudgetUsd !== savedRequestBudgetUsd;

    const saveArticleSettings = async (silent = false) => {
        if (articleSettingsSaving) return true;
        setArticleSettingsSaving(true);
        try {
            const payload = [
                { key: 'gemini_article_model', value: currentModel || 'gemini-2.0-flash' },
                { key: 'gemini_article_thinking_budget', value: String(Math.max(0, thinkingBudget || 0)) },
                { key: 'gemini_request_budget_usd', value: String(Math.max(0, requestBudgetUsd || 0)) },
            ];
            const { error } = await supabase.from('settings').upsert(payload, { onConflict: 'key' });
            if (error) throw error;
            setSavedModel(currentModel || 'gemini-2.0-flash');
            setSavedThinkingBudget(Math.max(0, thinkingBudget || 0));
            setSavedRequestBudgetUsd(Math.max(0, requestBudgetUsd || 0));
            if (!silent) toast.success('Article model settings saved.');
            return true;
        } catch (err: any) {
            if (!silent) toast.error(err?.message || 'Failed to save article model settings.');
            return false;
        } finally {
            setArticleSettingsSaving(false);
        }
    };

    // Fetch model settings on load
    useEffect(() => {
        const init = async () => {
            const settings = await fetchAISettings();
            // Priority: Global model from Settings is the default.
            // geminiArticleModel is only used if explicitly set in Power Controls.
            const articleModel = settings.geminiModel || settings.geminiArticleModel || 'gemini-2.0-flash';
            setCurrentModel(articleModel);
            setSavedModel(articleModel);
            const budget = settings.geminiArticleThinkingBudget ?? 0;
            setThinkingBudget(budget);
            setSavedThinkingBudget(budget);
            const requestBudget = settings.geminiRequestBudgetUsd ?? 0;
            setRequestBudgetUsd(requestBudget);
            setSavedRequestBudgetUsd(requestBudget);
            setDailyTokenQuota(settings.geminiQuotaDailyTokens ?? 0);
            setMonthlyTokenQuota(settings.geminiQuotaMonthlyTokens ?? 0);
            setDailyUsdQuota(settings.geminiQuotaDailyUsd ?? 0);
            setMonthlyUsdQuota(settings.geminiQuotaMonthlyUsd ?? 0);
            setRequestCooldownSeconds(settings.geminiRequestCooldownSeconds ?? 0);
            setPriceInputPerM(settings.priceInputPerM);
            setPriceOutputPerM(settings.priceOutputPerM);

            if (settings.geminiApiKey && settings.geminiModel) {
                try {
                    await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}?key=${settings.geminiApiKey}`);
                } catch (e) {
                    console.error("Failed to fetch model info", e);
                }
            }

            if (settings.geminiApiKey) {
                try {
                    setModelLoading(true);
                    const models = await fetchGeminiModels(settings.geminiApiKey);
                    setModelOptions(filterTextModels(models));
                } catch (e) {
                    console.error("Failed to load model list", e);
                } finally {
                    setModelLoading(false);
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
        if (uiMode !== 'simple') return;
        // Keep basic mode opinionated for faster onboarding.
        setArticleLength('Medium');
        setShowPowerControls(false);
        setShowPromptEditor(false);
        setUseOutlineWorkflow(false);
        setShowSourceLinks(false);
        setTargetLanguages((prev) => {
            if (prev.length === 2 && prev.includes('sk') && prev.includes('en')) return prev;
            return ['sk', 'en'];
        });
    }, [uiMode]);

    useEffect(() => {
        if (uiMode === 'power') {
            setShowSourceLinks(true);
        }
    }, [uiMode]);

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
            researchDepth: researchMode === 'deep' ? 'Deep' : 'Quick',
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
            researchDepth: researchMode === 'deep' ? 'Deep' : 'Quick',
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
    const shouldShowLinksEditor = uiMode === 'power' || showSourceLinks;

    const estimateRequestTokens = () => {
        const validLinks = links.filter((l) => l.trim() !== '');
        const promptValue = showPromptEditor ? customPrompt : prompt;
        const promptChars = [
            promptValue,
            toneInstructions,
            articleType,
            articleLength,
            targetLanguages.join(','),
            ...validLinks
        ].join(' ').length;
        const promptTokens = Math.ceil(promptChars / 3.8) + (researchMode === 'deep' ? 1400 : 350);
        const outputTokens = Math.ceil(targetWordCount * 1.8) + (useOutlineWorkflow ? 250 : 0) + Math.max(0, thinkingBudget || 0);
        return {
            promptTokens,
            outputTokens,
            totalTokens: promptTokens + outputTokens
        };
    };

    const estimateRequestCost = () => {
        if (priceInputPerM === null || priceOutputPerM === null) return null;
        const { promptTokens, outputTokens } = estimateRequestTokens();
        const inputCost = (promptTokens / 1_000_000) * priceInputPerM;
        const outputCost = (outputTokens / 1_000_000) * priceOutputPerM;
        return inputCost + outputCost;
    };

    const formatDuration = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        setPreflightCostEstimate(estimateRequestCost());
    }, [
        prompt,
        customPrompt,
        links,
        showPromptEditor,
        toneInstructions,
        articleType,
        articleLength,
        targetLanguages,
        researchMode,
        targetWordCount,
        useOutlineWorkflow,
        thinkingBudget,
        priceInputPerM,
        priceOutputPerM
    ]);

    const budgetExceeded =
        (requestBudgetUsd || 0) > 0 &&
        preflightCostEstimate !== null &&
        preflightCostEstimate > requestBudgetUsd;
    const requestCapActive = (requestBudgetUsd || 0) > 0;
    const tokenQuotaActive = (dailyTokenQuota || 0) > 0 || (monthlyTokenQuota || 0) > 0;
    const usdQuotaActive = (dailyUsdQuota || 0) > 0 || (monthlyUsdQuota || 0) > 0;
    const cooldownActive = (requestCooldownSeconds || 0) > 0;

    const fetchUsageSnapshot = async (userId: string) => {
        const now = Date.now();
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
        const { data, error } = await supabase
            .from('ai_usage_logs')
            .select('total_tokens,input_tokens,output_tokens,created_at')
            .eq('user_id', userId)
            .gte('created_at', monthStart.toISOString());
        if (error) throw error;

        let dayTokens = 0;
        let monthTokens = 0;
        let dayUsd = 0;
        let monthUsd = 0;
        for (const row of data || []) {
            const createdAtMs = row?.created_at ? new Date(row.created_at).getTime() : now;
            const total = Number(row?.total_tokens || 0);
            const input = Number(row?.input_tokens || 0);
            const output = Number(row?.output_tokens || 0);
            monthTokens += total;
            if (priceInputPerM !== null && priceOutputPerM !== null) {
                monthUsd += (input / 1_000_000) * priceInputPerM + (output / 1_000_000) * priceOutputPerM;
            }
            if (createdAtMs >= dayStart.getTime()) {
                dayTokens += total;
                if (priceInputPerM !== null && priceOutputPerM !== null) {
                    dayUsd += (input / 1_000_000) * priceInputPerM + (output / 1_000_000) * priceOutputPerM;
                }
            }
        }
        return { dayTokens, monthTokens, dayUsd, monthUsd };
    };

    const buildResearchFindings = (pack: { summary?: string; key_points?: string[]; facts?: string[]; outline?: string[]; sources?: Array<{ title?: string; url?: string }> }) => {
        const sections: string[] = [];
        if (pack.summary) {
            sections.push(`Summary:\n${pack.summary}`);
        }
        if (pack.key_points && pack.key_points.length > 0) {
            sections.push(`Key Points:\n- ${pack.key_points.join('\n- ')}`);
        }
        if (pack.facts && pack.facts.length > 0) {
            sections.push(`Facts & Figures:\n- ${pack.facts.join('\n- ')}`);
        }
        if (pack.outline && pack.outline.length > 0) {
            sections.push(`Suggested Outline:\n${pack.outline.join('\n')}`);
        }
        if (pack.sources && pack.sources.length > 0) {
            sections.push(`Sources:\n- ${pack.sources.map((s) => s.title ? `${s.title} (${s.url})` : s.url).join('\n- ')}`);
        }
        return sections.join('\n\n');
    };


    const clearGenerationTimers = () => {
        if (generationTimeoutRef.current) {
            window.clearTimeout(generationTimeoutRef.current);
            generationTimeoutRef.current = null;
        }
        if (generationTimerRef.current) {
            window.clearInterval(generationTimerRef.current);
            generationTimerRef.current = null;
        }
        generationStartRef.current = null;
    };

    const cancelGeneration = (message?: string) => {
        if (generationControllerRef.current) {
            setGenerationStatus(message || 'Cancelling request...');
            generationControllerRef.current.abort();
        }
    };

    const logGenerationEvent = async (payload: {
        request_id: string;
        status: 'started' | 'succeeded' | 'failed' | 'aborted';
        duration_ms?: number;
        error_message?: string;
    }) => {
        if (!user) return;
        try {
            const validLinks = links.filter(l => l.trim() !== '');
            const promptValue = showPromptEditor ? customPrompt : prompt;
            await supabase.from('ai_generation_logs').insert({
                user_id: user.id,
                request_id: payload.request_id,
                action: 'generate_article',
                status: payload.status,
                model: currentModel || 'gemini-2.0-flash',
                duration_ms: payload.duration_ms ?? null,
                error_message: payload.error_message ?? null,
                details: {
                    promptLength: promptValue.length,
                    linkCount: validLinks.length,
                    useGrounding: researchMode !== 'none',
                    researchMode,
                    targetWordCount,
                    targetLanguages,
                    articleType,
                    articleLength,
                    toneStyle,
                    toneCustom,
                    outlineEnabled: useOutlineWorkflow,
                    outlineProvided: Boolean(outlineText.trim()),
                    customPrompt: showPromptEditor
                }
            });
        } catch (err) {
            console.error('Failed to log AI generation:', err);
        }
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

        const effectivePreflightCost = preflightCostEstimate ?? estimateRequestCost();
        if ((requestBudgetUsd || 0) > 0 && effectivePreflightCost !== null && effectivePreflightCost > requestBudgetUsd) {
            toast.error(
                `This request is blocked by request cap: estimated $${effectivePreflightCost.toFixed(4)} vs cap $${requestBudgetUsd.toFixed(4)}. Lower depth/length, switch model, or raise cap.`
            );
            return;
        }

        if ((requestCooldownSeconds || 0) > 0 && lastGenerationStartedAt) {
            const elapsedSeconds = Math.floor((Date.now() - lastGenerationStartedAt) / 1000);
            if (elapsedSeconds < requestCooldownSeconds) {
                const waitSeconds = requestCooldownSeconds - elapsedSeconds;
                toast.error(`Cooldown active. Wait ${waitSeconds}s before the next request.`);
                return;
            }
        }

        const estimatedTokens = estimateRequestTokens();
        if (
            (dailyTokenQuota || 0) > 0 ||
            (monthlyTokenQuota || 0) > 0 ||
            (dailyUsdQuota || 0) > 0 ||
            (monthlyUsdQuota || 0) > 0
        ) {
            if ((dailyUsdQuota || 0) > 0 || (monthlyUsdQuota || 0) > 0) {
                if (priceInputPerM === null || priceOutputPerM === null) {
                    toast.error('USD quota is configured, but token pricing is missing. Set pricing in AI Settings first.');
                    return;
                }
            }
            try {
                if (!user?.id) {
                    toast.error('You must be signed in to generate content.');
                    return;
                }
                const usage = await fetchUsageSnapshot(user.id);
                const projectedDayTokens = usage.dayTokens + estimatedTokens.totalTokens;
                const projectedMonthTokens = usage.monthTokens + estimatedTokens.totalTokens;
                const projectedDayUsd = usage.dayUsd + (effectivePreflightCost || 0);
                const projectedMonthUsd = usage.monthUsd + (effectivePreflightCost || 0);

                if ((dailyTokenQuota || 0) > 0 && projectedDayTokens > dailyTokenQuota) {
                    toast.error(`Blocked by daily token quota: projected ${projectedDayTokens.toLocaleString()} / ${dailyTokenQuota.toLocaleString()} tokens.`);
                    return;
                }
                if ((monthlyTokenQuota || 0) > 0 && projectedMonthTokens > monthlyTokenQuota) {
                    toast.error(`Blocked by monthly token quota: projected ${projectedMonthTokens.toLocaleString()} / ${monthlyTokenQuota.toLocaleString()} tokens.`);
                    return;
                }
                if ((dailyUsdQuota || 0) > 0 && projectedDayUsd > dailyUsdQuota) {
                    toast.error(`Blocked by daily USD quota: projected $${projectedDayUsd.toFixed(4)} / $${dailyUsdQuota.toFixed(4)}.`);
                    return;
                }
                if ((monthlyUsdQuota || 0) > 0 && projectedMonthUsd > monthlyUsdQuota) {
                    toast.error(`Blocked by monthly USD quota: projected $${projectedMonthUsd.toFixed(4)} / $${monthlyUsdQuota.toFixed(4)}.`);
                    return;
                }
            } catch (usageError: any) {
                toast.error(`Could not verify quota usage: ${usageError?.message || 'Unknown error'}`);
                return;
            }
        }

        if (articleSettingsDirty) {
            await saveArticleSettings(true);
        }

        setGenerating(true);
        setGenerationTimeMs(null);
        setEstimatedCost(null);
        setGenerationStatus('Starting request...');
        setGenerationElapsedMs(0);
        setLastGenerationStartedAt(Date.now());
        setResearchSources([]);
        setResearchSummary('');
        const requestId = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
            ? globalThis.crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        setLastRequestId(requestId);

        if (generationControllerRef.current) {
            generationControllerRef.current.abort();
        }
        const controller = new AbortController();
        generationControllerRef.current = controller;
        generationStartRef.current = Date.now();
        generationTimerRef.current = window.setInterval(() => {
            if (generationStartRef.current) {
                setGenerationElapsedMs(Date.now() - generationStartRef.current);
            }
        }, 1000);
        generationTimeoutRef.current = window.setTimeout(() => {
            setGenerationStatus('Request timed out. Cancelling...');
            controller.abort();
        }, 600000);

        await logGenerationEvent({ request_id: requestId, status: 'started' });
        const startTime = Date.now();
        try {
            const validLinks = links.filter(l => l.trim() !== '');
            let researchFindings = '';
            let researchSourcesLocal: Array<{ title?: string; url?: string }> = [];
            // Research mode logic:
            // - 'deep': Run pre-pass research, then write WITHOUT tools (uses findings)
            // - 'grounding': No pre-pass, write WITH Google Search tool active
            // - 'none': No research, no tools
            let useGroundingForArticle = researchMode === 'grounding';

            if (researchMode === 'deep') {
                setGenerationStatus('Gathering sources and research...');
                try {
                    const researchPack = await generateAIResearchPack(prompt || customPrompt, validLinks, {
                        type: articleType,
                        length: articleLength,
                        targetWordCount,
                        tone: toneStyle,
                        toneInstructions,
                        modelOverride: currentModel,
                        thinkingBudgetOverride: thinkingBudget,
                        signal: controller.signal
                    });
                    researchFindings = buildResearchFindings(researchPack);
                    researchSourcesLocal = researchPack.sources || [];
                    setResearchSources(researchSourcesLocal);
                    setResearchSummary(researchPack.summary || '');
                    // We already grounded in research phase; avoid double grounding in generation.
                    useGroundingForArticle = false;
                } catch (researchError: any) {
                    console.warn('Research pre-pass failed, continuing without grounding:', researchError);
                    setResearchSources([]);
                    setResearchSummary('');
                    // Keep grounding DISABLED to preserve JSON mode for article generation.
                    // Enabling grounding here would break JSON parsing.
                    useGroundingForArticle = false;
                    toast.warning('Research failed. Generating article without web grounding.');
                }
            }

            if (useOutlineWorkflow && !outlineText && !showPromptEditor) {
                await handleGenerateOutline({
                    researchFindings,
                    useGroundingOverride: false,
                    signal: controller.signal,
                    timeoutMs: researchMode === 'deep' ? 600000 : 120000,
                    modelOverride: currentModel,
                    thinkingBudgetOverride: thinkingBudget
                });
                setGenerating(false);
                clearGenerationTimers();
                return;
            }

            setGenerationStatus('Writing article...');
            const customPromptOverride = showPromptEditor
                ? `${customPrompt}${researchFindings ? `\n\n### RESEARCH BRIEF (PRE-COMPILED)\n${researchFindings}` : ''}`
                : undefined;
            const content = await generateAIArticle(prompt, validLinks, {
                type: articleType,
                length: articleLength,
                useGrounding: useGroundingForArticle,
                customPrompt: customPromptOverride,
                targetLanguages,
                researchDepth: researchMode === 'deep' ? 'Deep' : 'Quick',
                targetWordCount,
                tone: toneStyle,
                toneInstructions,
                modelOverride: currentModel,
                thinkingBudgetOverride: thinkingBudget,
                outline: useOutlineWorkflow && outlineText && !showPromptEditor ? outlineText : undefined,
                researchFindings,
                sources: researchSourcesLocal,
                signal: controller.signal
            });
            setGenerationStatus('Finalizing...');
            setGeneratedContent(content);
            const durationMs = Date.now() - startTime;
            setGenerationTimeMs(durationMs);

            if (content.usage && priceInputPerM !== null && priceOutputPerM !== null) {
                const inputCost = (content.usage.promptTokens / 1_000_000) * priceInputPerM;
                const outputCost = (content.usage.completionTokens / 1_000_000) * priceOutputPerM;
                setEstimatedCost(inputCost + outputCost);
            } else {
                setEstimatedCost(null);
            }

            // Log token usage if available
            if (user && content.usage) {
                try {
                    const articleTitle = content.title_en || content.title_sk || content.title_de || content.title_cn || prompt;
                    const truncatedTitle = articleTitle.length > 80 ? `${articleTitle.slice(0, 80)}…` : articleTitle;

                    await supabase.from('ai_usage_logs').insert({
                        user_id: user.id,
                        action: `Article: ${truncatedTitle}`,
                        model: currentModel || 'gemini-2.0-flash',
                        input_tokens: content.usage.promptTokens,
                        output_tokens: content.usage.completionTokens,
                        total_tokens: content.usage.totalTokens
                    });
                } catch (err) {
                    console.error('Failed to log AI usage:', err);
                }
            }

            toast.success('Article generated successfully!');
            await logGenerationEvent({ request_id: requestId, status: 'succeeded', duration_ms: Date.now() - startTime });
        } catch (error: any) {
            const isAbort = error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted');
            if (isAbort) {
                toast.error('Generation request was cancelled or timed out.');
                await logGenerationEvent({ request_id: requestId, status: 'aborted', duration_ms: Date.now() - startTime, error_message: error?.message });
            } else {
                toast.error(error.message || 'Generation failed');
                await logGenerationEvent({ request_id: requestId, status: 'failed', duration_ms: Date.now() - startTime, error_message: error?.message || 'Unknown error' });
            }
        } finally {
            clearGenerationTimers();
            setGenerating(false);
            setGenerationStatus('');
        }
    };

    const handleGenerateOutline = async (options?: { researchFindings?: string; useGroundingOverride?: boolean; signal?: AbortSignal; timeoutMs?: number; modelOverride?: string; thinkingBudgetOverride?: number | null }) => {
        if (!prompt && !customPrompt) {
            toast.error('Please enter a topic or prompt');
            return;
        }
        if (targetLanguages.length === 0) {
            toast.error('Please select at least one language');
            return;
        }
        setOutlineGenerating(true);
        const outlineController = new AbortController();
        if (options?.signal) {
            if (options.signal.aborted) {
                outlineController.abort();
            } else {
                options.signal.addEventListener('abort', () => outlineController.abort(), { once: true });
            }
        }
        const defaultTimeoutMs = researchMode === 'deep' ? 600000 : 120000;
        const timeoutMs = options?.timeoutMs ?? defaultTimeoutMs;
        const outlineTimeout = window.setTimeout(() => {
            outlineController.abort();
        }, timeoutMs);
        try {
            const validLinks = links.filter(l => l.trim() !== '');
            const primaryLang = targetLanguages[0] || 'en';
            const useGrounding = typeof options?.useGroundingOverride === 'boolean'
                ? options.useGroundingOverride
                : (researchMode === 'deep');
            const outlineResult = await generateAIOutline(prompt, validLinks, {
                type: articleType,
                length: articleLength,
                researchDepth: researchMode === 'deep' ? 'Deep' : 'Quick',
                targetWordCount,
                tone: toneStyle,
                toneInstructions,
                languageLabel: languageLabels[primaryLang] || primaryLang,
                useGrounding,
                researchFindings: options?.researchFindings,
                modelOverride: options?.modelOverride || currentModel,
                thinkingBudgetOverride: options?.thinkingBudgetOverride ?? thinkingBudget,
                signal: outlineController.signal
            });
            setOutlineText(outlineResult.outline.join('\n'));
            setOutlineNotes(outlineResult.notes || '');
            setOutlineSources(outlineResult.sources || []);
            toast.success('Outline generated');
        } catch (error: any) {
            const isAbort = error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted');
            toast.error(isAbort ? 'Outline generation timed out.' : (error.message || 'Outline generation failed'));
        } finally {
            window.clearTimeout(outlineTimeout);
            setOutlineGenerating(false);
        }
    };

    const handleTestConnection = async () => {
        if (testRunning) return;
        setTestRunning(true);
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        try {
            const reply = await testGeminiConnection(controller.signal);
            toast.success(`Connection OK: ${reply}`);
        } catch (error: any) {
            const isAbort = error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted');
            toast.error(isAbort ? 'Connection test timed out.' : (error.message || 'Connection test failed'));
        } finally {
            window.clearTimeout(timeout);
            setTestRunning(false);
        }
    };

    useEffect(() => {
        return () => {
            clearGenerationTimers();
            if (generationControllerRef.current) {
                generationControllerRef.current.abort();
            }
        };
    }, []);

    const handleSave = async () => {
        if (!generatedContent || !user) return;

        const modelForLog = currentModel || 'gemini-2.0-flash';
        const logSaveEvent = async (status: string, payload?: Record<string, any>) => {
            try {
                await supabase.from('ai_generation_logs').insert({
                    action: 'ai_lab_save_draft',
                    status,
                    model: modelForLog,
                    user_id: user.id,
                    details: payload || null,
                });
            } catch {
                // Ignore logging failures
            }
        };

        try {
            setIsSavingDraft(true);
            const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number, label: string) => {
                const wrapped = Promise.resolve(promise);
                return await new Promise<T>((resolve, reject) => {
                    const timer = window.setTimeout(() => {
                        reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
                    }, ms);
                    wrapped
                        .then((value) => {
                            window.clearTimeout(timer);
                            resolve(value);
                        })
                        .catch((err) => {
                            window.clearTimeout(timer);
                            reject(err);
                        });
                });
            };

            // 1. Generate slug from the first available title
            const titleForSlug = generatedContent.title_sk || generatedContent.title_en || generatedContent.title_de || generatedContent.title_cn || 'untitled-article';
            const slug = titleForSlug
                .toLowerCase()
                .normalize('NFD') // Separate accents
                .replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
                .replace(/(^-|-$)/g, '') // Remove leading/trailing hyphens
                + '-' + Date.now().toString().slice(-4); // Add unique suffix to prevent collisions
            const tagCount = Array.isArray(generatedContent.tags) ? generatedContent.tags.length : 0;

            void logSaveEvent('start', { slug, tagsCount: tagCount });

            // 2. Insert article
            let articleId: string | null = null;
            try {
                const insertPromise = supabase
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
                        tags: generatedContent.tags || [],
                        author_id: user.id,
                        is_published: false,
                    })
                    .select('id')
                    .single();

                const { data: article, error: articleError } = await withTimeout(insertPromise, 20000, 'Saving draft');
                if (articleError) throw articleError;
                articleId = article?.id || null;
            } catch (err: any) {
                const isTimeout = String(err?.message || '').toLowerCase().includes('timed out');
                if (isTimeout) {
                    // If the insert succeeded but the response was delayed, try to recover by slug
                    const recoveryPromise = supabase
                        .from('articles')
                        .select('id')
                        .eq('slug', slug)
                        .maybeSingle();
                    const { data: existing } = await withTimeout(recoveryPromise, 8000, 'Recovery check');
                    if (existing?.id) {
                        articleId = existing.id;
                    } else {
                        throw err;
                    }
                } else {
                    throw err;
                }
            }

            if (!articleId) {
                throw new Error('Failed to create article draft.');
            }

            // 3. Handle Tags
            const tagList = Array.isArray(generatedContent.tags) ? generatedContent.tags : [];
            if (tagList.length > 0) {
                const linkTags = async () => {
                    for (const tagName of tagList) {
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
                                article_id: articleId,
                                tag_id: tag.id
                            });
                        }
                    }
                };

                // Don't block navigation on tag linking
                void linkTags();
            }

            toast.success('Article saved as draft!');
            void logSaveEvent('success', { articleId });
            const targetTab = redirectTab || 'articles';
            const targetUrl = `/admin?workspace=publishing&tab=${targetTab}&edit=${articleId}`;
            onDraftSaved?.(articleId);
            router.push(targetUrl);
            setTimeout(() => {
                if (window.location.pathname !== '/admin' || !window.location.search.includes('edit=')) {
                    window.location.assign(targetUrl);
                }
            }, 600);
        } catch (error: any) {
            void logSaveEvent('error', { error_message: error?.message || String(error) });
            toast.error(error?.message || 'Failed to save article');
        } finally {
            setIsSavingDraft(false);
        }
    };

    return (
        <div className="space-y-6">
            <AdminPanelHeader
                title="AI Article Generator"
                description="Set topic and research inputs, generate draft, then hand off to editor."
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Pane */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AiMagicIcon size={24} className="text-primary" />
                            <CardTitle>Generation Inputs</CardTitle>
                        </div>
                        <CardDescription>
                            Define topic, language, depth, and controls before generation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg border border-primary/10 bg-muted/20 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-medium">Control Mode</div>
                                    <p className="text-xs text-muted-foreground">
                                        Basic mode shows only core controls. Power mode unlocks full tuning.
                                    </p>
                                </div>
                                <div className="inline-flex rounded-md border bg-white p-1">
                                    <Button
                                        size="sm"
                                        variant={uiMode === 'simple' ? 'default' : 'ghost'}
                                        className="h-7 px-3 text-xs"
                                        onClick={() => setUiMode('simple')}
                                    >
                                        Basic
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={uiMode === 'power' ? 'default' : 'ghost'}
                                        className="h-7 px-3 text-xs"
                                        onClick={() => setUiMode('power')}
                                    >
                                        Power
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {uiMode === 'power' && (
                            <div className="space-y-2">
                                <Label>Target Languages</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['sk', 'en', 'de', 'cn'].map((lang) => (
                                        <button
                                            key={lang}
                                            type="button"
                                            aria-pressed={targetLanguages.includes(lang)}
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
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={`grid grid-cols-1 ${uiMode === 'power' ? 'md:grid-cols-2' : ''} gap-4`}>
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
                            {uiMode === 'power' && (
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
                            )}
                        </div>

                        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-primary/10">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <GlobalSearchIcon size={16} className="text-primary" />
                                Research Mode
                            </Label>
                            <Select value={researchMode} onValueChange={(value) => setResearchMode(value as 'none' | 'deep' | 'grounding')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select research mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (Fast, no external search)</SelectItem>
                                    <SelectItem value="deep">Deep Research (Pre-compile sources)</SelectItem>
                                    <SelectItem value="grounding">Live Grounding (Inline Google Search)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {researchMode === 'deep'
                                    ? 'Deep Research: Gathers sources first, then writes the article using compiled findings. Best for factual accuracy.'
                                    : researchMode === 'grounding'
                                        ? 'Live Grounding: Uses Google Search inline during writing. May affect JSON stability with some models.'
                                        : 'None: Uses only your prompt and provided links. Fastest generation.'}
                            </p>
                        </div>

                        {uiMode === 'power' ? (
                            <Accordion type="single" collapsible className="w-full rounded-lg border border-primary/10 px-3 bg-muted/20">
                                <AccordionItem value="advanced" className="border-b-0">
                                    <AccordionTrigger className="py-3 text-sm font-medium no-underline hover:no-underline">
                                        Advanced Controls (Model, Tone, Outline, Prompt)
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pb-3">
                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-primary/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium flex items-center gap-2">
                                                    <AiMagicIcon size={16} className="text-primary" />
                                                    Power Controls
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Enable model override, thinking budget, custom prompt, and connection testing.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={showPowerControls}
                                                onCheckedChange={(value) => {
                                                    setShowPowerControls(value);
                                                    if (!value) setShowPromptEditor(false);
                                                }}
                                            />
                                        </div>

                                        {showPowerControls && (
                                            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-primary/10">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Label className="text-sm font-medium flex items-center gap-2">
                                                        <AiMagicIcon size={16} className="text-primary" />
                                                        Article Model & Thinking Budget
                                                    </Label>
                                                    {articleSettingsDirty && (
                                                        <Badge variant="outline">Unsaved</Badge>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-muted-foreground">Article Model</Label>
                                                        {modelOptions.length > 0 ? (
                                                            <Select value={currentModel} onValueChange={setCurrentModel}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select model" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {modelOptions.map((model) => (
                                                                        <SelectItem key={model.name} value={model.name}>
                                                                            {model.displayName || model.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input
                                                                value={currentModel}
                                                                onChange={(e) => setCurrentModel(e.target.value)}
                                                                placeholder="gemini-2.5-pro"
                                                            />
                                                        )}
                                                        <p className="text-[10px] text-muted-foreground">
                                                            Article-only override. Main AI settings remain global.
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-muted-foreground">Thinking Budget</Label>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={4096}
                                                            value={thinkingBudget}
                                                            onChange={(e) => setThinkingBudget(Math.max(0, parseInt(e.target.value) || 0))}
                                                        />
                                                        <p className="text-[10px] text-muted-foreground">
                                                            Set `0` to disable.
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-muted-foreground">Per-request Budget (USD)</Label>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            step="0.0001"
                                                            value={requestBudgetUsd}
                                                            onChange={(e) => setRequestBudgetUsd(Math.max(0, parseFloat(e.target.value) || 0))}
                                                        />
                                                        <p className="text-[10px] text-muted-foreground">
                                                            Set `0` for no cap. Blocks generation when estimate exceeds this value.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Model list {modelLoading ? 'loading…' : 'ready'}.
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-3 text-xs"
                                                            onClick={handleTestConnection}
                                                            disabled={testRunning || generating}
                                                        >
                                                            {testRunning ? 'Testing…' : 'Test Connection'}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => saveArticleSettings()}
                                                            disabled={articleSettingsSaving}
                                                        >
                                                            {articleSettingsSaving ? 'Saving…' : 'Save Article Settings'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-primary/10">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="targetWordCount" className={articleType === 'Deep Dive' ? 'text-muted-foreground' : ''}>Target Word Count</Label>
                                                    <Input
                                                        id="targetWordCount"
                                                        type={articleType === 'Deep Dive' ? "text" : "number"}
                                                        min={300}
                                                        max={3000}
                                                        name="targetWordCount"
                                                        autoComplete="off"
                                                        value={articleType === 'Deep Dive' ? "Unlimited" : targetWordCount}
                                                        disabled={articleType === 'Deep Dive'}
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
                                                    disabled={articleType === 'Deep Dive'}
                                                />
                                                <p className="text-[10px] text-muted-foreground">
                                                    {articleType === 'Deep Dive'
                                                        ? 'Deep Dive articles use the maximum available token limit.'
                                                        : 'Word count target is enforced in the prompt (+/-10%).'}
                                                </p>
                                            </div>

                                            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-primary/10">
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
                                                        <Label htmlFor="toneInstructions" className="text-xs text-muted-foreground">Tone Instructions (customizable)</Label>
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
                                                        id="toneInstructions"
                                                        name="toneInstructions"
                                                        autoComplete="off"
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
                                        </div>

                                        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-primary/10">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="text-sm font-medium flex items-center gap-2">
                                                        <PlusSignIcon size={16} className="text-primary" />
                                                        Outline-First Workflow
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        Generate a structured outline, review/edit it, then create the full article. Deep research can take several minutes.
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
                                                            onClick={() => handleGenerateOutline()}
                                                            disabled={outlineGenerating}
                                                        >
                                                            {outlineGenerating ? 'Generating…' : 'Generate Outline'}
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
                                                    {researchSummary && (
                                                        <div className="text-xs text-muted-foreground">
                                                            <strong>Research Summary:</strong> {researchSummary}
                                                        </div>
                                                    )}
                                                    {researchSources.length > 0 && (
                                                        <div className="text-xs text-muted-foreground">
                                                            <strong>Research Sources (last run):</strong>
                                                            <ul className="list-disc list-inside">
                                                                {researchSources.map((source, idx) => (
                                                                    <li key={`research-${source.url}-${idx}`}>
                                                                        {source.title || source.url}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {showPowerControls && (
                                            <>
                                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-primary/10">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-sm font-medium flex items-center gap-2">
                                                            <PlusSignIcon size={16} className="text-primary" rotate={showPromptEditor ? 45 : 0} />
                                                            Customize System Prompt
                                                        </Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            Edit the exact instructions sent to AI.
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
                                                            placeholder="Click 'Customize System Prompt' to generate the default prompt based on your settings…"
                                                        />
                                                        <p className="text-[10px] text-orange-500 font-medium">
                                                            Caution: manual JSON changes can break generation.
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        ) : (
                            <div className="rounded-lg border border-dashed border-primary/20 bg-muted/10 p-3 text-xs text-muted-foreground">
                                Need model/tone/prompt control, outline workflow, or custom thinking budget? Switch to <strong>Power</strong> mode.
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

                        {!showPromptEditor && uiMode === 'simple' && (
                            <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-muted/20 p-3">
                                <div>
                                    <p className="text-sm font-medium">Attach Source Links</p>
                                    <p className="text-xs text-muted-foreground">Optional. Add URLs to steer the article context.</p>
                                </div>
                                <Switch
                                    checked={showSourceLinks}
                                    onCheckedChange={setShowSourceLinks}
                                />
                            </div>
                        )}

                        {!showPromptEditor && shouldShowLinksEditor && (
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
                                                placeholder="https://…"
                                                value={link}
                                                onChange={(e) => updateLink(index, e.target.value)}
                                                name={`research_link_${index}`}
                                                autoComplete="off"
                                                aria-label={`Research link ${index + 1}`}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeLink(index)}
                                                disabled={links.length === 1}
                                                aria-label="Remove link"
                                            >
                                                <Cancel01Icon size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        {(requestCapActive || tokenQuotaActive || usdQuotaActive || cooldownActive) && (
                            <div className="w-full rounded-lg border border-primary/20 bg-muted/20 px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
                                    <span className={`rounded-full px-2 py-0.5 ${requestCapActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>Request cap {requestCapActive ? 'on' : 'off'}</span>
                                    <span className={`rounded-full px-2 py-0.5 ${tokenQuotaActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>Token quota {tokenQuotaActive ? 'on' : 'off'}</span>
                                    <span className={`rounded-full px-2 py-0.5 ${usdQuotaActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>USD quota {usdQuotaActive ? 'on' : 'off'}</span>
                                    <span className={`rounded-full px-2 py-0.5 ${cooldownActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>Cooldown {cooldownActive ? 'on' : 'off'}</span>
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    Guardrails apply before dispatch. When blocked, tune generation inputs or update policy values in AI Settings.
                                </p>
                            </div>
                        )}
                        <div className="flex w-full gap-2">
                            <Button
                                onClick={handleGenerate}
                                disabled={generating || budgetExceeded}
                                className="flex-1 bg-primary hover:bg-primary/90"
                            >
                                {generating ? (
                                    <>Generating…</>
                                ) : (
                                    <>
                                        <Search01Icon size={18} className="mr-2" />
                                        {useOutlineWorkflow && !outlineText && !showPromptEditor ? 'Generate Outline' : 'Research & Generate Article'}
                                    </>
                                )}
                            </Button>
                            {generating && (
                                <Button
                                    variant="outline"
                                    onClick={() => cancelGeneration('Cancelling request...')}
                                    className="shrink-0"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                            <div className="flex flex-col">
                                <span>
                                    {generationStatus
                                        ? `${generationStatus}${generationElapsedMs ? ` • ${formatDuration(generationElapsedMs)}` : ''}`
                                        : (budgetExceeded ? 'Blocked by budget cap' : 'Ready')}
                                </span>
                                {lastRequestId && generating && (
                                    <span className="text-[10px]">Request ID: {lastRequestId}</span>
                                )}
                            </div>
                            {showPowerControls ? (
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Power mode enabled</span>
                            ) : (
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Essentials mode</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between w-full text-[11px] text-muted-foreground">
                            <span>
                                Preflight estimate: {preflightCostEstimate !== null ? `$${preflightCostEstimate.toFixed(4)}` : 'Set token pricing in AI Settings'}
                            </span>
                            <span>
                                Request cap: {(requestBudgetUsd || 0) > 0 ? `$${requestBudgetUsd.toFixed(4)}` : 'Off'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between w-full text-[11px] text-muted-foreground">
                            <span>
                                Quotas: {(tokenQuotaActive || usdQuotaActive) ? 'On' : 'Off'}
                            </span>
                            <span>
                                Cooldown: {cooldownActive ? `${requestCooldownSeconds}s` : 'Off'}
                            </span>
                        </div>
                        {budgetExceeded && (
                            <div className="w-full rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                                Estimated request cost exceeds cap. Reduce depth/length, switch model, or raise per-request budget.
                            </div>
                        )}
                    </CardFooter>
                </Card>

                {/* Preview Pane */}
                <Card className="flex flex-col min-h-[600px]">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ViewIcon size={24} className="text-muted-foreground" />
                                <CardTitle>Article Preview</CardTitle>
                            </div>
                            {generatedContent && (
                                <div className="flex items-center gap-2">
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
                                                variant={activeTab === 'cn' ? 'secondary' : 'ghost'}
                                                size="sm"
                                                className="h-7 px-3 text-xs"
                                                onClick={() => setActiveTab('cn')}
                                            >
                                                CN
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-3 text-xs gap-2"
                                        onClick={handleGenerate}
                                        disabled={generating}
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                                        Regenerate
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 pb-6">
                        {generatedContent ? (
                            <div className="h-[calc(100vh-260px)] overflow-y-auto pr-4 pb-16">
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
                                        className="prose prose-base max-w-none
                                        prose-headings:font-bold prose-headings:text-[#210059] prose-headings:tracking-tight
                                        prose-h2:mt-8 prose-h2:mb-3 prose-h3:mt-6 prose-h3:mb-2
                                        prose-p:mt-3 prose-p:leading-relaxed prose-p:text-gray-600
                                        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                                        prose-strong:text-[#210059] prose-strong:font-semibold
                                        prose-em:text-gray-700
                                        prose-li:mt-2 prose-li:text-gray-600
                                        prose-ul:mt-4 prose-ol:mt-4
                                        prose-blockquote:border-l-4 prose-blockquote:border-[#210059]/30
                                        prose-blockquote:bg-[#f7f3ff] prose-blockquote:rounded-md
                                        prose-blockquote:px-4 prose-blockquote:py-3 prose-blockquote:not-italic
                                        prose-sup:text-[0.7em] prose-sup:text-muted-foreground
                                        [&_.ghost-anchor-link]:text-primary [&_.ghost-anchor-link]:opacity-0
                                        [&_h2.group:hover_.ghost-anchor-link]:opacity-100
                                        [&_h3.group:hover_.ghost-anchor-link]:opacity-100"
                                        dangerouslySetInnerHTML={{
                                            __html: formatArticleHtml((generatedContent as any)[`content_${activeTab}`] || '<p>No content generated for this language.</p>')
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
                                        {(generatedContent.tags || []).map(tag => (
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
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                <div className="bg-background rounded p-2 border flex items-center justify-between">
                                                    <span className="text-muted-foreground">Generation time</span>
                                                    <span className="font-mono">{generationTimeMs ? `${(generationTimeMs / 1000).toFixed(1)}s` : '—'}</span>
                                                </div>
                                                <div className="bg-background rounded p-2 border flex items-center justify-between">
                                                    <span className="text-muted-foreground">Estimated cost</span>
                                                    <span className="font-mono">
                                                        {estimatedCost !== null ? `$${estimatedCost.toFixed(4)}` : 'Set pricing in AI Settings'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
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
                            <Button onClick={handleSave} className="w-full" disabled={isSavingDraft}>
                                <FloppyDiskIcon size={18} className="mr-2" />
                                {isSavingDraft ? 'Saving draft...' : 'Save as Draft and Edit'}
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>

        </div >
    );
};

export default AILab;
