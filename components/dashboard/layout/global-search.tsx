"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  RiArchiveLine,
  RiDashboardLine,
  RiLoader4Line,
  RiPriceTag3Line,
  RiSearchLine,
  RiSettings3Line,
  RiToolsLine,
  RiUserSettingsLine,
} from "@remixicon/react";
import { searchDashboard, type GlobalSearchResult } from "@/actions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import { fuzzyScore } from "@/lib/fuzzy-search";

type SearchResultType = GlobalSearchResult["type"] | "menu" | "settings";

type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  keywords: string[];
};

const groupLabels: Record<SearchResultType, string> = {
  menu: "Menu",
  service: "Service",
  karyawan: "Karyawan",
  sparepart: "Sparepart",
  jasa: "Jasa",
  settings: "Settings",
};

const groupOrder: SearchResultType[] = ["menu", "service", "karyawan", "sparepart", "jasa", "settings"];

function roleSegment(role: string) {
  return role === "technician" ? "teknisi" : role;
}

function getSettingsHref(pathname: string, tab: string) {
  return `${pathname}?settings=${encodeURIComponent(tab)}`;
}

function getSearchScore(query: string, result: SearchResult) {
  const targets = [result.title, result.subtitle, ...result.keywords].filter((target): target is string => Boolean(target));

  return targets.reduce<number | null>((bestScore, target) => {
    const score = fuzzyScore(query, target);
    if (score === null) return bestScore;
    return bestScore === null ? score : Math.max(bestScore, score);
  }, null);
}

function filterStaticResults(query: string, results: SearchResult[]) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return results;

  return results
    .map((result) => ({ result, score: getSearchScore(trimmedQuery, result) }))
    .filter((entry): entry is { result: SearchResult; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.result);
}

function useStaticSearchResults(pathname: string): SearchResult[] {
  const { tokoId, user, featureAccess, capabilities, disabledFeatures } = useDashboardScope();
  const role = user.role;
  const segment = roleSegment(role);
  const serviceBase = `/${tokoId}/${segment}/${role === "technician" ? "task" : "service"}`;
  const inventoryBase = `/${tokoId}/${segment}/inventory`;

  return useMemo(() => {
    const items: SearchResult[] = [];
    const isFeatureDisabled = (feature: string) => disabledFeatures.some((disabledFeature) => disabledFeature === feature);
    const serviceSearchEnabled = role === "admin"
      ? capabilities["service.management"]
      : role === "staff"
        ? capabilities["service.management"] && featureAccess["staff.workflow"] === true && !isFeatureDisabled("staff.workflow")
        : role === "technician" && featureAccess["technician.workflow"] === true && !isFeatureDisabled("technician.workflow");
    const inventorySearchEnabled = featureAccess["inventory.management"] === true
      && !isFeatureDisabled("inventory.management")
      && (role === "admin"
        || (role === "staff" && featureAccess["staff.workflow"] === true && !isFeatureDisabled("staff.workflow"))
        || (role === "technician" && featureAccess["technician.workflow"] === true && !isFeatureDisabled("technician.workflow")));
    const addMenu = (id: string, title: string, href: string, keywords: string[] = [], subtitle = "Navigasi") => {
      items.push({ id, type: "menu", title, subtitle, href, keywords });
    };

    addMenu("overview", role === "admin" ? "Admin Overview" : role === "staff" ? "Staff Overview" : "Teknisi Overview", `/${tokoId}/${segment}`, ["dashboard", "overview"]);

    if (role === "admin") {
      if (featureAccess["analytics.revenue"] && !isFeatureDisabled("analytics.revenue")) {
        addMenu("analytics", "Analytics", `/${tokoId}/admin/analytics`, ["revenue", "laporan"]);
      }
      if (capabilities["toko.manage"]) addMenu("toko", "Toko", `/${tokoId}/admin/toko`, ["store", "profil toko"]);
    }

    if ((role === "admin" || role === "staff") && serviceSearchEnabled) {
      addMenu("service", "Service", serviceBase, ["semua service", "repair"]);
      addMenu("service-received", "Service Masuk", `${serviceBase}?status=received`, ["received", "masuk"]);
      addMenu("service-repairing", "Service Proses", `${serviceBase}?status=repairing`, ["repairing", "proses"]);
      addMenu("service-done", "Service Selesai & Gagal", `${serviceBase}?status=done,failed`, ["done", "failed", "selesai", "gagal"]);
      addMenu("service-picked-up", "Service Sudah Diambil", `${serviceBase}?pickedup=true`, ["picked up", "diambil"]);
    }

    if (role === "technician" && serviceSearchEnabled) {
      addMenu("task", "Task", serviceBase, ["semua task", "tugas"]);
      addMenu("task-available", "Task Tersedia", `${serviceBase}?status=tersedia`, ["available", "ambil task"]);
      addMenu("task-repairing", "Task Dikerjakan", `${serviceBase}?status=repairing`, ["repairing", "proses"]);
      addMenu("task-done", "Task Selesai", `${serviceBase}?status=selesai`, ["done", "selesai"]);
      addMenu("task-failed", "Task Gagal", `${serviceBase}?status=gagal`, ["failed", "gagal"]);
      addMenu("task-history", "Task History", `${serviceBase}?status=history`, ["riwayat"]);
    }

    if (role === "admin" && featureAccess["karyawan.management"] && !isFeatureDisabled("karyawan.management")) {
      addMenu("karyawan", "Karyawan", `/${tokoId}/admin/karyawan`, ["staff", "teknisi", "team"]);
    }

    if (inventorySearchEnabled) {
      addMenu("inventory", "Inventory", inventoryBase, ["sparepart", "stok"]);
      addMenu("sparepart", "Sparepart", role === "admin" ? `${inventoryBase}?tab=sparepart` : inventoryBase, ["inventory", "stok"]);
      if (role === "admin") addMenu("jasa", "Jasa", `${inventoryBase}?tab=jasa`, ["pricelist", "harga jasa"]);
    }

    if (role === "admin" && featureAccess["inventory.audit"] && !isFeatureDisabled("inventory.audit")) {
      addMenu("audit", "Audit Gudang", `/${tokoId}/admin/inventory/audit-gudang`, ["stok opname", "audit"]);
    }

    const settingsItems: Array<[string, string, string[]]> = [
      ["profile", "Profile", ["akun", "user"]],
      ["password", "Password", ["keamanan"]],
      ["appearance", "Tampilan", ["tema", "theme"]],
      ["billing", "Billing", ["tagihan", "subscription"]],
      ["premium", "Upgrade ke Pro", ["plan", "paket"]],
      ["affiliate", "Affiliate", ["referral"]],
    ];

    if (role === "admin") {
      settingsItems.splice(1, 0, ["features", "Pengaturan Fitur", ["feature", "fitur"]]);
      settingsItems.splice(2, 0, ["whatsapp", "WhatsApp", ["notifikasi", "wa"]]);
    }

    for (const [tab, title, keywords] of settingsItems) {
      items.push({ id: `settings-${tab}`, type: "settings", title, subtitle: "Settings", href: getSettingsHref(pathname, tab), keywords });
    }

    return items;
  }, [capabilities, disabledFeatures, featureAccess, inventoryBase, pathname, role, segment, serviceBase, tokoId]);
}

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { tokoId } = useDashboardScope();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dynamicResults, setDynamicResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const staticResults = useStaticSearchResults(pathname);
  const filteredStaticResults = useMemo(() => filterStaticResults(query, staticResults), [query, staticResults]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return;

    let active = true;
    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const result = await searchDashboard(tokoId, trimmedQuery);
        if (!active) return;
        setDynamicResults(result.success && result.data ? result.data : []);
      });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query, tokoId]);

  const activeDynamicResults = useMemo(() => query.trim().length < 2 ? [] : dynamicResults, [dynamicResults, query]);

  const groupedResults = useMemo(() => {
    const groups = new Map<SearchResultType, SearchResult[]>();
    for (const result of [...filteredStaticResults, ...activeDynamicResults]) {
      const existing = groups.get(result.type) ?? [];
      existing.push(result);
      groups.set(result.type, existing);
    }
    return groups;
  }, [activeDynamicResults, filteredStaticResults]);

  const totalResults = filteredStaticResults.length + activeDynamicResults.length;

  const navigateTo = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-8 min-w-0 justify-start gap-2 px-2 text-muted-foreground sm:w-56 sm:px-3"
        onClick={() => setOpen(true)}
      >
        <RiSearchLine className="size-4 shrink-0" />
        <span className="hidden truncate text-xs sm:inline">Cari menu, service...</span>
        <span className="sr-only sm:hidden">Cari</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground lg:inline-flex">
          {"⌘K"}
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Global Search" description="Cari menu dan data toko">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Cari menu, service, sparepart..." />
          <CommandList>
            {isPending && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <RiLoader4Line className="size-3.5 animate-spin" />
                Mencari data...
              </div>
            )}
            {!isPending && totalResults === 0 && <CommandEmpty>Tidak ada hasil.</CommandEmpty>}
            {groupOrder.map((type) => {
              const results = groupedResults.get(type);
              if (!results?.length) return null;

              return (
                <CommandGroup key={type} heading={groupLabels[type]}>
                  {results.map((result) => (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      value={`${result.type}-${result.id}`}
                      onSelect={() => navigateTo(result.href)}
                    >
                      <ResultIcon type={result.type} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{result.title}</div>
                        {result.subtitle && <div className="truncate text-muted-foreground">{result.subtitle}</div>}
                      </div>
                      <CommandShortcut>{groupLabels[result.type]}</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function ResultIcon({ type }: { type: SearchResultType }) {
  if (type === "service") return <RiToolsLine />;
  if (type === "karyawan") return <RiUserSettingsLine />;
  if (type === "sparepart") return <RiArchiveLine />;
  if (type === "jasa") return <RiPriceTag3Line />;
  if (type === "settings") return <RiSettings3Line />;
  return <RiDashboardLine />;
}
