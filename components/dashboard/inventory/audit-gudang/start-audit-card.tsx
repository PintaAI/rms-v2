"use client"

import { Button } from "@/components/ui/button"
import { RiLoader4Line, RiPlayCircleLine, RiShieldCheckLine } from "@remixicon/react"

type StartAuditCardProps = {
  isStarting: boolean
  onStart: () => void
}

export function StartAuditCard({ isStarting, onStart }: StartAuditCardProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-48 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
            <RiShieldCheckLine className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-black tracking-tight">Mulai Audit Gudang</h2>
            <p className="text-sm text-muted-foreground">
              Sistem akan mengambil snapshot semua sparepart toko, lalu admin mengisi stok fisik untuk menemukan selisih.
            </p>
          </div>
        </div>

        <Button onClick={onStart} disabled={isStarting} size="lg" className="w-full sm:w-auto sm:min-w-36">
          {isStarting ? <RiLoader4Line className="animate-spin" /> : <RiPlayCircleLine />}
          Mulai Audit
        </Button>
      </div>
    </section>
  )
}
