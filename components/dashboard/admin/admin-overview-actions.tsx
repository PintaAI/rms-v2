"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ServicesForm } from "@/components/dashboard/services/services-form";
import { useDashboardRealtime } from "@/components/dashboard/layout/dashboard-realtime-provider";
import { useTour } from "@/lib/tour-context";
import { TourGuide } from "@/components/shared/tour-guide";
import { adminTourSteps } from "@/lib/tour-steps";
import { RiAddLine } from "@remixicon/react";

interface AdminOverviewActionsProps {
  tokoId: string;
}

export function AdminOverviewActions({ tokoId }: AdminOverviewActionsProps) {
  const router = useRouter();
  const { publish } = useDashboardRealtime();
  const { tourRunning, startTour, stopTour } = useTour();
  const [servicesFormOpen, setServicesFormOpen] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem("tour_completed");

    if (tourCompleted !== "true") {
      startTour();
    }
  }, [startTour]);

  return (
    <>
      <TourGuide run={tourRunning} steps={adminTourSteps} onComplete={stopTour} onSkip={stopTour} />
      <Button
        data-tour="new-service-btn"
        onClick={() => setServicesFormOpen(true)}
        className="w-full bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:from-primary/90 hover:to-primary/80 hover:shadow-xl hover:shadow-primary/30 sm:w-auto"
      >
        <RiAddLine data-icon="inline-start" />
        New Service
      </Button>
      <ServicesForm
        open={servicesFormOpen}
        onOpenChange={setServicesFormOpen}
        onSuccess={(result) => {
          setServicesFormOpen(false);
          publish({
            action: result?.action ?? "created",
            repairOrderId: result?.serviceId ?? "new-service",
            serviceLabel: result?.serviceLabel ?? "Service baru",
            serviceBrand: result?.serviceBrand,
            reason: result?.reason,
          });
          router.refresh();
        }}
        tokoId={tokoId}
      />
    </>
  );
}
