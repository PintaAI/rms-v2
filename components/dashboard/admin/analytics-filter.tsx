"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { RiCalendarLine, RiFilter3Line } from "@remixicon/react";
import type { AdminAnalyticsFilters } from "@/actions/analytics";
import type { ServiceStatus } from "@/prisma/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StatusFilter = ServiceStatus | "all";

interface AnalyticsFilterProps {
  filters: AdminAnalyticsFilters;
}

interface FilterDraft {
  range: DateRange;
  status: StatusFilter;
  allTime: boolean;
}

interface PresetOption {
  key: string;
  label: string;
  allTime?: boolean;
  getRange: () => DateRange;
}

const statusLabels: Record<ServiceStatus, string> = {
  received: "Masuk",
  repairing: "Proses",
  done: "Selesai",
  failed: "Gagal",
};

const presetOptions: PresetOption[] = [
  {
    key: "all-time",
    label: "All time",
    allTime: true,
    getRange: () => ({}),
  },
  {
    key: "today",
    label: "Hari ini",
    getRange: () => ({ from: startOfToday(), to: startOfToday() }),
  },
  {
    key: "last-7-days",
    label: "7 hari",
    getRange: () => ({ from: addDays(startOfToday(), -6), to: startOfToday() }),
  },
  {
    key: "this-month",
    label: "Bulan ini",
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    key: "last-month",
    label: "Bulan lalu",
    getRange: () => {
      const previousMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      return { from: startOfMonth(previousMonth), to: endOfMonth(previousMonth) };
    },
  },
  {
    key: "last-3-months",
    label: "3 bulan",
    getRange: () => ({ from: startOfMonth(addMonths(new Date(), -2)), to: endOfMonth(new Date()) }),
  },
  {
    key: "this-year",
    label: "Tahun ini",
    getRange: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: startOfToday() }),
  },
];

export function AnalyticsFilter({ filters }: AnalyticsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const initialDraft = useMemo(() => getDraftFromFilters(filters), [filters]);
  const [draft, setDraft] = useState<FilterDraft>(initialDraft);
  const [calendarMonth, setCalendarMonth] = useState(() => initialDraft.range.from ?? new Date());

  useEffect(() => {
    if (!open) return;

    setDraft(initialDraft);
    setCalendarMonth(initialDraft.range.from ?? new Date());
  }, [initialDraft, open]);

  const activePreset = getActivePreset(draft);
  const canApply = draft.allTime || Boolean(draft.range.from && draft.range.to);
  const calendarKey = draft.allTime
    ? "all-time"
    : `${draft.range.from ? toDateKey(draft.range.from) : "open"}-${draft.range.to ? toDateKey(draft.range.to) : "open"}`;

  const applyFilters = () => {
    if (!canApply) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("month");

    if (draft.allTime) {
      params.delete("from");
      params.delete("to");
      params.set("allTime", "true");
    } else if (draft.range.from && draft.range.to) {
      params.delete("allTime");
      params.set("from", toDateKey(draft.range.from));
      params.set("to", toDateKey(draft.range.to));
    }

    if (draft.status === "all") {
      params.delete("status");
    } else {
      params.set("status", draft.status);
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
      setOpen(false);
    });
  };

  const selectPreset = (preset: PresetOption) => {
    const range = preset.getRange();

    setDraft((current) => ({
      range,
      status: current.status,
      allTime: Boolean(preset.allTime),
    }));

    if (range.from) setCalendarMonth(range.from);
  };

  const resetDraft = () => {
    const range = presetOptions.find((preset) => preset.key === "this-month")?.getRange() ?? {};

    setDraft({
      range,
      status: "all",
      allTime: false,
    });

    if (range.from) setCalendarMonth(range.from);
  };

  const selectRangeDate = (date: Date) => {
    setDraft((current) => {
      if (!current.range.from || current.range.to || current.allTime) {
        if (current.range.from && current.range.to && !current.allTime) {
          return { ...current, range: moveNearestRangeEdge(current.range.from, current.range.to, date) };
        }

        return { ...current, allTime: false, range: { from: date } };
      }

      if (date < current.range.from) {
        return { ...current, range: { from: date, to: current.range.from } };
      }

      return { ...current, range: { from: current.range.from, to: date } };
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <RiFilter3Line data-icon="inline-start" />
          Filter Periode
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto gap-4 p-4">
        <PopoverHeader>
          <PopoverTitle>Filter Analytics</PopoverTitle>
          <PopoverDescription>Pilih preset, custom range, dan status service.</PopoverDescription>
        </PopoverHeader>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <RiCalendarLine className="size-3" />
              Preset periode
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {presetOptions.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  variant={activePreset === preset.key ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => selectPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Custom range</p>
              <p className="text-xs text-muted-foreground">Klik tanggal mulai, lalu tanggal akhir.</p>
            </div>
            <div className="flex justify-center">
              <Calendar
                key={calendarKey}
                mode="range"
                selected={draft.allTime ? undefined : draft.range}
                onDayClick={selectRangeDate}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                numberOfMonths={1}
              />
            </div>
            <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {getRangeLabel(draft)}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status service</p>
            <Select
              value={draft.status}
              onValueChange={(value) => setDraft((current) => ({ ...current, status: value as StatusFilter }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua status</SelectItem>
                  {(Object.keys(statusLabels) as ServiceStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={resetDraft} disabled={isPending}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="button" onClick={applyFilters} disabled={isPending || !canApply}>
              Terapkan
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getDraftFromFilters(filters: AdminAnalyticsFilters): FilterDraft {
  return {
    range: { from: parseDateKey(filters.from), to: parseDateKey(filters.to) },
    status: filters.status ?? "all",
    allTime: Boolean(filters.allTime),
  };
}

function getActivePreset(draft: FilterDraft) {
  if (draft.allTime) return "all-time";
  if (!draft.range.from || !draft.range.to) return null;

  return presetOptions.find((preset) => {
    if (preset.allTime) return false;
    const range = preset.getRange();
    return range.from && range.to && sameDay(range.from, draft.range.from!) && sameDay(range.to, draft.range.to!);
  })?.key ?? null;
}

function getRangeLabel(draft: FilterDraft) {
  if (draft.allTime) return "Semua data dari awal toko.";
  if (draft.range.from && draft.range.to) return `${formatDate(draft.range.from)} - ${formatDate(draft.range.to)}`;
  if (draft.range.from) return `${formatDate(draft.range.from)} - pilih tanggal akhir`;
  return "Pilih tanggal mulai dan akhir.";
}

function moveNearestRangeEdge(from: Date, to: Date, date: Date): DateRange {
  if (date <= from) return { from: date, to };
  if (date >= to) return { from, to: date };

  const distanceToFrom = Math.abs(date.getTime() - from.getTime());
  const distanceToTo = Math.abs(to.getTime() - date.getTime());

  if (distanceToFrom <= distanceToTo) return { from: date, to };
  return { from, to: date };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
