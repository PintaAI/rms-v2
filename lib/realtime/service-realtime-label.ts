import type { ServiceListItem } from "@/actions/service";

export function getServiceRealtimeLabel(service?: Pick<ServiceListItem, "customerName" | "deviceModel"> | null) {
  if (!service) return undefined;

  const deviceName = `${service.deviceModel.brand.name} ${service.deviceModel.modelName}`;
  return service.customerName ? `${service.customerName} - ${deviceName}` : deviceName;
}

export function getServiceRealtimeMeta(service?: Pick<ServiceListItem, "customerName" | "deviceModel"> | null) {
  return {
    serviceLabel: getServiceRealtimeLabel(service),
    serviceBrand: service?.deviceModel.brand.name,
  };
}
