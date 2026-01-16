"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface MapSettings {
    borderWidth: number;
    borderOpacity: number;
    map_line_opacity: number;
    map_line_width: number;
    map_line_color: string;
}

interface MapSettingsContextType {
    settings: MapSettings;
    updateSettings: (newSettings: Partial<MapSettings>) => void;
}

const defaultSettings: MapSettings = {
    borderWidth: 50,
    borderOpacity: 15,
    map_line_opacity: 100,
    map_line_width: 2,
    map_line_color: '#FF0000',
};

const MapSettingsContext = createContext<MapSettingsContextType | undefined>(undefined);

export function MapSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<MapSettings>(defaultSettings);

    const updateSettings = useCallback((newSettings: Partial<MapSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    return (
        <MapSettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </MapSettingsContext.Provider>
    );
}

export function useMapSettings() {
    const context = useContext(MapSettingsContext);
    if (!context) {
        // Return default settings if not within provider (for non-admin pages)
        return { settings: defaultSettings, updateSettings: () => { } };
    }
    return context;
}
