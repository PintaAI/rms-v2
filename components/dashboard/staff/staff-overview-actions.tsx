"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ServicesForm } from "@/components/dashboard/services/services-form";
import { useDashboardRealtime } from "@/components/dashboard/layout/dashboard-realtime-provider";
import { RiAddLine } from "@remixicon/react";

interface StaffOverviewActionsProps {
  tokoId: string;
}

export function StaffOverviewActions({ tokoId }: StaffOverviewActionsProps) {
  const router = useRouter();
  const { publish } = useDashboardRealtime();
  const [servicesFormOpen, setServicesFormOpen] = useState(false);

  const handleServiceSuccess = useCallback((result?: { serviceId?: string; action: "created" | "updated"; serviceLabel?: string; serviceBrand?: string; reason?: string }) => {
    setServicesFormOpen(false);
    publish({
      action: result?.action ?? "created",
      serviceId: result?.serviceId ?? "new-service",
      serviceLabel: result?.serviceLabel ?? "Service baru",
      serviceBrand: result?.serviceBrand,
      reason: result?.reason,
    });
    router.refresh();
  }, [publish, router]);

  return (
    <>
      <Button
        onClick={() => setServicesFormOpen(true)}
        className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:from-primary/90 hover:to-primary/80 hover:shadow-xl hover:shadow-primary/30"
      >
        <RiAddLine className="mr-1.5 h-4 w-4" />
        New Service
      </Button>
      <ServicesForm
        open={servicesFormOpen}
        onOpenChange={setServicesFormOpen}
        onSuccess={handleServiceSuccess}
        tokoId={tokoId}
      />
    </>
  );
}
