"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RiKey2Line } from "@remixicon/react";

export function McpSettingsCard() {
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
    <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <RiKey2Line className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">MCP Connector</h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Hubungkan RMS ke ChatGPT, Cursor, Claude, atau MCP client lain dengan OAuth. OAuth menentukan user dan permission; store_id hanya opsional kalau perlu memilih toko tertentu.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CopyBlock label="OAuth MCP connection URL" value={baseUrl ? endpoint : "Loading..."} />
        <CopyBlock label="Cursor / Claude .mcp.json" value={baseUrl ? mcpConfig : "Loading..."} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Multi-store optional override: <code className="rounded bg-muted px-1 py-0.5">{baseUrl ? scopedEndpointExample : "/api/mcp?store_id=<store_id>"}</code>
      </p>
    </section>
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
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={value === "Loading..."}>
          {copied ? "Tersalin" : "Salin"}
        </Button>
      </div>
      <pre className="max-h-56 overflow-auto rounded-xl bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  );
}
