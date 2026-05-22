"use client";

import { useEffect, useRef, useState } from "react";
import { getSwatchesSync, type Color, type SwatchMap } from "colorthief";
import { generateThemeColorsFromPalette, type ThemeColors } from "@/lib/color-utils";
import { getThemeMode, onThemeModeChange } from "@/lib/theme-preference";
import {
  setDebugLoading,
  setDebugLogoUrl,
  setDebugSwatches,
  setDebugThemeVariables,
  setDebugError,
} from "@/components/debug/theme-debug-panel";

const STYLE_ID = "dynamic-theme-vars";
const DEBUG_ENABLED = process.env.NODE_ENV === "development";

function swatchToDebugInfo(name: string, color: Color | null): { name: string; hex: string; oklch: string } | null {
  if (!color) return null;
  const hex = color.hex();
  const oklch = color.oklch();
  return {
    name,
    hex,
    oklch: `${oklch.l.toFixed(4)} ${oklch.c.toFixed(4)} ${oklch.h.toFixed(4)}`,
  };
}

function injectThemeStyles(colors: ThemeColors): void {
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  const styleEl = document.createElement("style");
  styleEl.id = STYLE_ID;
  styleEl.textContent = `
    :root {
      --primary: oklch(${colors.light.primary});
      --primary-foreground: oklch(${colors.light.primaryForeground});
      --secondary: oklch(${colors.light.secondary});
      --secondary-foreground: oklch(${colors.light.secondaryForeground});
      --accent: oklch(${colors.light.accent});
      --accent-foreground: oklch(${colors.light.accentForeground});
      --ring: oklch(${colors.light.ring});
      --sidebar-primary: oklch(${colors.light.sidebarPrimary});
      --sidebar-primary-foreground: oklch(${colors.light.sidebarPrimaryForeground});
      --chart-1: oklch(${colors.light.primary});
    }
    .dark {
      --primary: oklch(${colors.dark.primary});
      --primary-foreground: oklch(${colors.dark.primaryForeground});
      --secondary: oklch(${colors.dark.secondary});
      --secondary-foreground: oklch(${colors.dark.secondaryForeground});
      --accent: oklch(${colors.dark.accent});
      --accent-foreground: oklch(${colors.dark.accentForeground});
      --ring: oklch(${colors.dark.ring});
      --sidebar-primary: oklch(${colors.dark.sidebarPrimary});
      --sidebar-primary-foreground: oklch(${colors.dark.sidebarPrimaryForeground});
      --chart-1: oklch(${colors.dark.primary});
      --background: oklch(${colors.dark.background});
      --foreground: oklch(${colors.dark.foreground});
      --card: oklch(${colors.dark.card});
      --card-foreground: oklch(${colors.dark.cardForeground});
      --popover: oklch(${colors.dark.popover});
      --popover-foreground: oklch(${colors.dark.popoverForeground});
      --sidebar: oklch(${colors.dark.sidebar});
      --sidebar-foreground: oklch(${colors.dark.sidebarForeground});
      --sidebar-accent: oklch(${colors.dark.sidebarAccent});
      --sidebar-accent-foreground: oklch(${colors.dark.sidebarAccentForeground});
      --sidebar-border: oklch(${colors.dark.sidebarBorder});
      --sidebar-ring: oklch(${colors.dark.sidebarRing});
      --muted: oklch(${colors.dark.muted});
      --muted-foreground: oklch(${colors.dark.mutedForeground});
      --border: oklch(${colors.dark.border});
      --input: oklch(${colors.dark.input});
    }
  `;

  document.head.appendChild(styleEl);

  if (DEBUG_ENABLED) {
    setDebugThemeVariables({
      light: colors.light,
      dark: colors.dark,
    });
  }
}

function removeThemeStyles(): void {
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }
}

async function extractColorsFromImage(logoUrl: string): Promise<{ colors: ThemeColors; swatches: SwatchMap } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        const swatches = getSwatchesSync(img);
        const colors = generateThemeColorsFromPalette(swatches);
        resolve({ colors, swatches });
      } catch (error) {
        console.error("Failed to extract colors:", error);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.error("Failed to load image for color extraction");
      resolve(null);
    };

    img.src = logoUrl;
  });
}

export function useDynamicTheme(logoUrl: string | null | undefined): void {
  const currentLogoUrlRef = useRef<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for preference changes — increment refreshKey to trigger main effect.
  useEffect(() => {
    return onThemeModeChange(() => {
      setRefreshKey((k) => k + 1);
    });
  }, []);

  useEffect(() => {
    const normalizedLogoUrl = logoUrl || null;

    // Always record the latest desired URL immediately.
    currentLogoUrlRef.current = normalizedLogoUrl;
    // Check user preference — if "default", remove dynamic styles and skip extraction.
    const themeMode = getThemeMode();
    if (themeMode === "default") {
      removeThemeStyles();
      if (DEBUG_ENABLED) {
        setDebugLogoUrl(null);
        setDebugError(null);
        setDebugSwatches([]);
        setDebugThemeVariables(null);
      }
      console.log("[DynamicTheme] Using default theme (user preference)");
      return;
    }

    if (!normalizedLogoUrl) {
      removeThemeStyles();
      if (DEBUG_ENABLED) {
        setDebugLogoUrl(null);
        setDebugError(null);
        setDebugSwatches([]);
        setDebugThemeVariables(null);
      }
      return;
    }

    if (DEBUG_ENABLED) {
      setDebugLogoUrl(normalizedLogoUrl);
      setDebugError(null);
      setDebugSwatches([]);
      setDebugThemeVariables(null);
      setDebugLoading(true);
    }

    console.log("[DynamicTheme] Extracting colors from:", normalizedLogoUrl);

    // Snapshot the URL for this extraction — used to discard stale results.
    const requestedUrl = normalizedLogoUrl;

    extractColorsFromImage(requestedUrl)
      .then((result) => {
        // If the user switched toko or changed preference while we were extracting, discard.
        if (currentLogoUrlRef.current !== requestedUrl || getThemeMode() !== "dynamic") {
          console.log("[DynamicTheme] Discarding stale result for:", requestedUrl);
          return;
        }

        if (result) {
          console.log("[DynamicTheme] Injecting theme for:", requestedUrl);
          injectThemeStyles(result.colors);

          if (DEBUG_ENABLED) {
            const debugSwatches = [
              swatchToDebugInfo("Vibrant", result.swatches.Vibrant?.color ?? null),
              swatchToDebugInfo("Muted", result.swatches.Muted?.color ?? null),
              swatchToDebugInfo("LightVibrant", result.swatches.LightVibrant?.color ?? null),
              swatchToDebugInfo("DarkVibrant", result.swatches.DarkVibrant?.color ?? null),
              swatchToDebugInfo("DarkMuted", result.swatches.DarkMuted?.color ?? null),
              swatchToDebugInfo("LightMuted", result.swatches.LightMuted?.color ?? null),
            ].filter(Boolean);

            setDebugSwatches(debugSwatches as { name: string; hex: string; oklch: string }[]);
          }
        } else {
          console.log("[DynamicTheme] Failed to extract colors from image:", requestedUrl);
          if (DEBUG_ENABLED) {
            setDebugError("Failed to extract colors from image");
          }
        }
      })
      .catch((error) => {
        console.error("[DynamicTheme] Extraction error:", error);
        if (DEBUG_ENABLED) {
          setDebugError(error instanceof Error ? error.message : "Unknown error");
        }
      })
      .finally(() => {
        if (DEBUG_ENABLED) {
          setDebugLoading(false);
        }
      });
  }, [logoUrl, refreshKey]);
}
