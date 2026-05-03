"use client";

import { useCallback } from "react";
import type { ActionResult } from "@/actions";

interface MutationOperation<TState> {
  optimistic: (prev: TState) => TState;
  action: () => Promise<ActionResult>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useOptimisticMutation<TState>(
  stateRef: React.MutableRefObject<TState>,
  setState: React.Dispatch<React.SetStateAction<TState>>,
  pendingRef: React.MutableRefObject<number>,
) {
  return useCallback(
    async (op: MutationOperation<TState>): Promise<boolean> => {
      const snapshot = stateRef.current;
      pendingRef.current += 1;
      setState(op.optimistic);

      try {
        const result = await op.action();
        if (result.success) {
          pendingRef.current -= 1;
          op.onSuccess?.();
          return true;
        } else {
          pendingRef.current -= 1;
          setState(() => snapshot);
          op.onError?.(result.error || "Operation failed");
          return false;
        }
      } catch (err) {
        console.error("Optimistic mutation failed:", err);
        pendingRef.current -= 1;
        setState(() => snapshot);
        op.onError?.("An unexpected error occurred");
        return false;
      }
    },
    [stateRef, setState, pendingRef],
  );
}
