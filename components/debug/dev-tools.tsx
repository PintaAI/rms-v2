"use client";

import { ThemeDebugPanel } from "@/components/debug/theme-debug-panel";

export function DevTools() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <ThemeDebugPanel />;
}