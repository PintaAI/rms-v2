import type { ServiceListItem } from "@/actions/service";

export function getServiceRealtimeLabel(service?: Pick<ServiceListItem, "customerName" | "hpCatalog"> | null) {
  if (!service) return undefined;

  const deviceName = `${service.hpCatalog.brand.name} ${service.hpCatalog.modelName}`;
  return service.customerName ? `${service.customerName} - ${deviceName}` : deviceName;
}

export function getServiceRealtimeMeta(service?: Pick<ServiceListItem, "customerName" | "hpCatalog"> | null) {
  return {
    serviceLabel: getServiceRealtimeLabel(service),
    serviceBrand: service?.hpCatalog.brand.name,
  };
}
