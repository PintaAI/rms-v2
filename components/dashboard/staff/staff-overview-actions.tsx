"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ServicesForm } from "@/components/dashboard/services/services-form";
import { RiAddLine } from "@remixicon/react";

interface StaffOverviewActionsProps {
  tokoId: string;
}

export function StaffOverviewActions({ tokoId }: StaffOverviewActionsProps) {
  const [servicesFormOpen, setServicesFormOpen] = useState(false);

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
        onSuccess={() => setServicesFormOpen(false)}
        tokoId={tokoId}
      />
    </>
  );
}
