"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMapSettings } from '@/contexts/MapSettingsContext';
import { Globe, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// SVG dimensions matching the world map
const SVG_WIDTH = 1009.6727;
const SVG_HEIGHT = 665.96301;

// Convert geographic coordinates to SVG coordinates
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

// Fallback cities data when Supabase is not configured
const DEFAULT_CITIES = [
    { id: '1', name: 'Bratislava', latitude: 48.1486, longitude: 17.1077, is_main: true, is_secondary: false, region: 'europe', display_order: 0 },
    { id: '2', name: 'Košice', latitude: 48.7164, longitude: 21.2611, is_main: false, is_secondary: true, region: 'europe', display_order: 1 },
    { id: '3', name: 'Praha', latitude: 50.0755, longitude: 14.4378, is_main: false, is_secondary: true, region: 'europe', display_order: 2 },
    { id: '4', name: 'Vienna', latitude: 48.2082, longitude: 16.3738, is_main: false, is_secondary: false, region: 'europe', display_order: 3 },
    { id: '5', name: 'Budapest', latitude: 47.4979, longitude: 19.0402, is_main: false, is_secondary: false, region: 'europe', display_order: 4 },
];

interface MapCity {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    is_main: boolean;
    is_secondary: boolean;
    region: string;
    display_order: number;
}

// Central European countries for labels
const CENTRAL_EUROPE_COUNTRIES = [
    { name: 'Slovakia', nameSk: 'Slovensko', labelLat: 48.7, labelLng: 19.5 },
    { name: 'Czech Republic', nameSk: 'Česko', labelLat: 49.8, labelLng: 15.5 },
    { name: 'Poland', nameSk: 'Poľsko', labelLat: 52.0, labelLng: 19.5 },
    { name: 'Hungary', nameSk: 'Maďarsko', labelLat: 47.0, labelLng: 19.5 },
    { name: 'Austria', nameSk: 'Rakúsko', labelLat: 47.5, labelLng: 14.0 },
];

interface ConnectionPoint {
    name: string;
    x: number;
    y: number;
    isMain: boolean;
    isSecondary: boolean;
    region: string;
}

// ViewBox configurations for different focus modes
const getViewConfigs = (mainPoint?: ConnectionPoint) => {
    const centerPoint = mainPoint || { x: SVG_WIDTH * 0.52, y: SVG_HEIGHT * 0.35 };
    const centralEuropeCenter = geoToSvg(49.0, 17.0);

    return {
        global: {
            x: 0,
            y: 0,
            width: SVG_WIDTH,
            height: SVG_HEIGHT,
            label: { sk: 'Globálny', en: 'Global' },
        },
        europe: {
            x: centerPoint.x - 120,
            y: centerPoint.y - 80,
            width: 240,
            height: 180,
            label: { sk: 'Európa', en: 'Europe' },
        },
        centralEurope: {
            x: centralEuropeCenter.x - 50,
            y: centralEuropeCenter.y - 35,
            width: 100,
            height: 75,
            label: { sk: 'Stredná Európa', en: 'Central Europe' },
        },
    };
};

type FocusMode = 'global' | 'europe' | 'centralEurope';

// Country label component
const CountryLabel = ({ lat, lng, name, scale }: { lat: number; lng: number; name: string; scale: number }) => {
    const { x, y } = geoToSvg(lat, lng);
    if (scale > 0.15) return null;

    const fontSize = 2.2 * Math.max(0.8, scale * 8);
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    return (
        <text
            x={x}
            y={y}
            textAnchor="middle"
            fill="hsl(215, 16%, 47%)"
            fontSize={fontSize}
            fontFamily="var(--font-body), sans-serif"
            fontWeight="400"
            letterSpacing="0.08em"
            opacity={0.5}
            style={{ pointerEvents: 'none' }}
        >
            {formattedName}
        </text>
    );
};

// Pulsing dot for city locations - with lighter blue colors
const PulsingDot = ({ x, y, isMain, isSecondary, delay = 0, name, scale = 1 }: {
    x: number; y: number; isMain: boolean; isSecondary?: boolean; delay?: number; name: string; scale?: number
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const baseRadius = (isMain ? 6 : isSecondary ? 5 : 4) * scale;
    const labelScale = Math.max(0.6, Math.min(1.2, scale * 1.5));
    const fontSize = 10 * labelScale;
    const labelPadding = { x: 8 * labelScale, y: 5 * labelScale };
    const labelOffset = baseRadius * 3 + 4 * labelScale;

    // Using a vibrant blue accent color
    const accentColor = 'hsl(210, 100%, 55%)';
    const accentColorLight = 'hsl(210, 100%, 70%)';
    const accentColorPale = 'hsl(210, 100%, 85%)';

    return (
        <g
            className="cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Pulse ring */}
            <circle
                cx={x}
                cy={y}
                r={baseRadius * 2.5}
                fill={accentColor}
                opacity={0.2}
                style={{
                    animation: 'pulse-ring 2.5s ease-out infinite',
                    animationDelay: `${delay}ms`,
                    transformOrigin: `${x}px ${y}px`,
                }}
            />

            {/* Outer glow */}
            <circle cx={x} cy={y} r={baseRadius * 1.6} fill={accentColorLight} opacity={0.4} />

            {/* Core */}
            <circle cx={x} cy={y} r={baseRadius} fill={accentColor} />

            {/* Bright center highlight */}
            <circle cx={x} cy={y} r={baseRadius * 0.4} fill={accentColorPale} />

            {/* City name label on hover */}
            {isHovered && (
                <g style={{ pointerEvents: 'none' }}>
                    <line
                        x1={x}
                        y1={y - baseRadius * 1.8}
                        x2={x}
                        y2={y - labelOffset + labelPadding.y}
                        stroke="hsl(216, 19%, 46%)"
                        strokeWidth={0.8 * labelScale}
                        opacity={0.6}
                    />
                    <rect
                        x={x - (name.length * fontSize * 0.32) - labelPadding.x}
                        y={y - labelOffset - fontSize - labelPadding.y}
                        width={name.length * fontSize * 0.64 + labelPadding.x * 2}
                        height={fontSize + labelPadding.y * 2}
                        rx={2 * labelScale}
                        fill="hsl(210, 40%, 98%)"
                        stroke="hsl(212, 26%, 83%)"
                        strokeWidth={0.5 * labelScale}
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))"
                    />
                    <text
                        x={x}
                        y={y - labelOffset - fontSize * 0.25}
                        textAnchor="middle"
                        fill="hsl(222, 47%, 11%)"
                        fontSize={fontSize}
                        fontFamily="var(--font-body), sans-serif"
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

// Connection line with animated particles
const ConnectionLine = ({ x1, y1, x2, y2, delay = 0, index, scale = 1 }: {
    x1: number; y1: number; x2: number; y2: number; delay?: number; index: number; scale?: number
}) => {
    const midX = (x1 + x2) / 2;
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const curvature = Math.min(distance * 0.15, 60);
    const midY = Math.min(y1, y2) - curvature;

    const pathId = `conn-path-${index}`;
    const pathD = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
    const dur = `${2.5 + (index % 3) * 0.4}s`;

    const lineColor = 'hsl(210, 100%, 55%)';
    const lineColorSoft = 'hsl(210, 50%, 60%)';

    return (
        <g>
            {/* Subtle base stroke */}
            <path d={pathD} fill="none" stroke={lineColorSoft} strokeWidth={0.8 * scale} opacity={0.3} />

            {/* Moving dashes */}
            <path
                d={pathD}
                fill="none"
                stroke={lineColor}
                strokeWidth={1 * scale}
                strokeDasharray={`${3 * scale} ${5 * scale}`}
                opacity={0.4}
                style={{ animation: `dash-move 5s linear infinite`, animationDelay: `${delay}ms` }}
            />

            {/* Path for particles */}
            <path id={pathId} d={pathD} fill="none" stroke="transparent" />

            {/* Particle head */}
            <circle r={2.5 * scale} fill={lineColor}>
                <animateMotion dur={dur} repeatCount="indefinite" begin={`${delay}ms`}>
                    <mpath xlinkHref={`#${pathId}`} />
                </animateMotion>
            </circle>

            {/* Trailing particles */}
            <circle r={1.5 * scale} fill={lineColor} opacity={0.5}>
                <animateMotion dur={dur} repeatCount="indefinite" begin={`${delay + 150}ms`}>
                    <mpath xlinkHref={`#${pathId}`} />
                </animateMotion>
            </circle>
            <circle r={0.8 * scale} fill={lineColor} opacity={0.25}>
                <animateMotion dur={dur} repeatCount="indefinite" begin={`${delay + 300}ms`}>
                    <mpath xlinkHref={`#${pathId}`} />
                </animateMotion>
            </circle>
        </g>
    );
};

export default function GlobalNetworkSection({ id }: { id?: string }) {
    const { t } = useLanguage();
    const { settings } = useMapSettings();
    const sectionRef = useRef<HTMLElement>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const [focusMode, setFocusMode] = useState<FocusMode>('centralEurope');
    const [svgContent, setSvgContent] = useState<string>("");

    // Fetch cities from Supabase
    const { data: citiesData } = useQuery({
        queryKey: ['map-cities-public'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('map_cities')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) {
                console.warn("Could not fetch cities from Supabase, using defaults:", error.message);
                return null;
            }
            return data as MapCity[];
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    // Use database cities or fallback to defaults
    const cities = citiesData || DEFAULT_CITIES;

    // Load SVG content
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

    const svgInnerHtml = useMemo(() => {
        return { __html: svgContent };
    }, [svgContent]);

    // Convert cities to connection points
    const connectionPoints = useMemo<ConnectionPoint[]>(() => {
        return cities.map((city) => {
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
    }, [cities]);

    const mainPoint = connectionPoints.find((p) => p.isMain);
    const VIEW_CONFIGS = useMemo(() => getViewConfigs(mainPoint), [mainPoint]);

    // Pan/drag state
    const [viewBox, setViewBox] = useState(VIEW_CONFIGS.centralEurope);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, viewX: 0, viewY: 0 });

    // Update viewBox when VIEW_CONFIGS changes
    useEffect(() => {
        if (focusMode === 'centralEurope') {
            setViewBox(VIEW_CONFIGS.centralEurope);
        } else if (focusMode === 'global') {
            setViewBox(VIEW_CONFIGS.global);
        }
    }, [VIEW_CONFIGS, focusMode]);

    // Snap to preset view with smooth animation
    const snapToView = useCallback((mode: FocusMode) => {
        setFocusMode(mode);
        const targetView = VIEW_CONFIGS[mode];

        const startView = { ...viewBox };
        const duration = 600;
        const startTime = performance.now();

        const easeOutCubic = (v: number) => 1 - Math.pow(1 - v, 3);

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

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [VIEW_CONFIGS, viewBox]);

    // Handle mouse/touch drag
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            viewX: viewBox.x,
            viewY: viewBox.y,
        });
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

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Handle wheel zoom
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

    // Scroll animation
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.remove('opacity-0', 'translate-y-8');
                        entry.target.classList.add('opacity-100', 'translate-y-0');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '-50px' }
        );

        const elements = sectionRef.current?.querySelectorAll('.scroll-reveal');
        elements?.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const otherPoints = connectionPoints.filter((p) => !p.isMain);
    const zoomScale = viewBox.width / SVG_WIDTH;

    const stats = [
        { number: `${connectionPoints.length > 0 ? Math.max(3, new Set(connectionPoints.map(c => c.region)).size * 4) : 12}+`, label: t.countries?.title || 'Countries' },
        { number: '50+', label: t.services?.title || 'Projects' },
        { number: `${new Set(connectionPoints.map(c => c.region)).size || 3}`, label: 'Regions' },
    ];

    const currentViewBox = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

    return (
        <section id={id} ref={sectionRef} className="relative py-20 md:py-32 overflow-visible bg-gradient-to-b from-slate-50 to-white">
            <style jsx>{`
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
                    fill: hsl(210, 30%, 96%);
                    stroke: hsl(215, 20%, ${75 - settings.borderOpacity * 0.4}%);
                    stroke-width: ${settings.borderWidth / 100};
                    vector-effect: non-scaling-stroke;
                    stroke-linejoin: round;
                    stroke-linecap: round;
                    shape-rendering: geometricPrecision;
                    transition: fill 0.2s ease, stroke 0.2s ease;
                    pointer-events: auto;
                }
                .world-map-paths path:hover {
                    fill: hsl(210, 40%, 93%);
                    stroke: hsl(210, 40%, 60%);
                }
            `}</style>

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Text Content */}
                    <div className="space-y-8">
                        <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 flex items-center gap-3">
                            <div className="h-px w-12 bg-[hsl(var(--brand-accent))]" />
                            <span className="text-sm font-medium tracking-widest uppercase text-[hsl(var(--brand-indigo))]">
                                {t.countries?.subtitle || 'International Presence'}
                            </span>
                        </div>

                        <h2 className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-100 text-4xl md:text-5xl font-display font-bold text-[hsl(var(--brand-indigo))] leading-tight text-balance">
                            {t.countries?.title || 'Globally Connected,'}
                            <br />
                            <span className="text-[hsl(210,100%,55%)]">{t.countries?.subtitle || 'Locally Focused'}</span>
                        </h2>

                        <p className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-200 text-lg text-muted-foreground max-w-lg">
                            We collaborate with partners around the world to provide you with comprehensive legal services regardless of where you do business.
                        </p>

                        <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-300 grid grid-cols-3 gap-6 pt-4">
                            {stats.map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl md:text-4xl font-display font-bold text-[hsl(var(--brand-indigo))]">{stat.number}</div>
                                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-[400ms] pt-4">
                            <p className="text-sm text-muted-foreground mb-3">Our connections:</p>
                            <div className="flex flex-wrap gap-2">
                                {connectionPoints.map((city) => (
                                    <span key={city.name} className="text-xs px-3 py-1 bg-[hsl(210,100%,55%)]/10 text-[hsl(210,100%,45%)] rounded-full font-medium">
                                        {city.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* World Map */}
                    <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 delay-200 h-[400px] md:h-[500px] relative">
                        {/* Focus toggle buttons */}
                        <div className="absolute top-2 right-2 z-40 flex glass border-slate-200/50 rounded-lg p-1 gap-1">
                            <button
                                onClick={() => snapToView('centralEurope')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${focusMode === 'centralEurope'
                                    ? 'bg-[hsl(210,100%,55%)] text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <MapPin size={14} />
                                Central EU
                            </button>
                            <button
                                onClick={() => snapToView('europe')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${focusMode === 'europe'
                                    ? 'bg-[hsl(210,100%,55%)] text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <MapPin size={14} />
                                Europe
                            </button>
                            <button
                                onClick={() => snapToView('global')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${focusMode === 'global'
                                    ? 'bg-[hsl(210,100%,55%)] text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <Globe size={14} />
                                Global
                            </button>
                        </div>

                        {/* Drag hint */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 text-xs text-slate-400 pointer-events-none">
                            Drag to pan • Scroll to zoom
                        </div>

                        {/* SVG container */}
                        <div
                            ref={svgContainerRef}
                            className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none rounded-2xl overflow-hidden bg-slate-50/50"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            onWheel={handleWheel}
                        >
                            <svg
                                viewBox={currentViewBox}
                                className="w-full h-full select-none"
                                preserveAspectRatio="xMidYMid meet"
                            >
                                {/* Light background */}
                                <rect
                                    x="0"
                                    y="0"
                                    width={SVG_WIDTH}
                                    height={SVG_HEIGHT}
                                    fill="hsl(210, 40%, 98%)"
                                />

                                {/* Loaded Map Paths */}
                                <g
                                    className="world-map-paths"
                                    dangerouslySetInnerHTML={svgInnerHtml}
                                />

                                {/* Country labels for Central Europe */}
                                <g style={{ pointerEvents: 'none' }}>
                                    {CENTRAL_EUROPE_COUNTRIES.map((country) => (
                                        <CountryLabel
                                            key={country.name}
                                            lat={country.labelLat}
                                            lng={country.labelLng}
                                            name={country.nameSk}
                                            scale={zoomScale}
                                        />
                                    ))}
                                </g>

                                {/* Connection lines */}
                                <g style={{ pointerEvents: 'none' }}>
                                    {mainPoint &&
                                        otherPoints.map((point, i) => (
                                            <ConnectionLine
                                                key={point.name}
                                                x1={mainPoint.x}
                                                y1={mainPoint.y}
                                                x2={point.x}
                                                y2={point.y}
                                                delay={i * 200}
                                                index={i}
                                                scale={zoomScale}
                                            />
                                        ))}
                                </g>

                                {/* City dots */}
                                {connectionPoints.map((point, i) => (
                                    <PulsingDot
                                        key={point.name}
                                        x={point.x}
                                        y={point.y}
                                        isMain={point.isMain}
                                        isSecondary={point.isSecondary}
                                        name={point.name}
                                        delay={i * 100}
                                        scale={zoomScale}
                                    />
                                ))}
                            </svg>
                        </div>

                        {/* Gradient overlay for seamless blending */}
                        <div
                            className="absolute inset-0 pointer-events-none z-20 rounded-2xl"
                            style={{
                                background: `
                                    linear-gradient(to top, hsl(210, 40%, 98%) 0%, transparent 15%),
                                    linear-gradient(to bottom, hsl(210, 40%, 98%) 0%, transparent 15%),
                                    linear-gradient(to left, hsl(210, 40%, 98%) 0%, transparent 20%),
                                    linear-gradient(to right, hsl(210, 40%, 98%) 0%, transparent 20%)
                                `,
                            }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
