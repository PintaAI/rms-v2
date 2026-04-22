import { getAvailableTasks, getMyTasks, getTechnicianTaskStats } from "@/actions/service";
import { TeknisiTaskManager } from "@/components/dashboard/services/teknisi-task-manager";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Image from "next/image";
import { RiStore2Line } from "@remixicon/react";

export default async function TeknisiTaskPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const toko = await prisma.toko.findUnique({
    where: { id: tokoid },
    select: { id: true, name: true, logoUrl: true },
  });

  if (!session?.user) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Task</h1>
            <div className="h-6 w-1 rounded-full bg-primary" />
            <div className="flex items-center gap-2">
              {toko?.logoUrl ? (
                <Image
                  src={toko.logoUrl}
                  alt={toko.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">Kelola task teknisi yang sedang aktif</p>
        </div>
        <p className="text-destructive">Unauthorized</p>
      </div>
    );
  }

  const statsResult = await getTechnicianTaskStats(tokoid);
  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : { tersedia: 0, repairing: 0, selesai: 0, gagal: 0, history: 0, total: 0 };

  const myTasksResult = await getMyTasks(tokoid);
  const myTasks = myTasksResult.success ? myTasksResult.data || [] : [];

  const availableResult = await getAvailableTasks(tokoid);
  const availableTasks = availableResult.success ? availableResult.data || [] : [];

  return (
    <TeknisiTaskManager
      myTasks={myTasks}
      availableTasks={availableTasks}
      initialStats={stats}
      tokoId={tokoid}
      currentToko={toko ?? undefined}
    />
  );
}
