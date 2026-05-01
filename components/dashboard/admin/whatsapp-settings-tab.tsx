"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  createOrConnectTokoWhatsapp,
  getTokoWhatsappSetting,
  refreshTokoWhatsappConnection,
  resetTokoWhatsappConnection,
  updateTokoWhatsappSetting,
  type TokoWhatsappSettingData,
} from "@/actions/whatsapp";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RiLoader4Line, RiLockLine, RiQrCodeLine, RiRefreshLine, RiWhatsappLine } from "@remixicon/react";

const DEFAULT_DONE_MESSAGE =
  "Halo {customerName}, service perangkat {brand} {model} di {tokoName} sudah selesai. Silakan datang ke toko untuk pengambilan. Terima kasih.";

const DEFAULT_FAILED_MESSAGE =
  "Halo {customerName}, mohon maaf service perangkat {brand} {model} di {tokoName} belum berhasil diperbaiki. Silakan hubungi toko untuk info lebih lanjut.";

interface WhatsappSettingsTabProps {
  tokoId: string;
}

function findQrValue(value: unknown): string | null {
  if (typeof value === "string") {
    if (value.length > 30 && (value.startsWith("data:image") || value.includes(",") || value.includes("@"))) return value;
    return null;
  }

  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  for (const key of ["base64", "qrcode", "qr", "code"] as const) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }

  for (const nested of Object.values(record)) {
    const found = findQrValue(nested);
    if (found) return found;
  }

  return null;
}

function getQrImageSource(value: string) {
  if (value.startsWith("data:image")) return value;

  const withoutWhitespace = value.replace(/\s/g, "");
  const isRawImageBase64 =
    withoutWhitespace.length > 100 &&
    withoutWhitespace.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+=*$/.test(withoutWhitespace) &&
    (withoutWhitespace.startsWith("iVBOR") || withoutWhitespace.startsWith("/9j/") || withoutWhitespace.startsWith("R0lG"));

  return isRawImageBase64 ? `data:image/png;base64,${withoutWhitespace}` : null;
}

function statusLabel(state: string | null | undefined) {
  if (state === "open") return "connected";
  if (state === "connecting") return "connecting";
  if (state === "close" || state === "closed") return "disconnected";
  return "unknown";
}

function statusVariant(state: string | null | undefined) {
  if (state === "open") return "success";
  if (state === "connecting") return "warning";
  return "outline";
}

export function WhatsappSettingsTab({ tokoId }: WhatsappSettingsTabProps) {
  const { user, tokoList } = useAuth();
  const currentToko = tokoList.find((t) => t.id === tokoId);
  const [setting, setSetting] = React.useState<TokoWhatsappSettingData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [qrData, setQrData] = React.useState<string | null>(null);
  const [hasQrResponse, setHasQrResponse] = React.useState(false);
  const [enabled, setEnabled] = React.useState(true);
  const [notifyDone, setNotifyDone] = React.useState(true);
  const [notifyFailed, setNotifyFailed] = React.useState(true);
  const [doneTemplate, setDoneTemplate] = React.useState(DEFAULT_DONE_MESSAGE);
  const [failedTemplate, setFailedTemplate] = React.useState(DEFAULT_FAILED_MESSAGE);

  const applySetting = React.useCallback((nextSetting: TokoWhatsappSettingData | null) => {
    setSetting(nextSetting);
    setEnabled(nextSetting?.enabled ?? true);
    setNotifyDone(nextSetting?.notifyDone ?? true);
    setNotifyFailed(nextSetting?.notifyFailed ?? true);
    setDoneTemplate(nextSetting?.doneMessageTemplate || DEFAULT_DONE_MESSAGE);
    setFailedTemplate(nextSetting?.failedMessageTemplate || DEFAULT_FAILED_MESSAGE);
  }, []);

  React.useEffect(() => {
    let active = true;

    getTokoWhatsappSetting(tokoId)
      .then((result) => {
        if (!active) return;
        if (result.success) {
          applySetting(result.data ?? null);
        } else {
          toast.error(result.error || "Gagal memuat pengaturan WhatsApp");
        }
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Gagal memuat pengaturan WhatsApp");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applySetting, tokoId]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setQrData(null);
    setHasQrResponse(false);
    const result = await createOrConnectTokoWhatsapp(tokoId);
    if (result.success && result.data) {
      applySetting(result.data.setting);
      const nextQrData = findQrValue(result.data.qr);
      setQrData(nextQrData);
      setHasQrResponse(true);
      if (nextQrData) {
        toast.success("QR WhatsApp siap dipindai");
      } else {
        toast.warning("QR belum tersedia. Coba muat ulang status atau sambungkan kembali.");
      }
    } else {
      toast.error(result.error || "Gagal menghubungkan WhatsApp");
    }
    setIsConnecting(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const result = await refreshTokoWhatsappConnection(tokoId);
    if (result.success && result.data) {
      applySetting(result.data);
      toast.success("Status WhatsApp diperbarui");
    } else {
      toast.error(result.error || "Gagal memperbarui status WhatsApp");
    }
    setIsRefreshing(false);
  };

  const handleResetConnection = async () => {
    setIsResetting(true);
    setQrData(null);
    setHasQrResponse(false);
    const result = await resetTokoWhatsappConnection(tokoId);
    if (result.success && result.data) {
      applySetting(result.data.setting);
      const nextQrData = findQrValue(result.data.qr);
      setQrData(nextQrData);
      setHasQrResponse(true);
      if (nextQrData) {
        toast.success("QR WhatsApp baru siap dipindai");
      } else {
        toast.warning("QR belum tersedia. Tunggu sebentar, lalu coba sambungkan kembali.");
      }
    } else {
      toast.error(result.error || "Gagal reset koneksi WhatsApp");
    }
    setIsResetting(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateTokoWhatsappSetting(tokoId, {
      enabled,
      notifyDone,
      notifyFailed,
      doneMessageTemplate: doneTemplate.trim() || null,
      failedMessageTemplate: failedTemplate.trim() || null,
    });
    if (result.success && result.data) {
      applySetting(result.data);
      toast.success("Pengaturan WhatsApp disimpan");
    } else {
      toast.error(result.error || "Gagal menyimpan pengaturan WhatsApp");
    }
    setIsSaving(false);
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <RiLockLine className="mb-4 size-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Only admins can manage WhatsApp settings.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const qrImageSource = qrData ? getQrImageSource(qrData) : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <RiWhatsappLine className="size-10 text-muted-foreground" />
              <div>
                <CardTitle>{setting?.tokoName ?? currentToko?.name ?? "Toko ini"}</CardTitle>
                <CardDescription>WhatsApp toko untuk notifikasi otomatis ke pelanggan.</CardDescription>
              </div>
            </div>
            <Badge variant={statusVariant(setting?.connectionState)}>{statusLabel(setting?.connectionState)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiQrCodeLine data-icon="inline-start" />}
              Connect WhatsApp
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || !setting}>
              {isRefreshing ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiRefreshLine data-icon="inline-start" />}
              Refresh Status
            </Button>
            <Button variant="outline" onClick={handleResetConnection} disabled={isResetting || isConnecting}>
              {isResetting ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiRefreshLine data-icon="inline-start" />}
              QR Baru
            </Button>
          </div>
          <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
            Buka WhatsApp di HP &gt; Perangkat tertaut &gt; Tautkan perangkat &gt; pindai QR ini.
          </div>
          {(qrData || hasQrResponse) && (
            <div className="flex flex-col items-center gap-3 rounded-lg border p-4 text-center">
              {qrImageSource ? (
                // Evolution returns QR as a data URL in some deployments.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrImageSource} alt="WhatsApp connection QR" className="size-48 rounded-md border bg-white p-2" />
              ) : qrData ? (
                <div className="rounded-md border bg-white p-3">
                  <QRCodeSVG value={qrData} size={180} marginSize={1} title="WhatsApp connection QR" />
                </div>
              ) : setting?.connectionState === "connecting" ? (
                <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                  WhatsApp sedang menyiapkan koneksi. Jika QR belum muncul, tunggu sebentar lalu klik QR Baru.
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                  QR belum tersedia. Klik Refresh Status atau Connect WhatsApp untuk mencoba lagi.
                </div>
              )}
              <p className="text-xs text-muted-foreground">QR ini untuk WhatsApp milik toko/admin, bukan WhatsApp pelanggan.</p>
            </div>
          )}
          {setting?.connectedNumber && (
            <p className="text-xs text-muted-foreground">Akun terhubung: {setting.connectedNumber}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aturan Notifikasi</CardTitle>
          <CardDescription>Pesan dikirim saat status service menjadi selesai atau gagal.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Aktifkan notifikasi WhatsApp</FieldTitle>
                <FieldDescription>Matikan untuk menahan semua notifikasi otomatis dari toko ini.</FieldDescription>
              </FieldContent>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Kirim saat service selesai</FieldTitle>
                <FieldDescription>Kirim pesan saat status service menjadi selesai.</FieldDescription>
              </FieldContent>
              <Switch checked={notifyDone} onCheckedChange={setNotifyDone} />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Kirim saat service gagal</FieldTitle>
                <FieldDescription>Kirim pesan saat status service menjadi gagal.</FieldDescription>
              </FieldContent>
              <Switch checked={notifyFailed} onCheckedChange={setNotifyFailed} />
            </Field>
            <Field>
              <FieldLabel htmlFor="done-message-template">Template pesan selesai</FieldLabel>
              <Textarea id="done-message-template" rows={4} value={doneTemplate} onChange={(event) => setDoneTemplate(event.target.value)} />
              <FieldDescription>Placeholder: {"{customerName}"}, {"{brand}"}, {"{model}"}, {"{tokoName}"}, {"{status}"}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="failed-message-template">Template pesan gagal</FieldLabel>
              <Textarea id="failed-message-template" rows={4} value={failedTemplate} onChange={(event) => setFailedTemplate(event.target.value)} />
              <FieldDescription>Gunakan pesan singkat dan jelas untuk pelanggan.</FieldDescription>
            </Field>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : null}
              Simpan Pengaturan WhatsApp
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
