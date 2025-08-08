"use client";

import React, { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { MapPin, Phone, Mail } from "lucide-react";

interface Office {
  city: string;
  address: string;
  phone: string;
  coordinates: [number, number];
}

interface CountryOffices {
  [key: string]: Office[];
}

interface City {
  name: string;
  coordinates: [number, number];
}

const offices: CountryOffices = {
  SVK: [
    {
      city: "Bratislava",
      address: "Staré Grunty 18, 841 04 Bratislava",
      phone: "+421 2 5443 5941",
      coordinates: [17.1077, 48.1486],
    },
    {
      city: "Košice",
      address: "Hlavná 87, 040 01 Košice",
      phone: "+421 55 729 0711",
      coordinates: [21.2611, 48.7164],
    },
  ],
  CZE: [
    {
      city: "Praha",
      address: "Bozděchova 7, 150 00 Praha 5",
      phone: "+420 224 103 316",
      coordinates: [14.4378, 50.0755],
    },
  ],
};

const highlightedCountries = ["SK", "CZ"];

const majorCities: City[] = [
  { name: "Praha", coordinates: [14.4378, 50.0755] as [number, number] },
  { name: "Bratislava", coordinates: [17.1077, 48.1486] as [number, number] },
  { name: "Košice", coordinates: [21.2611, 48.7164] as [number, number] },
];

export default function InteractiveMap() {
  const [hoveredOffice, setHoveredOffice] = useState<Office | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const allOffices = useMemo(() => Object.values(offices).flat(), []);
  const cityLabels = useMemo(
    () => allOffices.map((o) => ({ name: o.city, coordinates: o.coordinates })),
    [allOffices]
  );

  const countryLabels = [
    { code: "SK", name: "Slovensko", coordinates: [19.6, 48.7] as [number, number] },
    { code: "CZ", name: "Česko", coordinates: [15.3, 49.8] as [number, number] },
  ];

  const cityToCountry: Record<string, string> = {
    Bratislava: "SK",
    "Košice": "SK",
    Praha: "CZ",
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-2xl overflow-hidden bg-white select-none"
      style={{ WebkitTapHighlightColor: 'transparent' as any }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [17.2, 49.3], scale: 2600 }}
        style={{ width: "100%", height: "100%", outline: 'none', userSelect: 'none' as any }}
        tabIndex={-1 as any}
        focusable={false as any}
        onMouseDown={(e: any) => {
          // Prevent focus ring on click/drag
          e.preventDefault();
        }}
      >
            <Geographies geography="/europe.json">
              {({ geographies }) =>
                geographies.map((geo) => {
                  const code = (geo.id as string) || (geo.properties.ISO_A3 as string) || (geo.properties.ISO_A2 as string);
                  const isHighlighted = highlightedCountries.includes(code);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => {
                        if (isHighlighted) setHoveredCountry(code);
                      }}
                      onMouseLeave={() => setHoveredCountry(null)}
                      style={{
                        default: {
                          fill: isHighlighted ? "rgba(33,0,89,0.08)" : "#eef2f7",
                          stroke: isHighlighted ? "#8b88c9" : "#94a3b8",
                          strokeWidth: isHighlighted ? 1 : 0.8,
                          vectorEffect: "non-scaling-stroke" as any,
                          filter: isHighlighted ? "drop-shadow(0 0 4px rgba(33,0,89,0.14))" : undefined,
                          outline: "none",
                        },
                        hover: { fill: isHighlighted ? "rgba(33,0,89,0.22)" : "#e8edf4", stroke: isHighlighted ? "#210059" : "#94a3b8", strokeWidth: isHighlighted ? 1.6 : 0.9 },
                        pressed: { fill: isHighlighted ? "rgba(33,0,89,0.28)" : "#e8edf4" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Country text labels */}
            {countryLabels.map(({ code, name, coordinates }) => {
              const hide = hoveredOffice && cityToCountry[hoveredOffice.city] === code;
              if (hide) return null;
              const isHovered = hoveredCountry === code;
              const fontSize = isHovered ? 17 : 15;
              const fill = isHovered ? "#210059" : "#938FFF"; // brand indigo vs soft per brand
              return (
                <Marker key={name} coordinates={coordinates}>
                  <text
                    y={-6}
                    textAnchor="middle"
                    style={{ fontSize, paintOrder: "stroke" as any, stroke: "#fff", strokeWidth: 3, pointerEvents: 'none', letterSpacing: 1.2, fontFamily: 'var(--font-geist-sans, ui-sans-serif)' }}
                    fontWeight={800}
                    fill={fill}
                  >
                    {name.toUpperCase()}
                  </text>
                </Marker>
              );
            })}

            {/* City labels always visible */}
            {cityLabels.map(({ name, coordinates }) => {
              const isHovered = hoveredOffice?.city === name;
              const fontSize = isHovered ? 14 : 12;
              return (
                <Marker key={`label-${name}`} coordinates={coordinates}>
                  <text
                    y={-10}
                    x={10}
                    textAnchor="start"
                    style={{ fontSize, paintOrder: "stroke" as any, stroke: "#fff", strokeWidth: 2, pointerEvents: 'none', fontFamily: 'var(--font-geist-sans, ui-sans-serif)' }}
                    fontWeight={700}
                    fill="#210059"
                  >
                    {name}
                  </text>
                </Marker>
              );
            })}

            {allOffices.map((office) => (
              <Marker
                key={office.city}
                coordinates={office.coordinates}
                onMouseEnter={() => setHoveredOffice(office)}
                onMouseLeave={() => setHoveredOffice(null)}
              >
                <g className="cursor-pointer">
                  <circle className="animate-ping" r={8} fill="#21005922" />
                  <circle r={5} fill="#210059" stroke="#fff" strokeWidth={2} />
                </g>
              </Marker>
            ))}
      </ComposableMap>
    </div>
  );
}
