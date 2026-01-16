import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMapSettings } from '@/contexts/MapSettingsContext';

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

const MapPreview = () => {
    const { settings } = useMapSettings();
    const [svgContent, setSvgContent] = useState<string>("");

    useEffect(() => {
        fetch('/world-map-borders.svg')
            .then(res => res.text())
            .then(text => {
                const match = text.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
                const inner = match ? match[1] : text;
                setSvgContent(inner.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim());
            })
            .catch(console.error);
    }, []);

    const { data: citiesData } = useQuery({
        queryKey: ['map-cities'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('map_cities')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            return data;
        },
        staleTime: 60 * 1000,
    });

    const connectionPoints = useMemo(() => {
        if (!citiesData) return [];
        return citiesData.map((city: any) => {
            const { x, y } = geoToSvg(city.latitude, city.longitude);
            return { name: city.name, x, y, isMain: city.is_main, isSecondary: city.is_secondary };
        });
    }, [citiesData]);

    const mainPoint = connectionPoints.find((p: any) => p.isMain);
    const centralEuropeCenter = geoToSvg(49.0, 17.0);
    const viewBox = `${centralEuropeCenter.x - 50} ${centralEuropeCenter.y - 35} 100 75`;

    return (
        <div className="relative w-full aspect-[4/3] bg-card rounded-lg border overflow-hidden">
            <style>{`
        .preview-map-paths path {
          fill: hsl(var(--foreground) / 0.05);
          stroke: hsl(var(--foreground) / ${settings.borderOpacity / 100});
          stroke-width: ${settings.borderWidth / 100};
          vector-effect: non-scaling-stroke;
          stroke-linejoin: round;
          stroke-linecap: round;
        }
      `}</style>

            <svg viewBox={viewBox} className="w-full h-full">
                {/* World map */}
                <g
                    className="preview-map-paths"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                />

                {/* Connection lines */}
                {mainPoint && connectionPoints
                    .filter((p: any) => !p.isMain)
                    .map((point: any, i: number) => {
                        const midX = (mainPoint.x + point.x) / 2;
                        const distance = Math.sqrt((point.x - mainPoint.x) ** 2 + (point.y - mainPoint.y) ** 2);
                        const curvature = Math.min(distance * 0.15, 60);
                        const midY = Math.min(mainPoint.y, point.y) - curvature;
                        const pathD = `M ${mainPoint.x} ${mainPoint.y} Q ${midX} ${midY} ${point.x} ${point.y}`;

                        return (
                            <path
                                key={i}
                                d={pathD}
                                fill="none"
                                stroke={settings.lineColor || "hsl(210, 100%, 55%)"}
                                strokeWidth={(settings.lineWidth || 150) / 500} // Scale down for preview
                                opacity={(settings.lineOpacity || 30) / 100}
                            />
                        );
                    })}

                {/* City dots */}
                {connectionPoints.map((point: any, i: number) => (
                    <g key={i}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r={point.isMain ? 1.5 : point.isSecondary ? 1.2 : 1}
                            fill="hsl(210, 100%, 50%)"
                        />
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r={point.isMain ? 0.5 : 0.3}
                            fill="hsl(210, 100%, 85%)"
                        />
                    </g>
                ))}
            </svg>

            {/* Gradient overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
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
    );
};

export default MapPreview;
