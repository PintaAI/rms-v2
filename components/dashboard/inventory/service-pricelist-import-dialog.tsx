"use client";

import { useRef, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importServicePricelists, type ImportServicePricelistInput } from "@/actions/inventory";
import { RiDownload2Line, RiLoader4Line, RiUpload2Line } from "@remixicon/react";

const MAX_IMPORT_ROWS = 100;

type ParsedRow = ImportServicePricelistInput & {
  error?: string;
};

interface ServicePricelistImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokoId: string;
  onSuccess: () => void;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCell(row: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(row);
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const [key, value] of entries) {
    if (normalizedAliases.includes(normalizeHeader(key))) return value;
  }

  return undefined;
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return Number.NaN;

  const cleaned = value.trim().replace(/rp/gi, "").replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
  if (!cleaned) return Number.NaN;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN;
}

function parseWorksheetRows(rawRows: Record<string, unknown>[]) {
  const seenTitles = new Map<string, number>();

  return rawRows
    .map<ParsedRow | null>((row, index) => {
      const rowNumber = index + 2;
      const rawTitle = getCell(row, ["Judul", "Title", "Jasa", "Nama Jasa", "Service", "Layanan"]);
      const rawPrice = getCell(row, ["Harga", "Harga Default", "Harga Jasa", "Default Price", "defaultPrice"]);
      const title = typeof rawTitle === "string" ? rawTitle.trim() : String(rawTitle ?? "").trim();

      if (!title && (rawPrice === undefined || rawPrice === "")) return null;

      const defaultPrice = parseNumber(rawPrice);
      const normalizedTitle = title.toLowerCase();
      const duplicateRow = seenTitles.get(normalizedTitle);
      let error: string | undefined;

      if (!title) error = "Judul wajib diisi";
      else if (duplicateRow) error = `Judul duplikat dengan baris ${duplicateRow}`;
      else if (!Number.isInteger(defaultPrice) || defaultPrice < 0) error = "Harga harus angka 0 atau lebih";

      if (title && !duplicateRow) seenTitles.set(normalizedTitle, rowNumber);

      return {
        rowNumber,
        title,
        defaultPrice: Number.isFinite(defaultPrice) ? defaultPrice : 0,
        error,
      };
    })
    .filter((row): row is ParsedRow => row !== null);
}

export function ServicePricelistImportDialog({ open, onOpenChange, tokoId, onSuccess }: ServicePricelistImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const validRows = rows.filter((row) => !row.error);
  const invalidRows = rows.filter((row) => row.error);
  const canImport = validRows.length > 0 && invalidRows.length === 0 && !isParsing && !isImporting;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setFileName(file.name);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("File tidak memiliki sheet");

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
      const parsedRows = parseWorksheetRows(rawRows);

      if (parsedRows.length > MAX_IMPORT_ROWS) {
        setRows([
          ...parsedRows.slice(0, MAX_IMPORT_ROWS),
          {
            rowNumber: MAX_IMPORT_ROWS + 2,
            title: "",
            defaultPrice: 0,
            error: `Maksimal ${MAX_IMPORT_ROWS} baris per import`,
          },
        ]);
        return;
      }

      setRows(parsedRows);
      if (parsedRows.length === 0) toast.error("Tidak ada data jasa di file Excel");
    } catch (error) {
      setRows([]);
      toast.error(error instanceof Error ? error.message : "Gagal membaca file Excel");
    } finally {
      setIsParsing(false);
    }
  }

  function handleDownloadTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Judul", "Harga Default"],
      ["Ganti LCD", 150000],
      ["Servis Software", 75000],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jasa");
    XLSX.writeFile(workbook, "template-import-jasa.xlsx");
  }

  async function handleImport() {
    if (!canImport) return;

    setIsImporting(true);
    const result = await importServicePricelists({
      storeId: tokoId,
      rows: validRows.map((row) => ({
        rowNumber: row.rowNumber,
        title: row.title,
        defaultPrice: row.defaultPrice,
      })),
    });
    setIsImporting(false);

    if (!result.success || !result.data) {
      toast.error(result.error || "Gagal import jasa");
      return;
    }

    const { created, updated, failed } = result.data;
    toast.success(`Import selesai: ${created} dibuat, ${updated} diupdate, ${failed} gagal`);
    setRows([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onSuccess();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex size-8 items-center justify-center rounded-md bg-chart-1/10 text-chart-1">
              <RiUpload2Line className="size-4" />
            </span>
            Import Excel Jasa
          </DialogTitle>
          <DialogDescription>
            Import maksimal {MAX_IMPORT_ROWS} baris. Jika judul jasa sudah ada, harga default akan diupdate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            Format kolom: <span className="font-medium text-foreground">Judul</span> dan <span className="font-medium text-foreground">Harga Default</span>.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isParsing || isImporting}
            />
            <Button type="button" variant="outline" onClick={handleDownloadTemplate} disabled={isImporting}>
              <RiDownload2Line className="mr-1.5 size-4" />
              Template
            </Button>
          </div>

          {fileName && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">File:</span>
              <Badge variant="outline">{fileName}</Badge>
              <Badge variant={invalidRows.length > 0 ? "destructive" : "secondary"}>
                {validRows.length} valid, {invalidRows.length} error
              </Badge>
            </div>
          )}

          {isParsing ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border p-8 text-muted-foreground">
              <RiLoader4Line className="size-5 animate-spin" />
              Membaca file Excel...
            </div>
          ) : rows.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-16">Baris</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Harga Default</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell className="font-medium">{row.title || "-"}</TableCell>
                      <TableCell>{row.defaultPrice}</TableCell>
                      <TableCell>
                        {row.error ? (
                          <span className="text-destructive">{row.error}</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">Valid</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 10 && (
                <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Menampilkan 10 dari {rows.length} baris.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Batal
          </Button>
          <Button type="button" onClick={handleImport} disabled={!canImport}>
            {isImporting ? "Mengimport..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
