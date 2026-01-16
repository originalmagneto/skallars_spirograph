"use client";

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    J: {
      initAll: () => void;
      [key: string]: any;
    }
  }
}

export default function Spirograph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const fallbackRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadScript = async () => {
      try {
        // If script is already loaded and initialized
        if (window.J && typeof window.J.initAll === 'function') {
          window.J.initAll();
          return;
        }

        // If script element already exists but not loaded, safely remove it
        if (scriptRef.current && scriptRef.current.parentNode) {
          scriptRef.current.parentNode.removeChild(scriptRef.current);
          scriptRef.current = null;
        }

        // Load full spirograph script used in production; fallback to lightweight version
        const script = document.createElement('script');
        script.src = '/script/script.js';
        script.async = true;
        script.onerror = (error) => {
          console.error('Failed to load script:', error);
          setError('Failed to load spirograph script');
        };

        const loadPromise = new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });

        scriptRef.current = script;
        document.body.appendChild(script);

        await loadPromise;

        // Wait a small delay to ensure script is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));

        const initFromGlobal = () => {
          if (!window.J) return false;
          if (typeof window.J.initAll === 'function') {
            window.J.initAll();
            return true;
          }
          const targets = Array.from(document.querySelectorAll('[data-spirograph]')) as HTMLElement[];
          targets.forEach((el) => {
            try {
              el.querySelectorAll('canvas').forEach((c) => c.remove());
              new (window.J as any)({ container: el, type: (el as any).dataset.spirograph });
            } catch (e) {
              console.error('Spirograph instance init failed', e);
            }
          });
          return true;
        };

        if (!initFromGlobal()) {
          // Fallback: load lightweight script
          const fallback = document.createElement('script');
          fallback.src = '/script.js';
          fallback.async = true;
          fallbackRef.current = fallback;
          await new Promise((resolve, reject) => {
            fallback.onload = resolve as any;
            fallback.onerror = reject as any;
            document.body.appendChild(fallback);
          });
          if (!initFromGlobal()) {
            throw new Error('Spirograph script failed to initialize');
          }
        }
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load spirograph';
        console.error('Spirograph initialization error:', err);
        setError(errorMessage);
      }
    };

    loadScript();

    // Cleanup function
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      if (fallbackRef.current && fallbackRef.current.parentNode) {
        fallbackRef.current.parentNode.removeChild(fallbackRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-100 rounded">
        Error loading spirograph: {error}
      </div>
    );
  }

  return (
    <div
      data-spirograph="tetra"
      ref={containerRef}
      className="spirograph absolute top-0 left-0 right-0 h-[150vh] -translate-y-[25%] -z-10 pointer-events-none"
      data-spirograph-options='{
        "autoRotateNonAxis": true,
        "objectsCount": 12,
        "objectsCountMobile": 11,
        "duplicateFactor": 0.58,
        "initRotate": { "x": 0.1, "y": 0.1, "z": 0.8 }
      }'
    >
      <canvas
        className="spirograph__canvas w-full h-full"
        data-spirograph-canvas

      ></canvas>
    </div>
  );
}
