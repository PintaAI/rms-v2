import type { ServiceListItem, TechnicianTaskStats } from "@/actions/service";

export function mergeUniqueServices(services: ServiceListItem[]) {
  const serviceMap = new Map<string, ServiceListItem>();

  for (const service of services) {
    if (!serviceMap.has(service.id)) {
      serviceMap.set(service.id, service);
    }
  }

  return Array.from(serviceMap.values());
}

export function isAvailableTechnicianTask(service: ServiceListItem, userId?: string) {
  return (
    (service.status === "received" || service.status === "repairing") &&
    !service.isPickedUp &&
    service.technician?.id !== userId
  );
}

export function isMyTechnicianTask(service: ServiceListItem, userId?: string) {
  return Boolean(userId && service.technician?.id === userId);
}

export function deriveTechnicianTaskLists(services: ServiceListItem[], userId?: string) {
  return {
    availableTasks: services.filter((service) => isAvailableTechnicianTask(service, userId)),
    myTasks: services.filter((service) => isMyTechnicianTask(service, userId)),
  };
}

export function deriveTechnicianTaskStats(
  availableTasks: ServiceListItem[],
  myTasks: ServiceListItem[]
): TechnicianTaskStats {
  const activeMyTasks = myTasks.filter((service) => !service.isPickedUp);
  const repairing = activeMyTasks.filter((service) => service.status === "repairing").length;
  const selesai = activeMyTasks.filter((service) => service.status === "done").length;
  const gagal = activeMyTasks.filter((service) => service.status === "failed").length;

  return {
    tersedia: availableTasks.length,
    repairing,
    selesai,
    gagal,
    history: myTasks.filter((service) => service.status === "done" || service.status === "failed").length,
    total: myTasks.length,
  };
}
