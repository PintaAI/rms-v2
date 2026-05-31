export function getServiceItemTypeLabel(type: string | null | undefined) {
  if (type === "inventory_item") return "Sparepart";
  if (type === "service_catalog_item") return "Jasa";
  return "Item";
}
