import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RiArrowLeftLine, RiStore2Line } from "@remixicon/react"
import type { InventoryReportToko } from "./types"

interface InventoryReportHeaderProps {
  tokoId: string
  toko: InventoryReportToko | null
  errorMessage?: string
}

export function InventoryReportHeader({ tokoId, toko, errorMessage }: InventoryReportHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" className="-ml-2 w-fit">
        <Link href={`/${tokoId}/inventory`}>
          <RiArrowLeftLine data-icon="inline-start" />
          Kembali ke Inventory
        </Link>
      </Button>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Laporan Inventory</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div className="flex min-w-0 items-center gap-2">
            {toko?.logoUrl ? (
              <Image src={toko.logoUrl} alt={toko.name} width={20} height={20} className="size-5 rounded-md object-cover" />
            ) : (
              <div className="flex size-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="size-3 text-muted-foreground" />
              </div>
            )}
            <span className="truncate text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">
          Ringkasan nilai stok, potensi margin, dan status kesehatan sparepart.
        </p>
        {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
      </div>
    </div>
  )
}
