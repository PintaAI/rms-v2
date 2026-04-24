"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RiLoader4Line, RiPlayCircleLine, RiShieldCheckLine } from "@remixicon/react"

type StartAuditCardProps = {
  isStarting: boolean
  onStart: () => void
}

export function StartAuditCard({ isStarting, onStart }: StartAuditCardProps) {
  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <RiShieldCheckLine className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl font-black tracking-tight">Mulai Audit Gudang</CardTitle>
        <CardDescription>
          Sistem akan mengambil snapshot semua sparepart toko, lalu admin mengisi stok fisik untuk menemukan selisih.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Satu toko hanya dapat memiliki satu audit aktif. Complete audit akan menyesuaikan stok sparepart ke stok fisik.
        </div>
        <Button onClick={onStart} disabled={isStarting} size="lg" className="sm:min-w-36">
          {isStarting ? <RiLoader4Line className="animate-spin" /> : <RiPlayCircleLine />}
          Mulai Audit
        </Button>
      </CardContent>
    </Card>
  )
}
