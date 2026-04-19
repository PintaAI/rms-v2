"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServiceTable } from "@/components/dashboard/services/service-table";
import { ServicesForm } from "@/components/dashboard/services/services-form";
import type { StaffOverviewData } from "@/actions/overview";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table/types";
import {
  RiInboxLine,
  RiToolsLine,
  RiCheckLine,
  RiCloseLine,
  RiArchiveLine,
  RiCalendarLine,
  RiAddLine,
} from "@remixicon/react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  variant?: "default" | "warning" | "success";
}

function StatsCard({ title, value, icon, description, variant = "default" }: StatsCardProps) {
  const variantStyles = {
    default: "text-muted-foreground",
    warning: "text-destructive",
    success: "text-green-600",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className={`text-xs ${variantStyles[variant]}`}>{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface StaffOverviewClientProps {
  initialData: StaffOverviewData;
  tokoId: string;
}

export function StaffOverviewClient({ initialData, tokoId }: StaffOverviewClientProps) {
  const { stats, recentServices } = initialData;
  const [servicesFormOpen, setServicesFormOpen] = useState(false);

  const tableServices: ServiceTableItem[] = recentServices.map((s) => ({
    id: s.id,
    hpCatalogId: s.hpCatalogId,
    customerName: s.customerName,
    noWa: s.noWa,
    complaint: s.complaint,
    note: s.note,
    status: s.status,
    checkinAt: s.checkinAt,
    doneAt: s.doneAt,
    checkoutAt: s.checkoutAt,
    hpCatalog: s.hpCatalog,
    technician: s.technician,
    invoice: s.invoice,
    createdBy: s.createdBy,
    passwordPattern: s.passwordPattern,
    imei: s.imei,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <Button onClick={() => setServicesFormOpen(true)}>
          <RiAddLine className="h-4 w-4 mr-1" />
          New Service
        </Button>
      </div>

      <ServicesForm
        open={servicesFormOpen}
        onOpenChange={setServicesFormOpen}
        onSuccess={() => {
          setServicesFormOpen(false);
        }}
        tokoId={tokoId}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Service"
          value={stats.services.total}
          icon={<RiInboxLine className="h-4 w-4" />}
          description={`${stats.services.daily} hari ini`}
        />
        <StatsCard
          title="Sedang Diperbaiki"
          value={stats.services.repairing}
          icon={<RiToolsLine className="h-4 w-4" />}
          description={`${stats.services.received} menunggu teknisi`}
        />
        <StatsCard
          title="Selesai"
          value={stats.services.done}
          icon={<RiCheckLine className="h-4 w-4" />}
        />
        <StatsCard
          title="Low Stock Items"
          value={stats.inventory.lowStockCount}
          icon={<RiArchiveLine className="h-4 w-4" />}
          description={`${stats.inventory.totalSpareparts} total sparepart`}
          variant={stats.inventory.lowStockCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.services.daily}</div>
            <p className="text-xs text-muted-foreground">service masuk</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">7 Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.services.weekly}</div>
            <p className="text-xs text-muted-foreground">service masuk</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">30 Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.services.monthly}</div>
            <p className="text-xs text-muted-foreground">service masuk</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceTable
            services={tableServices}
            preset="staffActive"
            emptyMessage="Tidak ada service"
            tokoId={tokoId}
            disableAssignment={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}