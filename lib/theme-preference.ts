export type ThemeMode = "dynamic" | "default";

const THEME_MODE_KEY = "rms_theme_mode";

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
    window.dispatchEvent(new CustomEvent("theme-mode-change", { detail: { mode } }));
  } catch (error) {
    console.error("Failed to save theme mode:", error);
  }
}