"use client";

import { useRef, useState } from "react";
import bwipjs from "bwip-js/browser";
import { useReactToPrint } from "react-to-print";
import { RiPrinterLine } from "@remixicon/react";

import type { SparepartWithCompatibilities } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface SparepartLabelPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sparepart: SparepartWithCompatibilities | null;
}

const printPageStyle = `
  @page {
    size: A4;
    margin: 10mm;
  }

  @media print {
    html, body {
      width: 190mm;
      height: auto;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    .sparepart-label-print-batch {
      display: block !important;
    }

    .sparepart-label-print-page {
      display: grid !important;
      grid-template-columns: repeat(3, 60mm) !important;
      grid-auto-rows: 30mm !important;
      gap: 5mm !important;
      align-items: start !important;
      justify-content: start !important;
      width: 190mm !important;
      break-after: page;
      page-break-after: always;
    }

    .sparepart-label-print-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    .sparepart-label-print-root {
      margin: 0 !important;
      box-shadow: none !important;
      border: 0 !important;
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;

export function SparepartLabelPrintDialog({
  open,
  onOpenChange,
  sparepart,
}: SparepartLabelPrintDialogProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const [labelCount, setLabelCount] = useState("");
  const effectiveLabelCount = labelCount === "" ? 0 : Number(labelCount);
  let barcodeSvg = "";
  let qrSvg = "";

  if (sparepart) {
    try {
      barcodeSvg = bwipjs.toSVG({
        bcid: "code128",
        text: sparepart.barcode,
        height: 10,
        includetext: false,
        backgroundcolor: "FFFFFF",
      });

      qrSvg = bwipjs.toSVG({
        bcid: "qrcode",
        text: sparepart.barcode,
        scale: 3,
        backgroundcolor: "FFFFFF",
      });
    } catch (error) {
      console.error("Failed to render sparepart label barcode", error);
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: labelRef,
    documentTitle: sparepart ? `label-${sparepart.name}` : "sparepart-label",
    pageStyle: printPageStyle,
  });

  const handleLabelCountChange = (value: string) => {
    if (value === "") {
      setLabelCount("");
      return;
    }

    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;

    setLabelCount(String(Math.min(100, Math.max(0, Math.trunc(nextValue)))));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RiPrinterLine className="h-4 w-4" />
            </span>
            Cetak Label Sparepart
          </DialogTitle>
          <DialogDescription>
            Mencetak label Code128 pendek untuk scanner hardware dan HP.
          </DialogDescription>
        </DialogHeader>

        {sparepart && (
          <div className="max-h-[260px] overflow-auto rounded-lg border bg-muted/30 p-4">
            <div ref={labelRef} className="sparepart-label-print-batch flex flex-col items-center gap-3">
              {Array.from({ length: Math.ceil(effectiveLabelCount / 21) }, (_, pageIndex) => (
                <div
                  key={pageIndex}
                  className="sparepart-label-print-page grid grid-cols-1 justify-items-center gap-3"
                >
                  {Array.from({ length: Math.min(21, effectiveLabelCount - pageIndex * 21) }, (_, itemIndex) => {
                    const labelIndex = pageIndex * 21 + itemIndex;

                    return (
                      <div
                        key={labelIndex}
                        className="sparepart-label-print-root flex h-[30mm] w-[60mm] flex-col rounded-sm border bg-white px-[3mm] py-[2mm] text-black shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[9px] font-bold uppercase leading-tight">{sparepart.name}</div>
                          <div className="mt-0.5 text-[7px] font-semibold leading-none tracking-wide text-black/80">
                            {sparepart.barcode}
                          </div>
                        </div>
                        <div className="mt-[2mm] flex flex-1 items-center gap-[2mm] overflow-hidden">
                          {barcodeSvg ? (
                            <div
                              className="h-[13mm] min-w-0 flex-1 [&_svg]:h-full [&_svg]:w-full"
                              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                            />
                          ) : (
                            <div className="text-[7px] font-medium text-black/70">Barcode tidak tersedia</div>
                          )}
                          {qrSvg && (
                            <div
                              className="size-[12mm] shrink-0 [&_svg]:size-full"
                              dangerouslySetInnerHTML={{ __html: qrSvg }}
                            />
                          )}
                        </div>
                        <div className="mt-[1mm] text-right text-[6px] font-medium uppercase tracking-wide text-black/70">
                          RMS Inventory
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter showCloseButton className="sm:items-center">
          <Field orientation="horizontal" className="w-auto items-center gap-2">
            <FieldLabel htmlFor="sparepart-label-count" className="whitespace-nowrap">
              Jumlah label
            </FieldLabel>
              <Input
                id="sparepart-label-count"
                type="number"
                min={0}
                max={100}
                value={labelCount}
                onChange={(event) => handleLabelCountChange(event.target.value)}
                className="w-20"
              />
            </Field>
          <Button onClick={handlePrint} disabled={!sparepart || effectiveLabelCount < 1}>
            <RiPrinterLine data-icon="inline-start" />
            Cetak {effectiveLabelCount} Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
