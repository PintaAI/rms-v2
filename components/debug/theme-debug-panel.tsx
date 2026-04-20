"use client";

import { useState, useEffect, useCallback } from "react";
import { RiPaletteLine, RiCloseLine, RiLoader4Line, RiGuideLine, RiRefreshLine } from "@remixicon/react";
import { useTour } from "@/lib/tour-context";

interface ExtractedSwatch {
  name: string;
  hex: string;
  oklch: string;
}

interface ThemeVariables {
  light: Record<string, string>;
  dark: Record<string, string>;
}

interface DebugInfo {
  isLoading: boolean;
  logoUrl: string | null;
  swatches: ExtractedSwatch[];
  themeVariables: ThemeVariables | null;
  error: string | null;
}

const debugInfo: DebugInfo = {
  isLoading: false,
  logoUrl: null,
  swatches: [],
  themeVariables: null,
  error: null,
};

const listeners: Set<() => void> = new Set();

export function setDebugLoading(loading: boolean) {
  debugInfo.isLoading = loading;
  listeners.forEach((listener) => listener());
}

export function setDebugLogoUrl(url: string | null) {
  debugInfo.logoUrl = url;
  listeners.forEach((listener) => listener());
}

export function setDebugSwatches(swatches: ExtractedSwatch[]) {
  debugInfo.swatches = swatches;
  listeners.forEach((listener) => listener());
}

export function setDebugThemeVariables(vars: ThemeVariables | null) {
  debugInfo.themeVariables = vars;
  listeners.forEach((listener) => listener());
}

export function setDebugError(error: string | null) {
  debugInfo.error = error;
  listeners.forEach((listener) => listener());
}

export function getDebugInfo(): DebugInfo {
  return debugInfo;
}

function ColorSwatch({ name, hex, oklch }: ExtractedSwatch) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
      <div
        className="w-8 h-8 rounded-md border border-border/50 shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground">{name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{hex}</div>
        <div className="text-[10px] text-muted-foreground/70 truncate">oklch({oklch})</div>
      </div>
    </div>
  );
}

function VariableRow({ name, oldValue, newValue }: { name: string; oldValue: string; newValue: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] font-mono text-muted-foreground w-24 truncate">{name}</span>
      <span className="text-[10px] font-mono text-orange-500/80 truncate max-w-60">({oldValue})</span>
      <span className="text-[10px] text-cyan-500">→</span>
      <span className="text-[10px] font-mono text-green-500 truncate max-w-80">{newValue}</span>
    </div>
  );
}

export function ThemeDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [info, setInfo] = useState<DebugInfo>(debugInfo);
  const [tourState, setTourState] = useState({
    tourCompleted: null as string | null,
    onboardCompleted: null as string | null,
  });
  const { restartTour } = useTour();

  useEffect(() => {
    const listener = () => setInfo({ ...debugInfo });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    setTourState({
      tourCompleted: localStorage.getItem("tour_completed"),
      onboardCompleted: localStorage.getItem("onboard_completed"),
    });
  }, [isOpen]);

  const handleRefresh = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("rms_theme_cache");
      window.location.reload();
    }
  }, []);

  const handleStartTour = useCallback(() => {
    restartTour();
    setIsOpen(false);
  }, [restartTour]);

  const handleResetTourCompleted = useCallback(() => {
    localStorage.removeItem("tour_completed");
    setTourState((prev) => ({ ...prev, tourCompleted: null }));
  }, []);

  const handleResetOnboardCompleted = useCallback(() => {
    localStorage.removeItem("onboard_completed");
    setTourState((prev) => ({ ...prev, onboardCompleted: null }));
  }, []);

  const handleResetAllState = useCallback(() => {
    localStorage.removeItem("tour_completed");
    localStorage.removeItem("onboard_completed");
    setTourState({
      tourCompleted: null,
      onboardCompleted: null,
    });
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] p-2 rounded-full bg-background/80 border border-border shadow-lg hover:bg-muted/50 transition-colors"
        title="Open Theme Debug"
      >
        <RiPaletteLine className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 max-h-[70vh] overflow-auto rounded-xl bg-background/95 border border-border shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <RiPaletteLine className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Theme Debug</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-muted/50 transition-colors"
        >
          <RiCloseLine className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          {info.isLoading ? (
            <>
              <RiLoader4Line className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Extracting colors...</span>
            </>
          ) : (
            <>
              <div className={`w-2 h-2 rounded-full ${info.error ? "bg-red-500" : info.themeVariables ? "bg-green-500" : "bg-yellow-500"}`} />
              <span className="text-xs text-muted-foreground">
                {info.error ? "Error" : info.themeVariables ? "Applied" : "No logo"}
              </span>
            </>
          )}
        </div>

        {/* Logo URL */}
        {info.logoUrl && (
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs font-medium text-foreground mb-1">Logo URL</div>
            <div className="text-[10px] text-muted-foreground truncate">{info.logoUrl}</div>
          </div>
        )}

        {/* Error */}
        {info.error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="text-xs text-red-500">{info.error}</div>
          </div>
        )}

        {/* Extracted Swatches */}
        {info.swatches.length > 0 && (
          <div>
            <div className="text-xs font-medium text-foreground mb-2">Extracted Swatches</div>
            <div className="space-y-1.5">
              {info.swatches.map((swatch) => (
                <ColorSwatch key={swatch.name} {...swatch} />
              ))}
            </div>
          </div>
        )}

        {/* Theme Variables */}
        {info.themeVariables && (
          <div>
            <div className="text-xs font-medium text-foreground mb-2">CSS Variables (Light)</div>
            <div className="p-2 rounded-lg bg-muted/20 space-y-0.5">
              {Object.entries(info.themeVariables.light).map(([key, value]) => (
                <VariableRow key={key} name={key} oldValue="default" newValue={value} />
              ))}
            </div>

            <div className="text-xs font-medium text-foreground mt-3 mb-2">CSS Variables (Dark)</div>
            <div className="p-2 rounded-lg bg-muted/20 space-y-0.5">
              {Object.entries(info.themeVariables.dark).map(([key, value]) => (
                <VariableRow key={key} name={key} oldValue="default" newValue={value} />
              ))}
            </div>
          </div>
        )}

        {/* Default Values Reference */}
        <div>
          <div className="text-xs font-medium text-foreground mb-2">Default Values (globals.css)</div>
          <div className="p-2 rounded-lg bg-muted/20 text-[10px] font-mono text-muted-foreground/70 space-y-0.5">
            <div>--primary: oklch(0.8577 0.2136 124.2455)</div>
            <div>--secondary: oklch(0.9674 0.0013 286.3752)</div>
            <div>--accent: oklch(0.9674 0.0013 286.3752)</div>
            <div>--ring: oklch(0.8577 0.2136 124.2455)</div>
          </div>
        </div>

        {/* Tour Debug Section */}
        <div className="border-t border-border pt-3 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <RiGuideLine className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Tour State</span>
          </div>

          <div className="p-2 rounded-lg bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-[10px] gap-2">
              <span className="font-mono text-muted-foreground shrink-0">tour_completed:</span>
              <span className={`font-mono ${tourState.tourCompleted ? "text-green-500" : "text-muted-foreground/50"}`}>
                {tourState.tourCompleted ?? "null"}
              </span>
              <button
                onClick={handleResetTourCompleted}
                disabled={!tourState.tourCompleted}
                className="p-0.5 rounded hover:bg-muted-foreground/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Reset tour_completed"
              >
                <RiCloseLine className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] gap-2">
              <span className="font-mono text-muted-foreground shrink-0">onboard_completed:</span>
              <span className={`font-mono ${tourState.onboardCompleted ? "text-green-500" : "text-muted-foreground/50"}`}>
                {tourState.onboardCompleted ?? "null"}
              </span>
              <button
                onClick={handleResetOnboardCompleted}
                disabled={!tourState.onboardCompleted}
                className="p-0.5 rounded hover:bg-muted-foreground/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Reset onboard_completed"
              >
                <RiCloseLine className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleStartTour}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
            >
              <RiGuideLine className="w-3.5 h-3.5" />
              Start Tour
            </button>
            <button
              onClick={handleResetAllState}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground text-xs font-medium transition-colors"
            >
              <RiRefreshLine className="w-3.5 h-3.5" />
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
