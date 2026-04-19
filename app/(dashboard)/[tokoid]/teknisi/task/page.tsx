import { getAvailableTasks, getMyTasks } from "@/actions/service";
import { TeknisiTaskManager } from "@/components/dashboard/teknisi-task-manager";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getTechnicianTaskStats(tokoId: string, userId: string) {
  const [tersedia, repairing, selesai, gagal, history, total] = await Promise.all([
    prisma.service.count({
      where: { tokoId, status: "received", technicianId: null },
    }),
    prisma.service.count({
      where: { technicianId: userId, status: "repairing" },
    }),
    prisma.service.count({
      where: { technicianId: userId, status: { in: ["done", "picked_up"] } },
    }),
    prisma.service.count({
      where: { technicianId: userId, status: "failed" },
    }),
    prisma.service.count({
      where: { technicianId: userId, status: { in: ["done", "picked_up", "failed"] } },
    }),
    prisma.service.count({
      where: { technicianId: userId },
    }),
  ]);

  return { tersedia, repairing, selesai, gagal, history, total };
}

export default async function TeknisiTaskPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Task</h1>
        <p className="text-muted-foreground text-destructive">Unauthorized</p>
      </div>
    );
  }

  const stats = await getTechnicianTaskStats(tokoid, session.user.id);

  const myTasksResult = await getMyTasks();
  const myTasks = myTasksResult.success ? myTasksResult.data || [] : [];

  const availableResult = await getAvailableTasks(tokoid);
  const availableTasks = availableResult.success ? availableResult.data || [] : [];

  return (
    <TeknisiTaskManager
      myTasks={myTasks}
      availableTasks={availableTasks}
      initialStats={stats}
      tokoId={tokoid}
    />
  );
}