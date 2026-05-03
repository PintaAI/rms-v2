import { getAvailableTasks, getMyTasks, getTechnicianTaskStats } from "@/actions/service";
import { TeknisiTaskManager } from "@/components/dashboard/services/teknisi-task-manager";
import type { ServiceStatus } from "@/prisma/generated/prisma/enums";

function getMyTaskStatuses(status?: string): ServiceStatus[] {
  if (status === "repairing") return ["repairing"];
  if (status === "selesai") return ["done"];
  if (status === "gagal") return ["failed"];
  if (status === "history") return ["done", "failed"];

  return ["received", "repairing"];
}

export default async function TeknisiTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { tokoid } = await params;
  const query = await searchParams;
  const status = Array.isArray(query.status) ? query.status[0] : query.status;

  const statsResult = await getTechnicianTaskStats(tokoid);
  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : { tersedia: 0, repairing: 0, selesai: 0, gagal: 0, history: 0, total: 0 };

  const myTasksResult = await getMyTasks(tokoid, getMyTaskStatuses(status));
  const myTasks = myTasksResult.success ? myTasksResult.data || [] : [];

  const availableResult = status === "tersedia" ? await getAvailableTasks(tokoid) : null;
  const availableTasks = availableResult?.success ? availableResult.data || [] : [];

  return (
    <TeknisiTaskManager
      myTasks={myTasks}
      availableTasks={availableTasks}
      initialStats={stats}
      tokoId={tokoid}
    />
  );
}
