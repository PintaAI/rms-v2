import { getServiceList } from "@/actions/service";
import { StaffManageService } from "@/components/dashboard/services/staff-manage-service";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getServiceStats(tokoId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { received: 0, repairing: 0, done: 0, picked_up: 0, failed: 0, history: 0, total: 0 };
  }

  const [received, repairing, done, picked_up, failed, history, total] = await Promise.all([
    prisma.service.count({ where: { tokoId, status: "received" } }),
    prisma.service.count({ where: { tokoId, status: "repairing" } }),
    prisma.service.count({ where: { tokoId, status: "done" } }),
    prisma.service.count({ where: { tokoId, status: "picked_up" } }),
    prisma.service.count({ where: { tokoId, status: "failed" } }),
    prisma.service.count({ where: { tokoId, status: { in: ["done", "picked_up", "failed"] } } }),
    prisma.service.count({ where: { tokoId } }),
  ]);

  return { received, repairing, done, picked_up, failed, history, total };
}

export default async function StaffServicePage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const pageSize = 15;

  const [servicesResult, stats] = await Promise.all([
    getServiceList(tokoid, undefined, 1, 1000),
    getServiceStats(tokoid),
  ]);

  if (!servicesResult.success || !servicesResult.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Service</h1>
        <p className="text-muted-foreground text-destructive">
          {servicesResult.error || "Gagal memuat data"}
        </p>
      </div>
    );
  }

  return (
    <StaffManageService
      allServices={servicesResult.data.data}
      initialStats={stats}
      tokoId={tokoid}
      pageSize={pageSize}
    />
  );
}