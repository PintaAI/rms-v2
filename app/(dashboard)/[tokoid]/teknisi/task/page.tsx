import { getAvailableTasks, getMyTasks, getTechnicianTaskStats } from "@/actions/service";
import { TeknisiTaskManager } from "@/components/dashboard/services/teknisi-task-manager";
import type { ServiceStatus } from "@/prisma/generated/prisma/enums";

const ALL_TASK_STATUSES: ServiceStatus[] = ["received", "repairing", "done", "failed"];
const taskPageSize = 1000;

export default async function TeknisiTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ status?: string | string[]; q?: string | string[] }>;
}) {
  const { tokoid } = await params;
  const query = await searchParams;
  const status = Array.isArray(query.status) ? query.status[0] : query.status;
  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";

  const statsResult = await getTechnicianTaskStats(tokoid);
  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : { tersedia: 0, repairing: 0, selesai: 0, gagal: 0, history: 0, total: 0 };

  const [myTasksResult, availableResult] = await Promise.all([
    getMyTasks(tokoid, ALL_TASK_STATUSES, taskPageSize),
    getAvailableTasks(tokoid, taskPageSize),
  ]);
  const myTasks = myTasksResult.success ? myTasksResult.data || [] : [];
  const availableTasks = availableResult.success ? availableResult.data || [] : [];

  return (
    <TeknisiTaskManager
      key={`${status ?? "all"}-${initialSearchQuery}`}
      myTasks={myTasks}
      availableTasks={availableTasks}
      initialStats={stats}
      tokoId={tokoid}
      initialSearchQuery={initialSearchQuery}
    />
  );
}
