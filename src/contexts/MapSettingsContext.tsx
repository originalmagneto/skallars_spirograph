"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface MapSettings {
    borderWidth: number;
    borderOpacity: number;
    lineOpacity: number;
    lineWidth: number;
    lineColor: string;
}

interface MapSettingsContextType {
    settings: MapSettings;
    updateSettings: (newSettings: Partial<MapSettings>) => void;
}

const defaultSettings: MapSettings = {
    borderWidth: 50,
    borderOpacity: 15,
    lineOpacity: 30,
    lineWidth: 150,
    lineColor: '#6366f1',
};

const STORAGE_KEY = 'map_settings_v1';

const MapSettingsContext = createContext<MapSettingsContextType | undefined>(undefined);

export function MapSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<MapSettings>(defaultSettings);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<MapSettings>;
                setSettings(prev => ({ ...prev, ...parsed }));
            }
        } catch {
            // Ignore malformed storage; fall back to defaults.
        }
    }, []);

    const updateSettings = useCallback((newSettings: Partial<MapSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // Non-fatal if storage is unavailable.
        }
    }, [settings]);

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
