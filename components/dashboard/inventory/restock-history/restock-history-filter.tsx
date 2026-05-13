import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RiSearchLine } from "@remixicon/react"
import type { RestockHistoryFilters, RestockHistoryUser } from "./types"

interface RestockHistoryFilterProps {
  tokoId: string
  filters: RestockHistoryFilters
  users: RestockHistoryUser[]
  hasActiveFilter: boolean
}

export function RestockHistoryFilter({
  tokoId,
  filters,
  users,
  hasActiveFilter,
}: RestockHistoryFilterProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Filter Riwayat</CardTitle>
            <CardDescription>Cari berdasarkan sparepart, barcode, user, atau rentang tanggal.</CardDescription>
          </div>
          {hasActiveFilter && <Badge variant="outline" className="w-fit">Filter aktif</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_minmax(180px,0.9fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_auto]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Pencarian</span>
            <div className="relative">
              <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={filters.q}
                placeholder="Nama sparepart, barcode, atau user"
                className="pl-8"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">User</span>
            <Select name="userId" defaultValue={filters.userId || "all"}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua user" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua user</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Dari</span>
            <Input type="date" name="from" defaultValue={filters.from} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Sampai</span>
            <Input type="date" name="to" defaultValue={filters.to} />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1 lg:flex-none">Terapkan</Button>
            {hasActiveFilter && (
              <Button asChild variant="outline">
                <Link href={`/${tokoId}/admin/inventory/restock-history`}>Reset</Link>
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
