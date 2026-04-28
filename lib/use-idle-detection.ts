"use client";

import { useEffect, useState } from "react";

export type IdleState = "active" | "idle" | "unknown";

interface IdleDetection {
  addEventListener(
    type: "statechange",
    listener: (event: IdleChangeEvent) => void,
    options?: { signal?: AbortSignal }
  ): void;
  readonly idleState: IdleState;
}

interface IdleChangeEvent {
  readonly state: IdleState;
}

declare global {
  interface Navigator {
    idle?: IdleDetection;
  }
}

const DEFAULT_IDLE_TIMEOUT = 60000;

function createIdleDetectionHelpers(idleTimeout: number = DEFAULT_IDLE_TIMEOUT) {
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let isIdle = false;

  const resetIdleTimer = (onIdle: () => void, onActive: () => void) => {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }

    if (isIdle) {
      isIdle = false;
      onActive();
    }

    idleTimer = setTimeout(() => {
      isIdle = true;
      onIdle();
    }, idleTimeout);
  };

  const clearIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  return { resetIdleTimer, clearIdleTimer };
}

interface UseIdleDetectionOptions {
  idleTimeout?: number;
}

interface UseIdleDetectionReturn {
  isIdle: boolean;
  idleState: IdleState;
}

export function useIdleDetection(
  options: UseIdleDetectionOptions = {}
): UseIdleDetectionReturn {
  const { idleTimeout = DEFAULT_IDLE_TIMEOUT } = options;
  const [idleState, setIdleState] = useState<IdleState>("unknown");

  const isIdle = idleState === "idle";

  useEffect(() => {
    const idleApi = navigator.idle;
    if (idleApi) {
      const controller = new AbortController();
      idleApi.addEventListener("statechange", (event) => {
        setIdleState(event.state);
      }, { signal: controller.signal });

      return () => controller.abort();
    }

    // Fallback: manual event listeners for browsers without Idle Detection API
    const pendingEvents = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    const { resetIdleTimer, clearIdleTimer } = createIdleDetectionHelpers(idleTimeout);

    const handleIdle = () => setIdleState("idle");
    const handleActive = () => setIdleState("active");

    const handleActivity = () => {
      resetIdleTimer(handleIdle, handleActive);
    };

    pendingEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    handleActivity();

    return () => {
      clearIdleTimer();
      pendingEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [idleTimeout]);

  return { isIdle, idleState };
}

interface UsePageActivityOptions {
  enabled?: boolean;
}

interface UsePageActivityReturn {
  isPageActive: boolean;
}

export function usePageActivity(
  options: UsePageActivityOptions = {}
): UsePageActivityReturn {
  const { enabled = true } = options;

  const [isPageActive, setIsPageActive] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => setIsPageActive(true);
    const handleBlur = () => setIsPageActive(false);
    const handleVisibility = () => {
      const isVisible = document.visibilityState === "visible";
      setIsPageActive(isVisible);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    handleVisibility();

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled]);

  return { isPageActive };
}

interface UseRealtimePollingOptions {
  interval?: number;
  enabled?: boolean;
}

export function useRealtimePolling(options: UseRealtimePollingOptions = {}) {
  const { interval = 15000, enabled = true } = options;

  const { isPageActive } = usePageActivity({ enabled });
  const { isIdle } = useIdleDetection();

  const shouldPoll = isPageActive && !isIdle && enabled;

  return { shouldPoll, interval, isPageActive, isIdle };
}