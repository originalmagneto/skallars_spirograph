import { useMapSettings } from '@/contexts/MapSettingsContext';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Settings01Icon, RotateClockwiseIcon } from 'hugeicons-react';
import MapPreview from './MapPreview';

const DEFAULT_SETTINGS = {
    borderOpacity: 22,
    borderWidth: 80,
};

const MapSettingsPanel = () => {
    const { settings, updateSettings } = useMapSettings();

    const handleReset = () => {
        updateSettings(DEFAULT_SETTINGS);
    };

    const isDefault =
        settings.borderOpacity === DEFAULT_SETTINGS.borderOpacity &&
        settings.borderWidth === DEFAULT_SETTINGS.borderWidth;

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

                    <p className="text-xs text-gray-500">
                        These settings control how country borders appear on the global network map. Changes are saved automatically.
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
