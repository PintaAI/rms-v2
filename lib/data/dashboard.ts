import type { RequestScope } from "@/lib/auth/request-scope";
import { assertRole, assertCapability } from "@/lib/auth/request-scope";
import prisma from "@/lib/prisma";
import { ServiceStatus } from "@/prisma/generated/prisma/enums";

export interface AdminOverviewData {
  totalServices: number;
  activeServices: number;
  totalStaff: number;
  totalTechnicians: number;
}

export async function getAdminOverviewData(scope: RequestScope): Promise<AdminOverviewData> {
  assertRole(scope, ["admin"]);
  assertCapability(scope, "dashboard.overview");

  const [totalServices, activeServices, staffCount, technicianCount] = await Promise.all([
    prisma.service.count({ where: { tokoId: scope.tokoId } }),
    prisma.service.count({
      where: { tokoId: scope.tokoId, status: { in: [ServiceStatus.received, ServiceStatus.repairing] } },
    }),
    prisma.userToko.count({
      where: { tokoId: scope.tokoId, user: { role: "staff" } },
    }),
    prisma.userToko.count({
      where: { tokoId: scope.tokoId, user: { role: "technician" } },
    }),
  ]);

  return { totalServices, activeServices, totalStaff: staffCount, totalTechnicians: technicianCount };
}

export interface StaffOverviewData {
  todayServices: number;
}

export async function getStaffOverviewData(scope: RequestScope): Promise<StaffOverviewData> {
  assertRole(scope, ["staff"]);
  assertCapability(scope, "dashboard.overview");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayServices = await prisma.service.count({
    where: { tokoId: scope.tokoId, checkinAt: { gte: today } },
  });

  return { todayServices };
}
