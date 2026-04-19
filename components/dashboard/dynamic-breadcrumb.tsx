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
  staff: "Staff",
  tasks: "Tasks",
  technician: "Technician",
};

const statusLabels: Record<string, string> = {
  received: "Masuk",
  repairing: "Proses",
  done: "Selesai",
  failed: "Gagal",
  picked_up: "Diambil",
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

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={`${item.href}-${index}`}>
            <BreadcrumbItem>
              {item.isCurrent ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}