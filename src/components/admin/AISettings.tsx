import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
    FloppyDiskIcon,
    Key01Icon,
    Tick01Icon,
    Cancel01Icon,
    Loading01Icon,
    Image01Icon,
    Coins01Icon,
    MagicWand01Icon,
    SparklesIcon,
    ZapIcon,
    CheckmarkBadge01Icon
} from 'hugeicons-react';
import { Badge } from '@/components/ui/badge';
import AIUsageStats from './AIUsageStats';
import { AdminPanelHeader } from '@/components/admin/AdminPrimitives';

interface GeminiModel {
    name: string;
    displayName: string;
    description: string;
    supportedGenerationMethods: string[];
}

const AISettings = () => {
    const [settings, setSettings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
    const [imageKeyValid, setImageKeyValid] = useState<boolean | null>(null);
    const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
    const [availableImageModels, setAvailableImageModels] = useState<GeminiModel[]>([]);
    const [useCustomImageModel, setUseCustomImageModel] = useState(false);
    const [customImageModel, setCustomImageModel] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .order('key');

            if (error) throw error;
            setSettings(data || []);
            const storedImageModel = data?.find(s => s.key === 'gemini_image_model')?.value;
            if (storedImageModel) {
                setCustomImageModel(storedImageModel);
            }

            // If we have an API key, try to verify it
            const apiKey = data?.find(s => s.key === 'gemini_api_key')?.value;
            const imageApiKey = data?.find(s => s.key === 'gemini_image_api_key')?.value;
            if (apiKey || imageApiKey) {
                verifyApiKeys(apiKey, imageApiKey, false);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    const verifyApiKeys = async (textApiKey: string | undefined, imageApiKey: string | undefined, showToast = true) => {
        const resolvedTextKey = textApiKey?.trim();
        const resolvedImageKey = (imageApiKey?.trim() || resolvedTextKey);

        if (!resolvedTextKey && !resolvedImageKey) {
            setApiKeyValid(false);
            setImageKeyValid(false);
            setAvailableModels([]);
            setAvailableImageModels([]);
            if (showToast) toast.error('Please enter a valid API key');
            return;
        }

        const fetchModels = async (key: string) => {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
            );
            if (!response.ok) {
                throw new Error('Invalid API key or API error');
            }
            const data = await response.json();
            return data.models || [];
        };

        setVerifying(true);
        let contentModels: GeminiModel[] = [];
        let imageModels: GeminiModel[] = [];

        try {
            if (resolvedTextKey) {
                try {
                    const textModelsRaw = await fetchModels(resolvedTextKey);
                    contentModels = (textModelsRaw || [])
                        .filter((m: any) =>
                            m.supportedGenerationMethods?.includes('generateContent') &&
                            m.name.includes('gemini')
                        )
                        .map((m: any) => ({
                            name: m.name.replace('models/', ''),
                            displayName: m.displayName || m.name.replace('models/', ''),
                            description: m.description || '',
                            supportedGenerationMethods: m.supportedGenerationMethods || []
                        }));
                    setApiKeyValid(true);
                } catch {
                    setApiKeyValid(false);
                }
            } else {
                setApiKeyValid(null);
            }

            if (resolvedImageKey) {
                try {
                    const imageModelsRaw = await fetchModels(resolvedImageKey);
                    imageModels = (imageModelsRaw || [])
                        .filter((m: any) =>
                            m.supportedGenerationMethods?.includes('imageGeneration') ||
                            m.supportedGenerationMethods?.includes('predict') ||
                            m.supportedGenerationMethods?.includes('generateContent') ||
                            m.name.includes('imagen') ||
                            m.name.includes('image')
                        )
                        .map((m: any) => ({
                            name: m.name.replace('models/', ''),
                            displayName: m.displayName || m.name.replace('models/', ''),
                            description: m.description || '',
                            supportedGenerationMethods: m.supportedGenerationMethods || []
                        }));
                    setImageKeyValid(true);
                } catch {
                    setImageKeyValid(false);
                }
            } else {
                setImageKeyValid(null);
            }

            setAvailableModels(contentModels);
            setAvailableImageModels(imageModels);

            const currentImageModel = settings.find((s) => s.key === 'gemini_image_model')?.value;
            if (currentImageModel && imageModels.length > 0) {
                const match = imageModels.some((model) => model.name === currentImageModel);
                setUseCustomImageModel(!match);
                if (!match) setCustomImageModel(currentImageModel);
            }

            if (showToast) {
                const textCount = contentModels.length;
                const imageCount = imageModels.length;
                toast.success(`Models loaded. Text: ${textCount}, Image: ${imageCount}.`);
            }
        } catch (error: any) {
            setAvailableModels([]);
            setAvailableImageModels([]);
            if (showToast) {
                toast.error('Failed to load models. Please check your API keys.');
            }
        } finally {
            setVerifying(false);
        }
    };

    const handleUpdate = (key: string, value: string) => {
        setSettings(prev => {
            const exists = prev.some(s => s.key === key);
            if (exists) {
                return prev.map(s => s.key === key ? { ...s, value } : s);
            } else {
                return [...prev, { key, value, description: '' }];
            }
        });

        if (key === 'gemini_api_key') {
            setApiKeyValid(null);
            setAvailableModels([]);
        }
        if (key === 'gemini_image_api_key') {
            setImageKeyValid(null);
            setAvailableImageModels([]);
        }
    };

    const handleVerifyClick = () => {
        const apiKey = settings.find(s => s.key === 'gemini_api_key')?.value;
        const imageApiKey = settings.find(s => s.key === 'gemini_image_api_key')?.value;
        verifyApiKeys(apiKey, imageApiKey, true);
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            for (const setting of settings) {
                const { error } = await supabase
                    .from('settings')
                    .upsert({
                        key: setting.key,
                        value: setting.value,
                        description: setting.description
                    });
                if (error) throw error;
            }
            toast.success('AI settings saved successfully');
            fetchSettings();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const initializeDefaultSettings = () => {
        const defaults = [
            { key: 'gemini_api_key', value: '', description: 'API Key for Google Gemini (Vertex AI / Generative AI)' },
            { key: 'gemini_image_api_key', value: '', description: 'Optional: API Key for Gemini Image generation' },
            { key: 'gemini_model', value: '', description: 'Selected Gemini model for text generation' },
            { key: 'gemini_image_model', value: 'imagen-3.0-generate-001', description: 'Selected Gemini model for image generation' },
            { key: 'image_model', value: 'pro', description: 'Selected model for image generation (turbo or pro)' },
            { key: 'gemini_price_input_per_million', value: '', description: 'Optional: price per 1M input tokens (USD)' },
            { key: 'gemini_price_output_per_million', value: '', description: 'Optional: price per 1M output tokens (USD)' }
        ];
        setSettings(defaults);
    };

    if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading settings...</div>;

    const geminiApiKey = settings.find(s => s.key === 'gemini_api_key')?.value || '';
    const geminiImageApiKey = settings.find(s => s.key === 'gemini_image_api_key')?.value || '';
    const selectedModel = settings.find(s => s.key === 'gemini_model')?.value || '';
    const currentImageModel = settings.find(s => s.key === 'image_model')?.value || 'turbo';
    const priceInput = settings.find(s => s.key === 'gemini_price_input_per_million')?.value || '';
    const priceOutput = settings.find(s => s.key === 'gemini_price_output_per_million')?.value || '';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 1. Usage Statistics */}
            <AIUsageStats />

            {/* 2. Header */}
            <AdminPanelHeader
                title="AI Configuration"
                description="Manage global credentials, models, and generation preferences. Article Studio has separate article model controls."
                actions={(
                    <Button onClick={saveSettings} disabled={saving} size="lg" className="shadow-sm">
                        {saving ? <Loading01Icon className="mr-2 animate-spin" /> : <FloppyDiskIcon className="mr-2" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                )}
            />

            {/* 3. Main Setting Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                {/* A. Core API Config */}
                <Card className="xl:col-span-7 shadow-sm border-border/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Key01Icon size={18} className="text-primary" /> Core Credentials
                        </CardTitle>
                        <CardDescription>Configure your Google Gemini API access.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold">Gemini API Key</Label>
                                {apiKeyValid !== null && (
                                    <Badge variant={apiKeyValid ? "outline" : "destructive"} className={`text-[10px] ${apiKeyValid ? 'border-green-200 text-green-700 bg-green-50' : ''}`}>
                                        {apiKeyValid ? <><Tick01Icon size={12} className="mr-1" /> Verified</> : "Invalid"}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    value={geminiApiKey}
                                    onChange={(e) => handleUpdate('gemini_api_key', e.target.value)}
                                    placeholder="Enter API key..."
                                    className="font-mono text-sm"
                                />
                                <Button variant="secondary" onClick={handleVerifyClick} disabled={verifying || !geminiApiKey}>
                                    {verifying ? <Loading01Icon className="animate-spin" /> : 'Verify'}
                                </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Required for Text Generation & 'High Quality' Images. Get key from <a href="https://aistudio.google.com/apikey" target="_blank" className="underline hover:text-primary">Google AI Studio</a>.
                            </p>
                        </div>

                        {availableModels.length > 0 && (
                            <div className="space-y-2 pt-2">
                                <Label className="font-semibold">Text Model</Label>
                                <Select value={selectedModel} onValueChange={(v) => handleUpdate('gemini_model', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select model..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableModels.map((m) => (
                                            <SelectItem key={m.name} value={m.name}>
                                                <div className="flex flex-col text-left">
                                                    <span className="font-medium">{m.displayName}</span>
                                                    <span className="text-[10px] text-muted-foreground line-clamp-1">{m.description}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* B. Cost & Pricing */}
                <Card className="xl:col-span-5 shadow-sm border-border/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Coins01Icon size={18} className="text-primary" /> Cost Settings
                        </CardTitle>
                        <CardDescription>Set rates for cost estimation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Input ($/1M)</Label>
                                <Input
                                    type="number" step="0.01"
                                    value={priceInput}
                                    onChange={(e) => handleUpdate('gemini_price_input_per_million', e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Output ($/1M)</Label>
                                <Input
                                    type="number" step="0.01"
                                    value={priceOutput}
                                    onChange={(e) => handleUpdate('gemini_price_output_per_million', e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            Rates are used to calculate the estimated cost shown in analytics and usage reports.
                        </p>
                    </CardContent>
                </Card>

                {/* C. Image Generation Mode */}
                <Card className="xl:col-span-6 shadow-sm border-border/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Image01Icon size={18} className="text-primary" /> Image Studio Mode
                        </CardTitle>
                        <CardDescription>Choose default quality profile for article cover generation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <MagicWand01Icon size={14} /> Default Quality Mode
                        </Label>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left group ${currentImageModel === 'turbo' ? 'border-primary bg-primary/5 shadow-inner' : 'border-border hover:border-primary/50'}`}
                                onClick={() => handleUpdate('image_model', 'turbo')}
                            >
                                <div className={`p-2 rounded-lg ${currentImageModel === 'turbo' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                    <ZapIcon size={20} className={currentImageModel === 'turbo' ? "fill-current" : ""} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm">Standard (Fast)</span>
                                        <Badge variant="outline" className="text-[9px] h-5 bg-background">FLUX</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Uses Flux Schnell via Pollinations.ai. Free and extremely fast. Best for abstract or simple covers.
                                    </p>
                                </div>
                            </button>

                            <button
                                className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left group ${currentImageModel === 'pro' ? 'border-primary bg-primary/5 shadow-inner' : 'border-border hover:border-primary/50'}`}
                                onClick={() => handleUpdate('image_model', 'pro')}
                            >
                                <div className={`p-2 rounded-lg ${currentImageModel === 'pro' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                    <SparklesIcon size={20} className={currentImageModel === 'pro' ? "fill-current" : ""} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm">High Quality</span>
                                        <Badge variant="secondary" className="text-[9px] h-5 bg-indigo-100 text-indigo-700">IMAGEN 3</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Uses Google Imagen/Gemini. Requires API Key. Best for <strong className="text-foreground">Slovak Text</strong>, photorealism, and complex scenes.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* D. Image Generation Advanced */}
                <Card className="xl:col-span-6 shadow-sm border-border/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <SparklesIcon size={18} className="text-primary" /> Image Advanced Configuration
                        </CardTitle>
                        <CardDescription>Optional key split and direct model override for quality mode.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Separate Image API Key (Optional)</Label>
                                {imageKeyValid !== null && (
                                    <span className={`text-[10px] flex items-center gap-1 ${imageKeyValid ? 'text-green-600' : 'text-destructive'}`}>
                                        {imageKeyValid ? <CheckmarkBadge01Icon size={12} /> : <Cancel01Icon size={12} />}
                                    </span>
                                )}
                            </div>
                            <Input
                                type="password"
                                value={geminiImageApiKey}
                                onChange={(e) => handleUpdate('gemini_image_api_key', e.target.value)}
                                placeholder="Use different key for images..."
                                className="h-8 text-xs font-mono"
                            />
                        </div>

                        <div className="space-y-2 pt-1">
                            <Label className="text-xs">Model Override</Label>
                            {availableImageModels.length > 0 ? (
                                <Select
                                    value={useCustomImageModel ? '' : (settings.find(s => s.key === 'gemini_image_model')?.value || '')}
                                    onValueChange={(v) => {
                                        setUseCustomImageModel(false);
                                        handleUpdate('gemini_image_model', v);
                                    }}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Default (Imagen 3)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableImageModels.map((m) => (
                                            <SelectItem key={m.name} value={m.name} className="text-xs max-w-[300px]">
                                                {m.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={customImageModel}
                                    onChange={(e) => {
                                        setCustomImageModel(e.target.value);
                                        handleUpdate('gemini_image_model', e.target.value);
                                    }}
                                    placeholder="e.g. imagen-3.0-generate-001"
                                    className="h-8 text-xs font-mono"
                                />
                            )}
                            <p className="text-[10px] text-muted-foreground">Specific model ID for High Quality mode.</p>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {settings.length === 0 && (
                <div className="text-center py-8">
                    <Button variant="outline" onClick={initializeDefaultSettings}>
                        Initialize Default Keys
                    </Button>
                </div>
            )}
        </div>
    );
};

export default AISettings;
