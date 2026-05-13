"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  admin: "Admin",
  toko: "Toko",
  service: "Service",
  karyawan: "Karyawan",
  inventory: "Inventory",
  "supplier-returns": "Retur Supplier",
  analytics: "Analytics",
  staff: "Staff",
  tasks: "Tasks",
  technician: "Technician",
};

const statusLabels: Record<string, string> = {
  received: "Masuk",
  repairing: "Proses",
  done: "Selesai",
  failed: "Gagal",
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbItems: { label: string; href: string; isCurrent: boolean }[] = [];

  const tokoId = segments[0] || "";

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const isCurrent = i === segments.length - 1;
    const label = routeLabels[segment] || segment;
    const href = `/${tokoId}/${segments.slice(1, i + 1).join("/")}`;

    breadcrumbItems.push({
      label,
      href,
      isCurrent,
    });
  }

  const status = searchParams.get("status");
  const pickedUp = searchParams.get("pickedup");
  if (status && statusLabels[status]) {
    breadcrumbItems.push({
      label: statusLabels[status],
      href: pathname,
      isCurrent: true,
    });
    if (breadcrumbItems.length > 1) {
      breadcrumbItems[breadcrumbItems.length - 2].isCurrent = false;
    }
  }

  if (pickedUp === "true") {
    breadcrumbItems.push({
      label: "Diambil",
      href: pathname,
      isCurrent: true,
    });
    if (breadcrumbItems.length > 1) {
      breadcrumbItems[breadcrumbItems.length - 2].isCurrent = false;
    }
  }

  return (
    <Breadcrumb className="min-w-0 overflow-hidden">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={`${item.href}-${index}`}>
            <BreadcrumbItem className={index < breadcrumbItems.length - 1 ? "hidden shrink-0 sm:inline-flex" : "min-w-0"}>
              {item.isCurrent ? (
                <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="truncate">{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator className="hidden shrink-0 sm:inline-flex" />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
