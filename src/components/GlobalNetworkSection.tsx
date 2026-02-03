'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMapSettings } from '@/contexts/MapSettingsContext';
import { Globe02Icon, Location01Icon } from 'hugeicons-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { COUNTRY_COORDINATES } from '@/lib/countryCoordinates';

// SVG dimensions: 1009.6727 x 665.96301
// geoViewBox: minLng=-169.110266, maxLat=83.600842, maxLng=190.486279, minLat=-58.508473
const SVG_WIDTH = 1009.6727;
const SVG_HEIGHT = 665.96301;

const geoToSvg = (lat: number, lng: number) => {
    const minLng = -169.110266;
    const maxLng = 190.486279;
    const maxLat = 83.600842;
    const minLat = -58.508473;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const mercY = (degLat: number) => Math.log(Math.tan(Math.PI / 4 + toRad(degLat) / 2));

    const x = ((lng - minLng) / (maxLng - minLng)) * SVG_WIDTH;

    const mercMax = mercY(maxLat);
    const mercMin = mercY(minLat);
    const y = ((mercMax - mercY(lat)) / (mercMax - mercMin)) * SVG_HEIGHT;

    return { x, y };
};

interface MapCity {
    id: string;
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
    is_main: boolean;
    is_secondary: boolean;
    region: string;
    display_order: number;
}

interface ConnectionPoint {
    name: string;
    x: number;
    y: number;
    isMain: boolean;
    isSecondary: boolean;
    region: string;
}

// Fallback data to implement immediate functionality (lines working) even if DB is empty
const FALLBACK_CITIES: MapCity[] = [
    { id: '1', name: 'Bratislava', country: 'Slovakia', latitude: 48.1486, longitude: 17.1077, is_main: true, is_secondary: false, region: 'Europe', display_order: 1 },
    { id: '2', name: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, is_main: false, is_secondary: true, region: 'Europe', display_order: 2 },
    { id: '3', name: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060, is_main: false, is_secondary: true, region: 'North America', display_order: 3 },
    { id: '4', name: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, is_main: false, is_secondary: true, region: 'Asia', display_order: 4 },
    { id: '5', name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, is_main: false, is_secondary: true, region: 'Asia', display_order: 5 },
    { id: '6', name: 'Hong Kong', country: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, is_main: false, is_secondary: true, region: 'Asia', display_order: 6 },
    { id: '7', name: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417, is_main: false, is_secondary: true, region: 'Europe', display_order: 7 },
];

const getViewConfigs = (mainPoint?: ConnectionPoint) => {
    const centerPoint = mainPoint || { x: SVG_WIDTH * 0.52, y: SVG_HEIGHT * 0.35 };
    const centralEuropeCenter = geoToSvg(49.0, 17.0);

    // Translations for toggle buttons
    // sk: Stredná Európa, Európa, Globálny
    // en: Central EU, Europe, Global
    return {
        global: {
            x: 0,
            y: 0,
            width: SVG_WIDTH,
            height: SVG_HEIGHT,
            label: { sk: 'Globálny', en: 'Global', de: 'Global', cn: '全球' },
        },
        europe: {
            x: centerPoint.x - 120,
            y: centerPoint.y - 80,
            width: 240,
            height: 180,
            label: { sk: 'Európa', en: 'Europe', de: 'Europa', cn: '欧洲' },
        },
        centralEurope: {
            x: centralEuropeCenter.x - 50,
            y: centralEuropeCenter.y - 35,
            width: 100,
            height: 75,
            label: { sk: 'Stredná Európa', en: 'Central EU', de: 'Mitteleuropa', cn: '中欧' },
        },
    };
};

type FocusMode = 'global' | 'europe' | 'centralEurope';

const CountryLabel = ({ lat, lng, name, scale }: { lat: number; lng: number; name: string; scale: number }) => {
    const { x, y } = geoToSvg(lat, lng);
    // Adjusted visibility threshold to show labels more easily on zoom
    if (scale > 0.3) return null; // Hide if zoomed out too much? No, scale is zoomScale = viewBox.width / SVG_WIDTH. Smaller scale = zoomed in? No. 
    // zoomScale = width / originalWidth. 
    // Full map: 1009 / 1009 = 1.
    // Europe: 240 / 1009 = 0.23.
    // Central EU: 100 / 1009 = 0.09.
    // So smaller number = more zoomed in.

    // We want labels to show when zoomed in (small scale value) or always?
    // User wants to see country names. 
    // Let's allow them up to scale 0.5 (half world view)

    const fontSize = 1.3 * Math.max(0.8, scale * 10);
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    return (
        <text
            x={x}
            y={y}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={fontSize}
            fontFamily="var(--font-body)"
            fontWeight="500"
            letterSpacing="0.1em"
            opacity={0.6}
            className="uppercase"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
            {formattedName}
        </text>
    );
};

// ... (CountryLabel component above)

const PulsingDot = ({ x, y, isMain, isSecondary, delay = 0, name, scale = 1 }: { x: number; y: number; isMain: boolean; isSecondary?: boolean; delay?: number; name: string; scale?: number }) => {
    const [isHovered, setIsHovered] = useState(false);
    const baseRadius = (isMain ? 6 : isSecondary ? 5 : 4) * scale;
    const labelScale = Math.max(0.6, Math.min(1.2, scale * 1.5));
    const fontSize = 10 * labelScale;
    const labelPadding = { x: 8 * labelScale, y: 5 * labelScale };
    const labelOffset = baseRadius * 3 + 4 * labelScale;

    // Unified Design Colors
    const pulseColor = "hsl(var(--brand-accent))";
    const coreColor = isMain ? "hsl(var(--brand-indigo))" : "hsl(var(--brand-indigo))";
    const glowColor = "hsl(var(--brand-accent))";

    return (
        <g
            className="cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <circle
                cx={x}
                cy={y}
                r={baseRadius * 2.5}
                fill={pulseColor}
                opacity={0.2}
                style={{
                    animation: 'pulse-ring 2.5s ease-out infinite',
                    animationDelay: `${delay}ms`,
                    transformOrigin: `${x}px ${y}px`,
                }}
            />
            <circle cx={x} cy={y} r={baseRadius * 1.6} fill={glowColor} opacity={0.3} />
            <circle cx={x} cy={y} r={baseRadius} fill={coreColor} />
            <circle cx={x} cy={y} r={baseRadius * 0.4} fill="hsl(var(--background))" opacity={0.8} />

            {isHovered && (
                <g style={{ pointerEvents: 'none' }}>
                    <line
                        x1={x}
                        y1={y - baseRadius * 1.8}
                        x2={x}
                        y2={y - labelOffset + labelPadding.y}
                        stroke="hsl(var(--border))"
                        strokeWidth={0.8 * labelScale}
                        opacity={0.8}
                    />
                    <rect
                        x={x - (name.length * fontSize * 0.32) - labelPadding.x}
                        y={y - labelOffset - fontSize - labelPadding.y}
                        width={name.length * fontSize * 0.64 + labelPadding.x * 2}
                        height={fontSize + labelPadding.y * 2}
                        rx={4 * labelScale}
                        fill="hsl(var(--card))"
                        stroke="hsl(var(--border))"
                        strokeWidth={0.5 * labelScale}
                        filter="drop-shadow(0 4px 6px -1px rgb(0 0 0 / 0.1))"
                    />
                    <text
                        x={x}
                        y={y - labelOffset - fontSize * 0.25}
                        textAnchor="middle"
                        fill="hsl(var(--foreground))"
                        fontSize={fontSize}
                        fontFamily="var(--font-body)"
                        fontWeight="500"
                        letterSpacing="0.02em"
                    >
                        {name}
                    </text>
                </g>
            )}
        </g>
    );
};

const ConnectionLine = ({
    x1, y1, x2, y2, delay = 0, index, scale = 1,
    opacity = 0.15, width = 0.5, color = "hsl(var(--brand-indigo))"
}: {
    x1: number; y1: number; x2: number; y2: number; delay?: number; index: number; scale?: number;
    opacity?: number; width?: number; color?: string;
}) => {
    const midX = (x1 + x2) / 2;
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const curvature = Math.min(distance * 0.15, 60);
    const midY = Math.min(y1, y2) - curvature;

    const pathId = `conn-path-${index}`;
    const pathD = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
    const dur = `${2.5 + (index % 3) * 0.4}s`;

    return (
        <g>
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={width * scale}
                opacity={opacity}
            />
            <path
                d={pathD}
                fill="none"
                stroke="hsl(var(--brand-accent))"
                strokeWidth={width * 1.6 * scale}
                strokeDasharray={`${3 * scale} ${5 * scale}`}
                opacity={0.6}
                style={{ animation: `dash-move 5s linear infinite`, animationDelay: `${delay}ms` }}
            />
            <path id={pathId} d={pathD} fill="none" stroke="transparent" />
            <circle r={2 * scale} fill="hsl(var(--brand-accent))">
                <animateMotion dur={dur} repeatCount="indefinite" begin={`${delay}ms`}>
                    <mpath xlinkHref={`#${pathId}`} />
                </animateMotion>
            </circle>
            <circle r={1.2 * scale} fill="hsl(var(--brand-accent))" opacity={0.6}>
                <animateMotion dur={dur} repeatCount="indefinite" begin={`${delay + 150}ms`}>
                    <mpath xlinkHref={`#${pathId}`} />
                </animateMotion>
            </circle>
        </g>
    );
};

const GlobalNetworkSection = ({ id }: { id?: string }) => {
    // ... (hooks unchanged) ...
    const { t, language } = useLanguage();
    const { settings } = useMapSettings();
    const sectionRef = useRef<HTMLElement>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const [focusMode, setFocusMode] = useState<FocusMode>('centralEurope');
    const [svgContent, setSvgContent] = useState<string>('');

    // ... (fetch SVG and DB data unchanged) ...
    useEffect(() => {
        fetch('/world-map-borders.svg')
            .then(res => res.text())
            .then(text => {
                const match = text.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
                const inner = match ? match[1] : text;
                const cleanInner = inner
                    .replace(/<\?xml[\s\S]*?\?>/g, '')
                    .replace(/<!--[\s\S]*?-->/g, '')
                    .trim();
                setSvgContent(cleanInner);
            })
            .catch(console.error);
    }, []);

    const { data: dbCities } = useQuery({
        queryKey: ['map-cities-public'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('map_cities')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) return null;
            return data as MapCity[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const citiesData = (dbCities && dbCities.length > 0) ? dbCities : FALLBACK_CITIES;

    // Calculate Country Labels using fixed coordinates standard, falling back to centroids if missing
    const countryLabels = useMemo(() => {
        if (!citiesData) return [];

        const uniqueCountries = new Set<string>();
        const countryGroups: Record<string, { totalLat: number; totalLng: number; count: number }> = {};

        citiesData.forEach(city => {
            if (city.country) {
                const c = city.country.trim();
                uniqueCountries.add(c);

                // Keep centroid data just in case we need fallback
                if (!countryGroups[c]) {
                    countryGroups[c] = { totalLat: 0, totalLng: 0, count: 0 };
                }
                countryGroups[c].totalLat += city.latitude;
                countryGroups[c].totalLng += city.longitude;
                countryGroups[c].count += 1;
            }
        });

        return Array.from(uniqueCountries).map(name => {
            const fixedCoord = COUNTRY_COORDINATES[name];
            if (fixedCoord) {
                return { name, lat: fixedCoord.lat, lng: fixedCoord.lng };
            }
            // Fallback to centroid
            const data = countryGroups[name];
            return {
                name,
                lat: data.totalLat / data.count,
                lng: data.totalLng / data.count
            };
        });
    }, [citiesData]);

    const connectionPoints = useMemo<ConnectionPoint[]>(() => {
        // ... (unchanged) ...
        if (!citiesData) return [];
        return citiesData.map((city) => {
            const { x, y } = geoToSvg(city.latitude, city.longitude);
            return {
                name: city.name,
                x,
                y,
                isMain: city.is_main,
                isSecondary: city.is_secondary,
                region: city.region,
            };
        });
    }, [citiesData]);

    // ... (rest of component) ...

    const mainPoint = connectionPoints.find((p) => p.isMain) || connectionPoints[0];
    const VIEW_CONFIGS = useMemo(() => getViewConfigs(mainPoint), [mainPoint]);

    // ... (ViewBox state and effects unchanged) ...
    const [viewBox, setViewBox] = useState(VIEW_CONFIGS.centralEurope);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, viewX: 0, viewY: 0 });

    useEffect(() => {
        if (focusMode === 'centralEurope') {
            setViewBox(VIEW_CONFIGS.centralEurope);
        } else if (focusMode === 'global') {
            setViewBox(VIEW_CONFIGS.global);
        } else if (focusMode === 'europe') {
            setViewBox(VIEW_CONFIGS.europe);
        }
    }, [VIEW_CONFIGS, focusMode]);

    // ... (snapToView, drag logic unchanged) ...

    const snapToView = useCallback((mode: FocusMode) => {
        setFocusMode(mode);
        const targetView = VIEW_CONFIGS[mode];
        const startView = { ...viewBox };
        const duration = 600;
        const startTime = performance.now();
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            setViewBox({
                x: startView.x + (targetView.x - startView.x) * eased,
                y: startView.y + (targetView.y - startView.y) * eased,
                width: startView.width + (targetView.width - startView.width) * eased,
                height: startView.height + (targetView.height - startView.height) * eased,
                label: targetView.label,
            });

            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [VIEW_CONFIGS, viewBox]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY, viewX: viewBox.x, viewY: viewBox.y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [viewBox.x, viewBox.y]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging || !svgContainerRef.current) return;
        const containerRect = svgContainerRef.current.getBoundingClientRect();
        const scaleX = viewBox.width / containerRect.width;
        const scaleY = viewBox.height / containerRect.height;
        const dx = (e.clientX - dragStart.x) * scaleX;
        const dy = (e.clientY - dragStart.y) * scaleY;
        const newX = Math.max(0, Math.min(SVG_WIDTH - viewBox.width, dragStart.viewX - dx));
        const newY = Math.max(0, Math.min(SVG_HEIGHT - viewBox.height, dragStart.viewY - dy));
        setViewBox(prev => ({ ...prev, x: newX, y: newY }));
    }, [isDragging, dragStart, viewBox.width, viewBox.height]);

    const handlePointerUp = useCallback(() => setIsDragging(false), []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        setViewBox(prev => {
            const newWidth = Math.max(150, Math.min(SVG_WIDTH, prev.width * zoomFactor));
            const newHeight = Math.max(100, Math.min(SVG_HEIGHT, prev.height * zoomFactor));
            const dx = (prev.width - newWidth) / 2;
            const dy = (prev.height - newHeight) / 2;
            const newX = Math.max(0, Math.min(SVG_WIDTH - newWidth, prev.x + dx));
            const newY = Math.max(0, Math.min(SVG_HEIGHT - newHeight, prev.y + dy));
            return { ...prev, x: newX, y: newY, width: newWidth, height: newHeight };
        });
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('opacity-0', 'translate-y-8');
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                }
            });
        }, { threshold: 0.1, rootMargin: '-50px' });
        const elements = sectionRef.current?.querySelectorAll('.scroll-reveal');
        elements?.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const otherPoints = connectionPoints.filter((p) => !p.isMain);
    const zoomScale = viewBox.width / SVG_WIDTH;
    const stats = [
        { number: `${connectionPoints.length > 0 ? Math.max(3, new Set(connectionPoints.map(c => c.region)).size * 4) : 12}+`, label: t.countries?.subtitle || 'Country' },
        { number: '50+', label: 'International Projects' },
        { number: `${new Set(connectionPoints.map(c => c.region)).size || 3}`, label: 'Continents' },
    ];
    const currentViewBox = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

    return (
        <section
            id={id}
            ref={sectionRef}
            className="relative py-20 md:py-32 overflow-visible"
            data-admin-section="countries"
        >
            {/* ... styles and container ... */}
            <div className="absolute inset-0 bg-card" />

            {/* Styles injected to properly map CSS variables */}
            <style>{`
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 0.35; }
                    50% { transform: scale(2.5); opacity: 0.05; }
                    100% { transform: scale(1); opacity: 0.35; }
                }
                @keyframes dash-move {
                    0% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: -100; }
                }
                .world-map-paths path {
                    fill: hsl(var(--foreground) / 0.03);
                    stroke: hsl(var(--foreground) / ${settings.borderOpacity / 100});
                    stroke-width: ${settings.borderWidth / 100};
                    vector-effect: non-scaling-stroke;
                    stroke-linejoin: round;
                    stroke-linecap: round;
                    shape-rendering: geometricPrecision;
                    transition: fill 0.2s ease, stroke 0.2s ease;
                    pointer-events: auto;
                }
                .world-map-paths path:hover {
                    fill: hsl(var(--brand-accent) / 0.1); 
                    stroke: hsl(var(--brand-accent) / 0.3);
                }
            `}</style>

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 flex items-center gap-3">
                            <div className="h-px w-12 bg-[#210059]" />
                            <span className="text-sm font-medium tracking-widest uppercase text-[#210059]">
                                {t.countries?.subtitle || 'International Presence'}
                            </span>
                        </div>
                        <h2 className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-100 text-4xl md:text-5xl font-bold text-foreground leading-tight">
                            {t.countries?.title || 'Global Reach'}
                        </h2>
                        <p className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-200 text-lg text-muted-foreground max-w-lg">
                            {t.countries.description}
                        </p>
                        <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-300 grid grid-cols-3 gap-6 pt-4">
                            {stats.map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl md:text-4xl font-bold text-foreground">{stat.number}</div>
                                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-[400ms] pt-4">
                            <p className="text-sm text-muted-foreground mb-3">{t.countries.connectionsTitle}</p>
                            <div className="flex flex-wrap gap-2">
                                {connectionPoints.map((city) => (
                                    <span key={city.name} className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full">
                                        {city.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 delay-200 h-[400px] md:h-[500px] relative">
                        {/* ... Labels and Map Controls ... */}
                        <div className="absolute top-2 right-2 z-40 flex bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-1 gap-1">
                            {['centralEurope', 'europe', 'global'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => snapToView(mode as FocusMode)}
                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${focusMode === mode
                                        ? 'bg-[#210059] text-white'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                        }`}
                                >
                                    {mode === 'global' ? <Globe02Icon size={14} /> : <Location01Icon size={14} />}
                                    {VIEW_CONFIGS[mode as FocusMode].label[language as 'sk' | 'en' | 'de' | 'cn']}
                                </button>
                            ))}
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 text-xs text-muted-foreground/60 pointer-events-none">
                            Drag to pan • Scroll to zoom
                        </div>
                        <div
                            ref={svgContainerRef}
                            className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            onWheel={handleWheel}
                        >
                            <svg viewBox={currentViewBox} className="w-full h-full select-none" preserveAspectRatio="xMidYMid meet">
                                <rect x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} fill="hsl(var(--background))" />
                                <g className="world-map-paths" dangerouslySetInnerHTML={{ __html: svgContent }} />
                                <g style={{ pointerEvents: 'none' }}>
                                    {countryLabels.map((country) => (
                                        <CountryLabel key={country.name} lat={country.lat} lng={country.lng} name={country.name} scale={zoomScale} />
                                    ))}
                                </g>
                                <g style={{ pointerEvents: 'none' }}>
                                    {mainPoint && otherPoints.map((point, i) => (
                                        <ConnectionLine
                                            key={point.name}
                                            x1={mainPoint.x}
                                            y1={mainPoint.y}
                                            x2={point.x}
                                            y2={point.y}
                                            delay={i * 200}
                                            index={i}
                                            scale={zoomScale}
                                            opacity={(settings.lineOpacity || 30) / 100}
                                            width={(settings.lineWidth || 150) / 300} // Tuned divider for reasonable thickness
                                            color={settings.lineColor || "hsl(var(--brand-indigo))"}
                                        />
                                    ))}
                                </g>
                                {connectionPoints.map((point, i) => (
                                    <PulsingDot key={point.name} x={point.x} y={point.y} isMain={point.isMain} isSecondary={'isSecondary' in point ? point.isSecondary : false} name={point.name} delay={i * 100} scale={zoomScale} />
                                ))}
                            </svg>
                        </div>
                        <div className="absolute inset-0 pointer-events-none z-20"
                            style={{
                                background: `
                                    linear-gradient(to top, hsl(var(--card)) 0%, transparent 15%),
                                    linear-gradient(to bottom, hsl(var(--card)) 0%, transparent 15%),
                                    linear-gradient(to left, hsl(var(--card)) 0%, transparent 20%),
                                    linear-gradient(to right, hsl(var(--card)) 0%, transparent 20%)
                                `,
                            }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default GlobalNetworkSection;
