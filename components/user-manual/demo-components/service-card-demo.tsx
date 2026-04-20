import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { RiAddLine, RiDeleteBinLine, RiCheckDoubleLine, RiCloseCircleLine } from "@remixicon/react";

const demoTask = {
  device: "Samsung Galaxy A12",
  customer: "Ahmad",
  phone: "08123456789",
  complaint: "LCD pecah, tidak bisa dilihat. Device masih bisa nyala.",
  status: "repairing",
  items: [
    { type: "sparepart", name: "LCD Samsung A12 Original", qty: 1, price: 250000 },
    { type: "service", name: "Jasa Ganti LCD", qty: 1, price: 100000 },
  ],
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  received: { label: "Masuk", variant: "secondary" },
  repairing: { label: "Proses", variant: "default" },
  done: { label: "Selesai", variant: "outline" },
  failed: { label: "Gagal", variant: "destructive" },
  picked_up: { label: "Diambil", variant: "default" },
};

export function ServiceCardDemo() {
  const totalAmount = demoTask.items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <Card className="my-4">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span>{demoTask.device}</span>
              <Badge variant={statusConfig[demoTask.status].variant}>
                {statusConfig[demoTask.status].label}
              </Badge>
            </CardTitle>
            <CardDescription>
              {demoTask.customer} • {demoTask.phone}
            </CardDescription>
          </div>
          <Button size="sm" className="w-full sm:w-auto">
            <RiAddLine className="h-4 w-4 mr-1" />
            Tambah Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Keluhan</Label>
            <p className="text-sm">{demoTask.complaint}</p>
          </div>

          <div>
            <Label className="text-muted-foreground">Items</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoTask.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge variant="outline">{item.type === "sparepart" ? "Sparepart" : "Jasa"}</Badge>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price * item.qty)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Total</span>
            <span className="font-bold">{formatCurrency(totalAmount)}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-muted-foreground">Invoice Status</span>
            <Badge variant="destructive">Unpaid</Badge>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button size="sm" variant="destructive">
              <RiCloseCircleLine className="h-4 w-4 mr-1" />
              Gagal Servis
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <RiCheckDoubleLine className="h-4 w-4 mr-1" />
              Selesai Servis
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}