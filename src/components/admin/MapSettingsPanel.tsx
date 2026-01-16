import { useMapSettings } from '@/contexts/MapSettingsContext';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Settings01Icon, RotateClockwiseIcon } from 'hugeicons-react';
import MapPreview from './MapPreview';

const DEFAULT_SETTINGS = {
    borderOpacity: 20,
    borderWidth: 100,
    lineOpacity: 30,
    lineWidth: 150,
    lineColor: '#6366f1',
};

const MapSettingsPanel = () => {
    const { settings, updateSettings } = useMapSettings();

    const handleReset = () => {
        updateSettings(DEFAULT_SETTINGS);
    };

    const isDefault =
        settings.borderOpacity === DEFAULT_SETTINGS.borderOpacity &&
        settings.borderWidth === DEFAULT_SETTINGS.borderWidth &&
        settings.lineOpacity === DEFAULT_SETTINGS.lineOpacity &&
        settings.lineWidth === DEFAULT_SETTINGS.lineWidth &&
        settings.lineColor === DEFAULT_SETTINGS.lineColor;

    return (
        <div className="space-y-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings01Icon size={18} className="text-primary" />
                    <h3 className="font-medium">Map Display Settings</h3>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={isDefault}
                    className="gap-1"
                >
                    <RotateClockwiseIcon size={14} />
                    Reset
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Controls */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Border Opacity</Label>
                            <span className="text-xs text-gray-500">{settings.borderOpacity}%</span>
                        </div>
                        <Slider
                            value={[settings.borderOpacity]}
                            onValueChange={([value]) => updateSettings({ borderOpacity: value })}
                            min={0}
                            max={100}
                            step={1}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Border Width</Label>
                            <span className="text-xs text-gray-500">{settings.borderWidth}%</span>
                        </div>
                        <Slider
                            value={[settings.borderWidth]}
                            onValueChange={([value]) => updateSettings({ borderWidth: value })}
                            min={10}
                            max={200}
                            step={5}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Line Opacity (Connecting Lines)</Label>
                            <span className="text-xs text-gray-500">{settings.lineOpacity}%</span>
                        </div>
                        <Slider
                            value={[settings.lineOpacity]}
                            onValueChange={([value]) => updateSettings({ lineOpacity: value })}
                            min={10}
                            max={100}
                            step={5}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Line Width</Label>
                            <span className="text-xs text-gray-500">{settings.lineWidth}%</span>
                        </div>
                        <Slider
                            value={[settings.lineWidth]}
                            onValueChange={([value]) => updateSettings({ lineWidth: value })}
                            min={50}
                            max={300}
                            step={10}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Line Color</Label>
                            <span className="text-xs text-gray-500">{settings.lineColor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={settings.lineColor}
                                onChange={(e) => updateSettings({ lineColor: e.target.value })}
                                className="w-12 h-8 rounded cursor-pointer border p-0.5 bg-white"
                            />
                            <div className="text-xs text-muted-foreground">Click to change line color</div>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                        These settings control how country borders and connection lines appear on the global network map. Changes are saved automatically.
                    </p>
                </div>

                {/* Live Preview */}
                <div className="space-y-2">
                    <Label className="text-sm">Live Preview</Label>
                    <MapPreview />
                </div>
            </div>
        </div>
    );
};

export default MapSettingsPanel;
