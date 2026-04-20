import type { SwatchMap, Color } from "colorthief";

interface Oklch {
  l: number;
  c: number;
  h: number;
}

export interface ThemeColors {
  light: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    ring: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
  };
  dark: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    ring: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    sidebar: string;
    sidebarForeground: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
    sidebarRing: string;
    muted: string;
    mutedForeground: string;
    border: string;
    input: string;
  };
}

function rgbToLinear(r: number, g: number, b: number): [number, number, number] {
  const toLinear = (c: number) => {
    const cNorm = c / 255;
    return cNorm <= 0.04045 ? cNorm / 12.92 : Math.pow((cNorm + 0.055) / 1.055, 2.4);
  };
  return [toLinear(r), toLinear(g), toLinear(b)];
}

function linearToOklab(lr: number, lg: number, lb: number): [number, number, number] {
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6309788070 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_ + 0.5;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_ + 0.0;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_ + 0.0;

  return [L, a, b];
}

function oklabToOklch(L: number, a: number, b: number): Oklch {
  const C = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return { l: L, c: C, h };
}

function rgbToOklch(r: number, g: number, b: number): Oklch {
  const [lr, lg, lb] = rgbToLinear(r, g, b);
  const [L, a, b_] = linearToOklab(lr, lg, lb);
  return oklabToOklch(L, a, b_);
}

function colorToOklch(color: Color): Oklch {
  const rgb = color.rgb();
  return rgbToOklch(rgb.r, rgb.g, rgb.b);
}

function oklchString(l: number, c: number, h: number): string {
  return `${l.toFixed(4)} ${c.toFixed(4)} ${h.toFixed(4)}`;
}

function adjustLuminance(oklch: Oklch, targetL: number): Oklch {
  return { l: targetL, c: oklch.c, h: oklch.h };
}

function adjustChroma(oklch: Oklch, targetC: number): Oklch {
  return { l: oklch.l, c: targetC, h: oklch.h };
}

function clampLuminance(oklch: Oklch, minL: number, maxL: number): Oklch {
  const clampedL = Math.max(minL, Math.min(maxL, oklch.l));
  return { l: clampedL, c: oklch.c, h: oklch.h };
}

function getFallbackOklch(): Oklch {
  return { l: 0.85, c: 0.22, h: 145 };
}

export function generateThemeColorsFromPalette(swatches: SwatchMap): ThemeColors {
  const vibrant = swatches.Vibrant?.color;
  const muted = swatches.Muted?.color;
  const lightVibrant = swatches.LightVibrant?.color;
  const darkVibrant = swatches.DarkVibrant?.color;
  const darkMuted = swatches.DarkMuted?.color;

  const primaryColor = vibrant || getFallbackOklch();
  const secondaryColor = muted || vibrant || getFallbackOklch();
  const accentColor = lightVibrant || vibrant || getFallbackOklch();
  const darkAccentColor = darkVibrant || vibrant || getFallbackOklch();

  const primaryOklch = typeof primaryColor === "object" && "rgb" in primaryColor
    ? colorToOklch(primaryColor as Color)
    : primaryColor as Oklch;

  const secondaryOklch = typeof secondaryColor === "object" && "rgb" in secondaryColor
    ? colorToOklch(secondaryColor as Color)
    : secondaryColor as Oklch;

  const accentOklch = typeof accentColor === "object" && "rgb" in accentColor
    ? colorToOklch(accentColor as Color)
    : accentColor as Oklch;

  const darkAccentOklch = typeof darkAccentColor === "object" && "rgb" in darkAccentColor
    ? colorToOklch(darkAccentColor as Color)
    : darkAccentColor as Oklch;

  const lightPrimary = clampLuminance(primaryOklch, 0.70, 0.85);
  const lightSecondary = adjustLuminance(adjustChroma(secondaryOklch, 0.02), 0.90);
  const lightAccent = clampLuminance(accentOklch, 0.88, 0.95);

  const darkPrimary = clampLuminance(primaryOklch, 0.85, 0.95);
  const darkSecondary = darkMuted?.color
    ? clampLuminance(colorToOklch(darkMuted.color), 0.20, 0.35)
    : adjustLuminance(adjustChroma(secondaryOklch, 0.02), 0.25);
  const darkAccent = clampLuminance(darkAccentOklch, 0.20, 0.35);

  // Dark backgrounds: deeply tinted with primary hue, very low luminance
  const h = primaryOklch.h;
  const darkBg      = oklchString(0.12, 0.015, h);
  const darkCard     = oklchString(0.17, 0.012, h);
  const darkPopover  = oklchString(0.17, 0.012, h);
  const darkSidebar  = oklchString(0.16, 0.015, h);
  const darkMutedBg  = oklchString(0.22, 0.010, h);
  const darkBorder   = oklchString(0.26, 0.010, h);
  const darkSidebarBorder = oklchString(0.28, 0.012, h);

  // Foreground: very light with a whisper of the primary hue
  const darkFg        = oklchString(0.97, 0.008, h);
  const darkMutedFg   = oklchString(0.62, 0.010, h);
  const darkSidebarFg = oklchString(0.97, 0.008, h);

  return {
    light: {
      primary: oklchString(lightPrimary.l, lightPrimary.c, lightPrimary.h),
      primaryForeground: "0.1591 0 0",
      secondary: oklchString(lightSecondary.l, lightSecondary.c, lightSecondary.h),
      secondaryForeground: "0.2178 0 0",
      accent: oklchString(lightAccent.l, lightAccent.c, lightAccent.h),
      accentForeground: "0.1591 0 0",
      ring: oklchString(lightPrimary.l, lightPrimary.c, lightPrimary.h),
      sidebarPrimary: oklchString(lightPrimary.l, lightPrimary.c, lightPrimary.h),
      sidebarPrimaryForeground: "0.1591 0 0",
    },
    dark: {
      primary: oklchString(darkPrimary.l, darkPrimary.c, darkPrimary.h),
      primaryForeground: "0.1591 0 0",
      secondary: oklchString(darkSecondary.l, darkSecondary.c, darkSecondary.h),
      secondaryForeground: "1.0000 0 0",
      accent: oklchString(darkAccent.l, darkAccent.c, darkAccent.h),
      accentForeground: oklchString(darkPrimary.l, darkPrimary.c, darkPrimary.h),
      ring: oklchString(darkPrimary.l, darkPrimary.c, darkPrimary.h),
      sidebarPrimary: oklchString(darkPrimary.l, darkPrimary.c, darkPrimary.h),
      sidebarPrimaryForeground: "0.1591 0 0",
      background: darkBg,
      foreground: darkFg,
      card: darkCard,
      cardForeground: darkFg,
      popover: darkPopover,
      popoverForeground: darkFg,
      sidebar: darkSidebar,
      sidebarForeground: darkSidebarFg,
      sidebarAccent: darkMutedBg,
      sidebarAccentForeground: darkFg,
      sidebarBorder: darkSidebarBorder,
      sidebarRing: oklchString(darkPrimary.l, darkPrimary.c, darkPrimary.h),
      muted: darkMutedBg,
      mutedForeground: darkMutedFg,
      border: darkBorder,
      input: darkBorder,
    },
  };
}

export function getCssVariableColor(varName: string): string {
  if (typeof document === "undefined") return "#22c55e";
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!value) return "#22c55e";
  if (value.startsWith("#") || value.startsWith("rgb")) return value;
  const parts = value.split(" ").map(Number);
  if (parts.length === 3) {
    const l = parts[0];
    const c = parts[1];
    const h = parts[2];
    return oklchToHex(l, c, h);
  }
  return "#22c55e";
}

function oklchToHex(L: number, C: number, H: number): string {
  const hRad = H * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841779 * a - 1.2914855480 * b;
  
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186141 * m + 1.7076147010 * s;
  
  const r = Math.round(Math.max(0, Math.min(255, lr * 255)));
  const g = Math.round(Math.max(0, Math.min(255, lg * 255)));
  const bVal = Math.round(Math.max(0, Math.min(255, lb * 255)));
  
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bVal.toString(16).padStart(2, "0")}`;
}