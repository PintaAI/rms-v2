"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RiRobotLine } from "@remixicon/react";

export function AiConnectorSettingsTab() {
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setBaseUrl(window.location.origin), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const endpoint = `${baseUrl}/api/mcp`;
  const scopedEndpointExample = `${baseUrl}/api/mcp?store_id=<store_id>`;
  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        rms: {
          url: endpoint,
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <RiRobotLine className="size-5 text-primary" />
          <p className="font-medium">AI Connector (MCP)</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Hubungkan RMS ke ChatGPT, Cursor, Claude, atau MCP client lain dengan OAuth. OAuth menentukan
          user dan permission; store_id hanya opsional kalau perlu memilih toko tertentu.
        </p>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <CopyBlock
          label="OAuth MCP connection URL"
          value={baseUrl ? endpoint : "Loading..."}
        />
        <CopyBlock
          label="Cursor / Claude .mcp.json"
          value={baseUrl ? mcpConfig : "Loading..."}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Multi-store optional override:{" "}
        <code className="rounded bg-muted px-1 py-0.5">
          {baseUrl ? scopedEndpointExample : "/api/mcp?store_id=<store_id>"}
        </code>
      </p>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-medium">Setup Guide</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Salin <span className="font-medium text-foreground">OAuth MCP connection URL</span> di atas.
          </li>
          <li>
            Buka MCP client pilihan Anda (ChatGPT, Cursor, Claude Desktop, dll) lalu tambahkan
            konfigurasi server baru. Untuk Cursor / Claude, gunakan blok{" "}
            <span className="font-medium text-foreground">.mcp.json</span> yang sudah disediakan.
          </li>
          <li>
            Saat pertama kali terhubung, client akan membuka halaman OAuth RMS. Login dengan akun admin
            yang punya permission <code className="rounded bg-muted px-1 py-0.5">service.view</code>{" "}
            (atau permission lain sesuai tools yang akan dipakai) lalu approve.
          </li>
          <li>
            Setelah approve, MCP client akan tersimpan di akun Anda. Semua request akan diautentikasi
            sebagai user yang login, dan scope OAuth menentukan read/write access.
          </li>
          <li>
            Untuk memilih toko tertentu, tambahkan query{" "}
            <code className="rounded bg-muted px-1 py-0.5">?store_id=&lt;id&gt;</code> ke URL. Kosongkan
            untuk menggunakan toko aktif dari sesi OAuth.
          </li>
          <li>
            Lepas koneksi dari sisi client kapan saja; token OAuth bisa di-revoke dari menu
            <span className="font-medium text-foreground"> Pengaturan → Password</span> atau dari
            halaman OAuth provider.
          </li>
        </ol>
      </div>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={value === "Loading..."}
        >
          {copied ? "Tersalin" : "Salin"}
        </Button>
      </div>
      <pre className="max-h-56 overflow-auto rounded-xl bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  );
}
