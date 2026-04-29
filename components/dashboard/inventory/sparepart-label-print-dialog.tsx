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
    size: 60mm 30mm;
    margin: 0;
  }

  @media print {
    html, body {
      width: 60mm;
      height: auto;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    .sparepart-label-print-batch {
      display: block !important;
      gap: 0 !important;
    }

    .sparepart-label-print-root {
      margin: 0 !important;
      box-shadow: none !important;
      border: 0 !important;
      break-after: page;
      page-break-after: always;
    }

    .sparepart-label-print-root:last-child {
      break-after: auto;
      page-break-after: auto;
    }
  }
`;

export function SparepartLabelPrintDialog({
  open,
  onOpenChange,
  sparepart,
}: SparepartLabelPrintDialogProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const [labelCount, setLabelCount] = useState(1);
  let barcodeSvg = "";

  if (sparepart) {
    try {
      barcodeSvg = bwipjs.toSVG({
        bcid: "code128",
        text: sparepart.id,
        height: 12,
        includetext: false,
        backgroundcolor: "FFFFFF",
      });
    } catch (error) {
      console.error("Failed to render sparepart barcode", error);
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: labelRef,
    documentTitle: sparepart ? `label-${sparepart.name}` : "sparepart-label",
    pageStyle: printPageStyle,
  });

  const handleLabelCountChange = (value: string) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;

    setLabelCount(Math.min(100, Math.max(1, Math.trunc(nextValue))));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Sparepart Label</DialogTitle>
          <DialogDescription>
            Print a Code128 label using the sparepart ID for scanner input.
          </DialogDescription>
        </DialogHeader>

        {sparepart && (
          <div className="max-h-[260px] overflow-auto rounded-lg border bg-muted/30 p-4">
            <div ref={labelRef} className="sparepart-label-print-batch flex flex-col items-center gap-3">
              {Array.from({ length: labelCount }, (_, index) => (
                <div key={index} className="sparepart-label-print-root flex h-[30mm] w-[60mm] flex-col rounded-sm border bg-white px-[3mm] py-[2mm] text-black shadow-sm">
                  <div className="min-w-0">
                    <div className="truncate text-[9px] font-bold uppercase leading-tight">{sparepart.name}</div>
                    <div className="mt-0.5 text-[6px] leading-none text-black/70">ID: {sparepart.id}</div>
                  </div>
                  <div className="mt-[2mm] flex flex-1 items-center justify-center overflow-hidden">
                    {barcodeSvg ? (
                      <div
                        className="h-[15mm] w-full [&_svg]:h-full [&_svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                      />
                    ) : (
                      <div className="text-[7px] font-medium text-black/70">Barcode unavailable</div>
                    )}
                  </div>
                  <div className="mt-[1mm] text-right text-[6px] font-medium uppercase tracking-wide text-black/70">
                    RMS Inventory
                  </div>
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
              min={1}
              max={100}
              value={labelCount}
              onChange={(event) => handleLabelCountChange(event.target.value)}
              className="w-20"
            />
          </Field>
          <Button onClick={handlePrint} disabled={!sparepart}>
            <RiPrinterLine data-icon="inline-start" />
            Print {labelCount} Label{labelCount > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
