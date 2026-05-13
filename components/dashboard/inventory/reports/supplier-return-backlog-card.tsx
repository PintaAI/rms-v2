import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const backlogSections = [
  {
    title: "Dashboard Cards",
    description: "Sudah tersedia di halaman Retur Supplier; bisa dipromosikan ke dashboard inventory bila dibutuhkan.",
    items: ["Retur pending", "Retur dikirim", "Retur diganti bulan ini", "Refund supplier bulan ini"],
  },
  {
    title: "Supplier Quality Signals",
    description: "Tetap informasional, bukan ranking supplier otomatis.",
    items: ["Return rate", "Rejection rate", "Average days to replacement/refund", "Total returned cost value"],
  },
  {
    title: "Integrasi Hutang Supplier",
    description: "Ditunda sampai lifecycle retur stabil.",
    items: ["Refund offset hutang", "Replacement link ke restock", "Rejected note ke supplier record"],
  },
  {
    title: "Proof Uploads",
    description: "Bisa memakai blob upload pattern yang sudah ada nanti.",
    items: ["Foto kerusakan", "Resi pengiriman", "Bukti respons supplier"],
  },
  {
    title: "Manual Returns",
    description: "V1 tetap fokus pada retur dari klaim garansi.",
    items: ["Broken stock saat audit", "Dead-on-arrival", "Wrong part delivered"],
  },
  {
    title: "Export",
    description: "Belum diaktifkan di V1.",
    items: ["CSV", "XLSX", "Supplier-specific statement"],
  },
]

export function SupplierReturnBacklogCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Backlog Retur Supplier</CardTitle>
            <CardDescription>Catatan roadmap agar ide advanced tidak tercampur dengan workflow operasional V1.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit">Informasional</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {backlogSections.map((section) => (
            <div key={section.title} className="rounded-lg border bg-muted/20 p-3">
              <div className="font-semibold">{section.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {section.items.map((item) => <Badge key={item} variant="secondary" className="font-normal">{item}</Badge>)}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Backlog rules: multi-item batches, shipping cost tracking, accounting journal, supplier score, dan automatic debt offset tidak diimplementasikan di V1.
        </p>
      </CardContent>
    </Card>
  )
}
