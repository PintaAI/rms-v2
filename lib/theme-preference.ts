export type ThemeMode = "dynamic" | "default";

const THEME_MODE_KEY = "rms_theme_mode";
const THEME_MODE_CHANGE_EVENT = "theme-mode-change";

export function getThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "dynamic";

  try {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    if (stored === "dynamic" || stored === "default") {
      return stored;
    }
    return "dynamic";
  } catch {
    return "dynamic";
  }
}

export function setThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
    // Notify listeners (e.g., useDynamicTheme hook) that preference changed.
    window.dispatchEvent(new CustomEvent(THEME_MODE_CHANGE_EVENT, { detail: { mode } }));
  } catch (error) {
    console.error("Failed to save theme mode:", error);
  }
}

export function onThemeModeChange(listener: (mode: ThemeMode) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const mode = (event as CustomEvent<{ mode?: ThemeMode }>).detail?.mode;
    if (mode === "dynamic" || mode === "default") listener(mode);
  };

  window.addEventListener(THEME_MODE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(THEME_MODE_CHANGE_EVENT, handler);
}
