import prisma from "@/lib/prisma";
import { sendWhatsappText } from "@/lib/evolution";
import { isPlanAtLeast, normalizePlan, type FeatureKey } from "@/lib/features";
import { normalizeWhatsappNumber } from "@/lib/whatsapp-number";

const DEFAULT_DONE_MESSAGE =
  "Halo {customerName}, service perangkat {brand} {model} di {tokoName} sudah selesai. Silakan datang ke toko untuk pengambilan. Terima kasih.";

const DEFAULT_FAILED_MESSAGE =
  "Halo {customerName}, mohon maaf service perangkat {brand} {model} di {tokoName} belum berhasil diperbaiki. Silakan hubungi toko untuk info lebih lanjut.";

function renderTemplate(
  template: string,
  values: Record<"customerName" | "brand" | "model" | "tokoName" | "status", string>
) {
  return template.replace(/\{(customerName|brand|model|tokoName|status)\}/g, (_, key: keyof typeof values) => values[key]);
}

function hasWhatsappIntegrationAccess(input: {
  adminPlans: Array<string | null | undefined>;
  disabledFeatures: FeatureKey[];
}) {
  if (input.disabledFeatures.includes("whatsapp.integration")) return false;
  return input.adminPlans.some((plan) => isPlanAtLeast(normalizePlan(plan), "premium"));
}

export async function sendRepairOrderStatusWhatsappNotification(input: {
  repairOrderId: string;
  status: "done" | "failed";
}): Promise<void> {
  try {
    const service = await prisma.repairOrder.findUnique({
      where: { id: input.repairOrderId },
      select: {
        id: true,
        storeId: true,
        customerName: true,
        noWa: true,
        status: true,
        doneNotifiedAt: true,
        deviceModel: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
        store: {
          select: {
            name: true,
            featureSetting: { select: { disabledFeatures: true } },
            whatsappSetting: true,
            userAssignments: {
              where: { user: { role: "admin" } },
              select: { user: { select: { subscription: { select: { plan: true } } } } },
            },
          },
        },
      },
    });

    if (!service) return;
    if (service.status !== input.status) return;
    if (service.doneNotifiedAt) return;

    const setting = service.store.whatsappSetting;
    if (!setting) {
      return;
    }
    if (!hasWhatsappIntegrationAccess({
      adminPlans: service.store.userAssignments.map((assignment) => assignment.user.subscription?.plan),
      disabledFeatures: Array.isArray(service.store.featureSetting?.disabledFeatures)
        ? service.store.featureSetting.disabledFeatures.filter((feature): feature is FeatureKey => feature === "whatsapp.integration")
        : [],
    })) return;
    if (!setting.enabled) return;
    if (input.status === "done" && !setting.notifyDone) return;
    if (input.status === "failed" && !setting.notifyFailed) return;

    const number = normalizeWhatsappNumber(service.noWa);
    if (!number) {
      return;
    }

    const template =
      input.status === "done"
        ? setting.doneMessageTemplate || DEFAULT_DONE_MESSAGE
        : setting.failedMessageTemplate || DEFAULT_FAILED_MESSAGE;
    const text = renderTemplate(template, {
      customerName: service.customerName?.trim() || "Pelanggan",
      brand: service.deviceModel.brand.name || "",
      model: service.deviceModel.modelName || "",
      tokoName: service.store.name,
      status: input.status,
    }).replace(/\s+/g, " ").trim();

    await sendWhatsappText({ instanceName: setting.instanceName, number, text });

    await prisma.repairOrder.update({
      where: { id: service.id },
      data: { doneNotifiedAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to send WhatsApp service notification:", error);
  }
}
