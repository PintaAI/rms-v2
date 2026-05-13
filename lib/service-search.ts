import type { ServiceListItem } from "@/actions";
import { fuzzyScore } from "@/lib/fuzzy-search";

export function getServiceSearchScore(query: string, service: ServiceListItem): number | null {
  const targets = [
    service.id,
    service.customerName,
    service.noWa,
    service.complaint,
    service.handlingNote,
    service.imei,
    service.note,
    service.passwordPattern,
    service.hpCatalog?.brand?.name,
    service.hpCatalog?.modelName,
    `${service.hpCatalog?.brand?.name ?? ""} ${service.hpCatalog?.modelName ?? ""}`,
    service.technician?.name,
    service.createdBy?.name,
    service.invoice?.id,
    ...(service.includedItems ?? []),
  ].filter((target): target is string => Boolean(target));

  return targets.reduce<number | null>((bestScore, target) => {
    const score = fuzzyScore(query, target);
    if (score === null) return bestScore;
    return bestScore === null ? score : Math.max(bestScore, score);
  }, null);
}
