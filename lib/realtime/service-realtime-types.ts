import type { UserRole } from "@/lib/auth/request-user";

export type ServiceRealtimeAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "assigned"
  | "taken"
  | "picked_up"
  | "payment_updated"
  | "item_updated";

export type ServiceRealtimeEvent = {
  type: "service.changed";
  storeId: string;
  action: ServiceRealtimeAction;
  repairOrderId: string;
  serviceLabel?: string;
  serviceBrand?: string;
  actor?: {
    id: string;
    name: string;
    role: UserRole;
  };
  reason?: string;
  sentAt: number;
};

export type PublishServiceRealtimeEvent = Pick<
  ServiceRealtimeEvent,
  "action" | "repairOrderId" | "serviceLabel" | "serviceBrand" | "reason"
>;

export function isServiceRealtimeEvent(value: unknown): value is ServiceRealtimeEvent {
  if (!value || typeof value !== "object") return false;

  const event = value as Partial<ServiceRealtimeEvent>;
  return event.type === "service.changed"
    && typeof event.storeId === "string"
    && typeof event.action === "string"
    && typeof event.repairOrderId === "string"
    && typeof event.sentAt === "number";
}
