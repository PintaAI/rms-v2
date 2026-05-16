"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  connectTokoWhatsapp,
  disconnectTokoWhatsapp,
  getTokoWhatsappSetting,
  getWhatsappState,
  refreshTokoWhatsappConnection,
  updateTokoWhatsappSetting,
  type TokoWhatsappSettingData,
  type WhatsappLiveState,
} from "@/actions/whatsapp";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RiCheckboxCircleLine, RiCloseCircleLine, RiLinkUnlinkM, RiLoader4Line, RiLockLine, RiQrCodeLine, RiQuestionLine, RiRefreshLine, RiWhatsappLine } from "@remixicon/react";

const DEFAULT_DONE_MESSAGE =
  "Halo {customerName}, service perangkat {brand} {model} di {tokoName} sudah selesai. Silakan datang ke toko untuk pengambilan. Terima kasih.";

const DEFAULT_FAILED_MESSAGE =
  "Halo {customerName}, mohon maaf service perangkat {brand} {model} di {tokoName} belum berhasil diperbaiki. Silakan hubungi toko untuk info lebih lanjut.";

const MESSAGE_VARIABLES = [
  { label: "Nama pelanggan", display: "[Nama pelanggan]", token: "{customerName}", example: "Budi" },
  { label: "Perangkat", display: "[Perangkat]", token: "{brand} {model}", example: "Samsung A52" },
  { label: "Nama toko", display: "[Nama toko]", token: "{tokoName}", example: "RMS Phone" },
  { label: "Status service", display: "[Status service]", token: "{status}", example: "Selesai" },
] as const;

interface TemplateTokenEditorProps {
  id: string;
  label: string;
  subtitle: string;
  value: string;
  previewValues?: Partial<Record<(typeof MESSAGE_VARIABLES)[number]["token"], string>>;
  onChange: (value: string) => void;
  onReset: () => void;
  disabled?: boolean;
}

interface WhatsappSettingsTabProps {
  tokoId: string;
  canManageSettings?: boolean;
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
  if (state === "close" || state === "closed") return "destructive";
  return "outline";
}

function statusIcon(state: string | null | undefined) {
  if (state === "open") return <RiCheckboxCircleLine data-icon="inline-start" />;
  if (state === "connecting") return <RiLoader4Line data-icon="inline-start" className="animate-spin" />;
  if (state === "close" || state === "closed") return <RiCloseCircleLine data-icon="inline-start" />;
  return <RiQuestionLine data-icon="inline-start" />;
}

function toDisplayTemplate(template: string) {
  return MESSAGE_VARIABLES.reduce((message, variable) => message.replaceAll(variable.token, variable.display), template);
}

function toSavedTemplate(template: string) {
  return MESSAGE_VARIABLES.reduce((message, variable) => message.replaceAll(variable.display, variable.token), template);
}

function buildTemplatePreview(template: string, previewValues: TemplateTokenEditorProps["previewValues"] = {}) {
  return MESSAGE_VARIABLES.reduce(
    (message, variable) => {
      const value = previewValues[variable.token] || variable.example;

      return message.replaceAll(variable.display, value).replaceAll(variable.token, value);
    },
    template.trim() || "Tulis template pesan terlebih dahulu.",
  );
}

function renderTemplatePreview(template: string, previewValues?: TemplateTokenEditorProps["previewValues"]) {
  const preview = buildTemplatePreview(template, previewValues);
  const examples = MESSAGE_VARIABLES.map((variable) => previewValues?.[variable.token] || variable.example);
  const pattern = new RegExp(`(${examples.map((example) => example.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts = preview.split(pattern).filter(Boolean);

  return parts.map((part, index) => {
    const isVariableValue = examples.includes(part);

    return isVariableValue ? (
      <span key={`${part}-${index}`} className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
        {part}
      </span>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    );
  });
}

function renderHighlightedTemplate(template: string) {
  const parts: React.ReactNode[] = [];
  let remaining = template;
  let index = 0;

  while (remaining.length > 0) {
    const nextVariable = MESSAGE_VARIABLES.map((variable) => ({ ...variable, index: remaining.indexOf(variable.display) }))
      .filter((variable) => variable.index >= 0)
      .sort((a, b) => a.index - b.index)[0];

    if (!nextVariable) {
      parts.push(<React.Fragment key={`text-${index}`}>{remaining}</React.Fragment>);
      break;
    }

    if (nextVariable.index > 0) {
      parts.push(<React.Fragment key={`text-${index}`}>{remaining.slice(0, nextVariable.index)}</React.Fragment>);
      index += 1;
    }

    parts.push(
      <span key={`variable-${index}`} className="rounded-sm bg-primary/10 text-primary">
        {nextVariable.display}
      </span>,
    );
    index += 1;
    remaining = remaining.slice(nextVariable.index + nextVariable.display.length);
  }

  return parts.length > 0 ? parts : " ";
}

function TemplateTokenEditor({ id, label, subtitle, value, previewValues, onChange, onReset, disabled = false }: TemplateTokenEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const highlightRef = React.useRef<HTMLDivElement>(null);

  const insertVariable = (display: string) => {
    if (disabled) return;

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const prefix = value.slice(0, start);
    const suffix = value.slice(end);
    const needsLeadingSpace = prefix.length > 0 && !/\s$/.test(prefix);
    const needsTrailingSpace = suffix.length === 0 || !/^\s/.test(suffix);
    const insertion = `${needsLeadingSpace ? " " : ""}${display}${needsTrailingSpace ? " " : ""}`;
    const nextValue = `${prefix}${insertion}${suffix}`;
    const cursorPosition = prefix.length + insertion.length;

    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const syncHighlightScroll = () => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;

    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Backspace") return;
    if (disabled) return;

    const textarea = event.currentTarget;
    const cursor = textarea.selectionStart;
    if (cursor !== textarea.selectionEnd) return;

    const variableBeforeCursor = MESSAGE_VARIABLES.find((variable) => value.slice(0, cursor).endsWith(variable.display));
    if (!variableBeforeCursor) return;

    event.preventDefault();
    const start = cursor - variableBeforeCursor.display.length;
    const nextValue = `${value.slice(0, start)}${value.slice(cursor)}`;

    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.setSelectionRange(start, start);
    });
  };

  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <FieldDescription>{subtitle}</FieldDescription>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onReset} disabled={disabled}>
          Reset ke default
        </Button>
      </div>
      <div className="relative min-h-28">
        <div
          ref={highlightRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-3 py-2 text-sm whitespace-pre-wrap text-foreground"
        >
          {renderHighlightedTemplate(value)}
        </div>
        <Textarea
          ref={textareaRef}
          id={id}
          rows={4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncHighlightScroll}
          disabled={disabled}
          className="relative min-h-28 resize-y bg-transparent text-transparent caret-foreground selection:bg-primary/20"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {MESSAGE_VARIABLES.map((variable) => (
          <Button key={`${id}-${variable.display}`} type="button" variant="outline" size="sm" onClick={() => insertVariable(variable.display)} disabled={disabled}>
            {variable.label}
          </Button>
        ))}
      </div>
      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        <p className="font-medium">Contoh hasil pesan</p>
        <p className="mt-1 text-muted-foreground">{renderTemplatePreview(value, previewValues)}</p>
      </div>
    </Field>
  );
}

export function WhatsappSettingsTab({ tokoId, canManageSettings = true }: WhatsappSettingsTabProps) {
  const { tokoList } = useAuth();
  const currentToko = tokoList.find((t) => t.id === tokoId);
  const [setting, setSetting] = React.useState<TokoWhatsappSettingData | null>(null);
  const [liveState, setLiveState] = React.useState<WhatsappLiveState | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [qrData, setQrData] = React.useState<string | null>(null);
  const [hasQrResponse, setHasQrResponse] = React.useState(false);
  const [enabled, setEnabled] = React.useState(true);
  const [notifyDone, setNotifyDone] = React.useState(true);
  const [notifyFailed, setNotifyFailed] = React.useState(true);
  const [doneTemplate, setDoneTemplate] = React.useState(toDisplayTemplate(DEFAULT_DONE_MESSAGE));
  const [failedTemplate, setFailedTemplate] = React.useState(toDisplayTemplate(DEFAULT_FAILED_MESSAGE));

  const applySetting = React.useCallback((nextSetting: TokoWhatsappSettingData | null) => {
    const isWhatsappEnabled = nextSetting?.enabled ?? true;

    setSetting(nextSetting);
    setEnabled(isWhatsappEnabled);
    setNotifyDone(isWhatsappEnabled ? (nextSetting?.notifyDone ?? true) : false);
    setNotifyFailed(isWhatsappEnabled ? (nextSetting?.notifyFailed ?? true) : false);
    setDoneTemplate(toDisplayTemplate(nextSetting?.doneMessageTemplate || DEFAULT_DONE_MESSAGE));
    setFailedTemplate(toDisplayTemplate(nextSetting?.failedMessageTemplate || DEFAULT_FAILED_MESSAGE));
  }, []);

  React.useEffect(() => {
    let active = true;

    Promise.all([
      getTokoWhatsappSetting(tokoId),
      getWhatsappState(tokoId),
    ])
      .then(([settingResult, stateResult]) => {
        if (!active) return;
        if (settingResult.success) {
          applySetting(settingResult.data ?? null);
        }
        if (stateResult.success) {
          setLiveState(stateResult.data ?? null);
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

  React.useEffect(() => {
    if (!hasQrResponse || liveState?.state === "open") return;

    const interval = setInterval(async () => {
      const result = await refreshTokoWhatsappConnection(tokoId);
      if (result.success && result.data) {
        setLiveState(result.data);
        if (result.data.state === "open") {
          const updated = await getTokoWhatsappSetting(tokoId);
          if (updated.success) {
            applySetting(updated.data ?? null);
          }
          setQrData(null);
          setHasQrResponse(false);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [hasQrResponse, liveState?.state, tokoId, applySetting]);

  const handleConnect = async () => {
    if (!canManageSettings) return;

    setIsConnecting(true);
    setQrData(null);
    setHasQrResponse(false);
    const result = await connectTokoWhatsapp(tokoId);
    if (result.success && result.data) {
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

  const handleResetConnection = async () => {
    if (!canManageSettings) return;

    setIsConnecting(true);
    setQrData(null);
    setHasQrResponse(false);
    const result = await connectTokoWhatsapp(tokoId);
    if (result.success && result.data) {
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
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    if (!canManageSettings) return;

    if (!window.confirm("Yakin ingin memutuskan koneksi WhatsApp?\n\nPerangkat akan dilepas dari WhatsApp toko dan perlu menyambungkan ulang dengan QR.")) return;

    setIsDisconnecting(true);
    const result = await disconnectTokoWhatsapp(tokoId);
    if (result.success && result.data) {
      applySetting(result.data);
      setLiveState({ state: "close", connectedNumber: null, connectedProfileName: null });
      setQrData(null);
      setHasQrResponse(false);
      toast.success("Koneksi WhatsApp diputuskan");
    } else {
      toast.error(result.error || "Gagal memutuskan koneksi WhatsApp");
    }
    setIsDisconnecting(false);
  };

  const handleSave = async () => {
    if (!canManageSettings) return;

    setIsSaving(true);
    const result = await updateTokoWhatsappSetting(tokoId, {
      enabled,
      notifyDone,
      notifyFailed,
      doneMessageTemplate: doneTemplate.trim() ? toSavedTemplate(doneTemplate.trim()) : null,
      failedMessageTemplate: failedTemplate.trim() ? toSavedTemplate(failedTemplate.trim()) : null,
    });
    if (result.success && result.data) {
      applySetting(result.data);
      toast.success("Pengaturan WhatsApp disimpan");
    } else {
      toast.error(result.error || "Gagal menyimpan pengaturan WhatsApp");
    }
    setIsSaving(false);
  };

  const handleEnabledChange = (checked: boolean) => {
    if (!canManageSettings) return;

    setEnabled(checked);
    if (!checked) {
      setNotifyDone(false);
      setNotifyFailed(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const qrImageSource = qrData ? getQrImageSource(qrData) : null;
  const currentState = liveState?.state ?? null;
  const tokoName = setting?.tokoName ?? currentToko?.name ?? "Toko ini";
  const templatePreviewValues = { "{tokoName}": tokoName };

  return (
    <div className="flex flex-col pt-2 gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RiWhatsappLine className="size-10 text-muted-foreground shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{tokoName}</CardTitle>
                  <Badge variant={statusVariant(currentState)}>
                    {statusIcon(currentState)}
                    {statusLabel(currentState)}
                  </Badge>
                </div>
                <CardDescription>
                  {currentState === "open" && setting?.connectedNumber
                    ? <>Terhubung sebagai{" "}
                      <a
                        href={`https://wa.me/${setting.connectedNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-2 hover:text-foreground"
                      >
                        {setting.connectedProfileName ?? "?"} (+{setting.connectedNumber})
                      </a>
                    </>
                    : "WhatsApp toko untuk notifikasi otomatis ke pelanggan."}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {currentState !== "open" && (
                <Button size="sm" onClick={handleConnect} disabled={isConnecting || !canManageSettings}>
                  {isConnecting ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiQrCodeLine data-icon="inline-start" />}
                  Connect
                </Button>
              )}
              {currentState && currentState !== "close" && currentState !== "closed" && currentState !== "open" && (
                <Button size="sm" variant="outline" onClick={handleResetConnection} disabled={isConnecting || !canManageSettings}>
                  {isConnecting ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiRefreshLine data-icon="inline-start" />}
                  QR Baru
                </Button>
              )}
              {currentState === "open" && (
                <Button size="sm" variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting || !canManageSettings}>
                  {isDisconnecting ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiLinkUnlinkM data-icon="inline-start" />}
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {(currentState !== "open" || qrData || hasQrResponse) && (
          <CardContent className="flex flex-col gap-4">
            {currentState !== "open" && (
              <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                Buka WhatsApp di HP &gt; Perangkat tertaut &gt; Tautkan perangkat &gt; pindai QR ini.
              </div>
            )}
            {(qrData || hasQrResponse) && (
            <div className="flex flex-col items-center gap-3 rounded-lg border p-4 text-center">
              {qrImageSource ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrImageSource} alt="WhatsApp connection QR" className="size-48 rounded-md border bg-white p-2" />
              ) : qrData ? (
                <div className="rounded-md border bg-white p-3">
                  <QRCodeSVG value={qrData} size={180} marginSize={1} title="WhatsApp connection QR" />
                </div>
              ) : currentState === "connecting" ? (
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
          )}  {/* end QR display */}
          </CardContent>
        )}  {/* end CardContent conditional */}
      </Card>

      {!canManageSettings && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <RiLockLine className="mt-0.5 size-4 shrink-0" />
          <p>Mode lihat saja. Anda dapat melihat status WhatsApp, tetapi tidak dapat mengubah koneksi atau template.</p>
        </div>
      )}

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
              <Switch checked={enabled} onCheckedChange={handleEnabledChange} disabled={!canManageSettings} />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Kirim saat service selesai</FieldTitle>
                <FieldDescription>Kirim pesan saat status service menjadi selesai.</FieldDescription>
              </FieldContent>
              <Switch checked={notifyDone} onCheckedChange={setNotifyDone} disabled={!enabled || !canManageSettings} />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Kirim saat service gagal</FieldTitle>
                <FieldDescription>Kirim pesan saat status service menjadi gagal.</FieldDescription>
              </FieldContent>
              <Switch checked={notifyFailed} onCheckedChange={setNotifyFailed} disabled={!enabled || !canManageSettings} />
            </Field>
            <TemplateTokenEditor
              id="done-message-template"
              label="Template pesan selesai"
              subtitle="Dikirim saat service selesai."
              value={doneTemplate}
              previewValues={templatePreviewValues}
              onChange={setDoneTemplate}
              onReset={() => setDoneTemplate(toDisplayTemplate(DEFAULT_DONE_MESSAGE))}
              disabled={!canManageSettings}
            />
            <TemplateTokenEditor
              id="failed-message-template"
              label="Template pesan gagal"
              subtitle="Dikirim saat service gagal."
              value={failedTemplate}
              previewValues={templatePreviewValues}
              onChange={setFailedTemplate}
              onReset={() => setFailedTemplate(toDisplayTemplate(DEFAULT_FAILED_MESSAGE))}
              disabled={!canManageSettings}
            />
            <Button onClick={handleSave} disabled={isSaving || !canManageSettings}>
              {isSaving ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : null}
              Simpan Pengaturan WhatsApp
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
