import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

const demoInvoice = {
  ticketId: "SRV-2024-001",
  device: "Samsung Galaxy A12",
  customer: "Ahmad",
  items: [
    { type: "Sparepart", name: "LCD Samsung A12 Original", qty: 1, price: 250000 },
    { type: "Jasa", name: "Jasa Ganti LCD", qty: 1, price: 100000 },
    { type: "Jasa", name: "Ongkos Pasang", qty: 1, price: 50000 },
  ],
  total: 400000,
  status: "unpaid",
};

export function InvoiceDemo() {
  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Invoice</span>
          <Badge variant={demoInvoice.status === "paid" ? "outline" : "destructive"}>
            {demoInvoice.status === "paid" ? "Paid" : "Unpaid"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Ticket: {demoInvoice.ticketId}</div>
            <div>Device: {demoInvoice.device}</div>
            <div>Customer: {demoInvoice.customer}</div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipe</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoInvoice.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.qty}</TableCell>
                  <TableCell>{formatCurrency(item.price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.price * item.qty)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center pt-2 border-t text-lg">
            <span className="font-medium">Grand Total</span>
            <span className="font-bold">{formatCurrency(demoInvoice.total)}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1">
              Mark Paid
            </Button>
            <Button className="flex-1">
              Pick Up
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}