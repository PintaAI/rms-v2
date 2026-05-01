import prisma from "@/lib/prisma";
import { sendWhatsappText } from "@/lib/evolution";

const DEFAULT_DONE_MESSAGE =
  "Halo {customerName}, service perangkat {brand} {model} di {tokoName} sudah selesai. Silakan datang ke toko untuk pengambilan. Terima kasih.";

const DEFAULT_FAILED_MESSAGE =
  "Halo {customerName}, mohon maaf service perangkat {brand} {model} di {tokoName} belum berhasil diperbaiki. Silakan hubungi toko untuk info lebih lanjut.";

function normalizeWhatsappNumber(value: string) {
  return value.replace(/\D/g, "").replace(/^0/, "62");
}

function renderTemplate(
  template: string,
  values: Record<"customerName" | "brand" | "model" | "tokoName" | "status", string>
) {
  return template.replace(/\{(customerName|brand|model|tokoName|status)\}/g, (_, key: keyof typeof values) => values[key]);
}

export async function sendServiceStatusWhatsappNotification(input: {
  serviceId: string;
  status: "done" | "failed";
}): Promise<void> {
  try {
    const service = await prisma.service.findUnique({
      where: { id: input.serviceId },
      select: {
        id: true,
        tokoId: true,
        customerName: true,
        noWa: true,
        status: true,
        doneNotifiedAt: true,
        hpCatalog: {
          select: {
            modelName: true,
            brand: { select: { name: true } },
          },
        },
        toko: {
          select: {
            name: true,
            whatsappSetting: true,
          },
        },
      },
    });

    if (!service) return;
    if (service.status !== input.status) return;
    if (service.doneNotifiedAt) return;

    const setting = service.toko.whatsappSetting;
    if (!setting) {
      console.info("WhatsApp notification skipped: missing toko setting", { serviceId: service.id, tokoId: service.tokoId });
      return;
    }
    if (!setting.enabled) return;
    if (setting.connectionState !== "open") {
      console.info("WhatsApp notification skipped: instance is not connected", {
        serviceId: service.id,
        tokoId: service.tokoId,
        connectionState: setting.connectionState,
      });
      return;
    }
    if (input.status === "done" && !setting.notifyDone) return;
    if (input.status === "failed" && !setting.notifyFailed) return;

    const number = normalizeWhatsappNumber(service.noWa);
    if (!number) {
      console.info("WhatsApp notification skipped: invalid customer number", { serviceId: service.id });
      return;
    }

    const template =
      input.status === "done"
        ? setting.doneMessageTemplate || DEFAULT_DONE_MESSAGE
        : setting.failedMessageTemplate || DEFAULT_FAILED_MESSAGE;
    const text = renderTemplate(template, {
      customerName: service.customerName?.trim() || "Pelanggan",
      brand: service.hpCatalog.brand.name || "",
      model: service.hpCatalog.modelName || "",
      tokoName: service.toko.name,
      status: input.status,
    }).replace(/\s+/g, " ").trim();

    await sendWhatsappText({ instanceName: setting.instanceName, number, text });

    await prisma.service.update({
      where: { id: service.id },
      data: { doneNotifiedAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to send WhatsApp service notification:", error);
  }
}
