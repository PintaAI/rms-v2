"use client";

import { Joyride } from "react-joyride";
import type { EventData, Step, TooltipRenderProps } from "react-joyride";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCloseLine,
  RiCheckLine,
} from "@remixicon/react";

interface TourGuideProps {
  run: boolean;
  steps: Step[];
  onComplete?: () => void;
  onSkip?: () => void;
}

function TourTooltip({
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  index,
  size,
}: TooltipRenderProps) {
  const progress = ((index + 1) / size) * 100;

  return (
    <div
      {...tooltipProps}
      className={cn(
        "relative max-w-xs sm:max-w-sm bg-card border border-border/50 rounded-xl shadow-2xl shadow-black/20 overflow-hidden",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Langkah {index + 1} dari {size}
        </span>
        <button
          {...skipProps}
          className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted/50"
        >
          <RiCloseLine className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pb-2">
        {step.title && (
          <h3 className="text-base font-semibold text-foreground mb-1.5 flex items-center gap-2">
            {step.title}
          </h3>
        )}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {step.content}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-2">
        <Button
          {...backProps}
          variant="ghost"
          size="sm"
          className={cn(
            "text-muted-foreground hover:text-foreground",
            index === 0 && "invisible"
          )}
        >
          <RiArrowLeftLine className="w-4 h-4 mr-1" />
          Kembali
        </Button>

        <Button
          {...primaryProps}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        >
          {isLastStep ? (
            <>
              Selesai
              <RiCheckLine className="w-4 h-4 ml-1" />
            </>
          ) : (
            <>
              Lanjut
              <RiArrowRightLine className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>

      <div className="flex justify-center gap-1.5 pb-3">
        {Array.from({ length: size }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-200",
              i === index
                ? "w-4 bg-primary"
                : i < index
                  ? "bg-primary/50"
                  : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function TourGuide({ run, steps, onComplete, onSkip }: TourGuideProps) {
  const isClient = typeof window !== "undefined";

  const handleEvent = useCallback(
    (data: EventData) => {
      const { status } = data;

      if (status === "finished") {
        onComplete?.();
      } else if (status === "skipped") {
        onSkip?.();
      }
    },
    [onComplete, onSkip]
  );

  if (!isClient || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      options={{
        buttons: ["back", "close", "primary", "skip"],
        showProgress: false,
        skipBeacon: true,
        dismissKeyAction: "close",
        overlayClickAction: "close",
      }}
      onEvent={handleEvent}
      tooltipComponent={(props: TooltipRenderProps) => (
        <TourTooltip {...props} />
      )}
      locale={{
        back: "Kembali",
        next: "Lanjut",
        skip: "Lewati",
        last: "Selesai",
        close: "Tutup",
      }}
    />
  );
}
