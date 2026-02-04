import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FloppyDiskIcon, Key01Icon, Tick01Icon, Cancel01Icon, Loading01Icon } from 'hugeicons-react';
import AIUsageStats from './AIUsageStats';

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
                // Add new setting if it doesn't exist
                return [...prev, { key, value, description: '' }];
            }
        });

        // If API key changes, reset verification
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
            toast.success('AI settings updated successfully');
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

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;

    const geminiApiKey = settings.find(s => s.key === 'gemini_api_key')?.value || '';
    const geminiImageApiKey = settings.find(s => s.key === 'gemini_image_api_key')?.value || '';
    const selectedModel = settings.find(s => s.key === 'gemini_model')?.value || '';
    const currentImageModel = settings.find(s => s.key === 'image_model')?.value || 'turbo';
    const priceInput = settings.find(s => s.key === 'gemini_price_input_per_million')?.value || '';
    const priceOutput = settings.find(s => s.key === 'gemini_price_output_per_million')?.value || '';
    return (
        <div className="space-y-8">
            <AIUsageStats />

            <Card className="w-full">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <FloppyDiskIcon size={24} className="text-primary" />
                        <CardTitle>AI Configuration</CardTitle>
                    </div>
                    <CardDescription>
                        Manage your AI provider credentials and settings. These keys are used for article and image generation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-6">
                        {/* Gemini API Key Section */}
                        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2 text-base font-semibold">
                                    <Key01Icon size={18} className="text-primary" />
                                    Google Gemini API Key (Text + Default)
                                </Label>
                                {apiKeyValid !== null && (
                                    <span className={`flex items-center gap-1 text-xs ${apiKeyValid ? 'text-green-600' : 'text-destructive'}`}>
                                        {apiKeyValid ? <Tick01Icon size={14} /> : <Cancel01Icon size={14} />}
                                        {apiKeyValid ? 'Verified' : 'Invalid'}
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    value={geminiApiKey}
                                    onChange={(e) => handleUpdate('gemini_api_key', e.target.value)}
                                    placeholder="Enter your Gemini API key..."
                                    className="flex-1"
                                />
                                <Button
                                    variant="secondary"
                                    onClick={handleVerifyClick}
                                    disabled={verifying || !geminiApiKey}
                                >
                                    {verifying ? (
                                        <>
                                            <Loading01Icon size={14} className="mr-1 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        'Verify & Load Models'
                                    )}
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Get your API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>
                            </p>

                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-sm font-semibold">
                                        <Key01Icon size={16} className="text-primary" />
                                        Gemini Image API Key (Optional)
                                    </Label>
                                    {imageKeyValid !== null && (
                                        <span className={`flex items-center gap-1 text-xs ${imageKeyValid ? 'text-green-600' : 'text-destructive'}`}>
                                            {imageKeyValid ? <Tick01Icon size={12} /> : <Cancel01Icon size={12} />}
                                            {imageKeyValid ? 'Verified' : 'Invalid'}
                                        </span>
                                    )}
                                </div>
                                <Input
                                    type="password"
                                    value={geminiImageApiKey}
                                    onChange={(e) => handleUpdate('gemini_image_api_key', e.target.value)}
                                    placeholder="Optional separate API key for image generation..."
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    If set, image models list + image generation will use this key. Otherwise the main key is used.
                                </p>
                            </div>

                            {/* Model Selection */}
                            {availableModels.length > 0 && (
                                <div className="space-y-2 pt-3 border-t">
                                    <Label className="text-sm">Select Model</Label>
                                    <Select
                                        value={selectedModel}
                                        onValueChange={(v) => handleUpdate('gemini_model', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a Gemini model..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableModels.map((model) => (
                                                <SelectItem key={model.name} value={model.name}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{model.displayName}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {model.description.substring(0, 60)}{model.description.length > 60 ? '...' : ''}
                                                        </span>
                                                        <span className="text-[10px] text-primary/70 mt-0.5">
                                                            Methods: {model.supportedGenerationMethods.join(', ')}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {availableModels.length} models available for your API key
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2 pt-3 border-t">
                                <Label className="text-sm">Cost Estimation (Optional)</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Input price ($ per 1M tokens)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={priceInput}
                                            onChange={(e) => handleUpdate('gemini_price_input_per_million', e.target.value)}
                                            placeholder="e.g. 0.10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Output price ($ per 1M tokens)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={priceOutput}
                                            onChange={(e) => handleUpdate('gemini_price_output_per_million', e.target.value)}
                                            placeholder="e.g. 0.40"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Used only for cost estimates in AI Lab. Leave empty to hide cost estimates.
                                </p>
                            </div>

                            {/* Image Model Selection */}
                            {(availableImageModels.length > 0) && (
                                <div className="space-y-2 pt-3 border-t">
                                    <Label className="text-sm">Select Image Generation Model</Label>
                                    <Select
                                        value={settings.find(s => s.key === 'gemini_image_model')?.value || ''}
                                        onValueChange={(v) => handleUpdate('gemini_image_model', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose an Image model..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableImageModels.map((model) => (
                                                <SelectItem key={model.name} value={model.name}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{model.displayName}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {model.description.substring(0, 60)}
                                                        </span>
                                                        <span className="text-[10px] text-primary/70 mt-0.5">
                                                            Methods: {model.supportedGenerationMethods.join(', ')}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        For "Pro" image mode. Uses the Image API key if provided, otherwise the main key.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2 pt-3 border-t">
                                <Label className="text-sm">Custom Image Model Name (Optional)</Label>
                                <Input
                                    value={settings.find(s => s.key === 'gemini_image_model')?.value || ''}
                                    onChange={(e) => handleUpdate('gemini_image_model', e.target.value)}
                                    placeholder="imagen-3.0-generate-001 or gemini-2.5-flash-image"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Paste any valid Gemini/Imagen model name to override the dropdown.
                                </p>
                            </div>
                        </div>

                        {/* Image Preferences */}
                        <div className="space-y-6 pt-4 border-t">
                            <Label className="text-sm font-semibold">Image Generation Preferences</Label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    className={`p-4 border rounded-lg text-left transition-all ${currentImageModel === 'turbo' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                                    onClick={() => handleUpdate('image_model', 'turbo')}
                                >
                                    <h4 className="font-bold text-sm mb-1">Turbo Mode (Free & Fast)</h4>
                                    <p className="text-xs text-muted-foreground">Uses Flux Schnell. Extreme speed, no API key required. Best for most articles.</p>
                                </button>
                                <button
                                    className={`p-4 border rounded-lg text-left transition-all ${currentImageModel === 'pro' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                                    onClick={() => handleUpdate('image_model', 'pro')}
                                >
                                    <h4 className="font-bold text-sm mb-1">Pro Mode (Gemini Imagen)</h4>
                                    <p className="text-xs text-muted-foreground">Uses Google Gemini's image generation. Higher quality, uses your Gemini API key.</p>
                                </button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Batch generation controls will appear in the Image Studio once it is enabled.
                            </p>
                        </div>
                    </div>

                    {settings.length > 0 && (
                        <div className="pt-4">
                            <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
                                <FloppyDiskIcon size={16} className="mr-2" />
                                {saving ? 'Saving...' : 'Save AI Settings'}
                            </Button>
                        </div>
                    )}

                    {settings.length === 0 && (
                        <div className="text-center py-4">
                            <Button variant="outline" onClick={initializeDefaultSettings}>
                                Initialize Default Keys
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AISettings;
