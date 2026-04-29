"use client";

import { ServiceTable } from "@/components/dashboard/services/service-table";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table";

const mockServices: ServiceTableItem[] = [
  {
    id: "demo-1",
    hpCatalogId: "hp-1",
    customerName: "Ahmad",
    noWa: "08123456789",
    complaint: "LCD pecah, tidak bisa dilihat",
    includedItems: ["Charger", "SIM tray", "Dus"],
    status: "received",
    checkinAt: new Date("2024-01-15T10:00:00"),
    hpCatalog: {
      modelName: "Galaxy A12",
      brand: { name: "Samsung" },
    },
    technician: null,
    invoice: null,
  },
  {
    id: "demo-2",
    hpCatalogId: "hp-2",
    customerName: "Budi",
    noWa: "08234567890",
    complaint: "Baterai boros, hanya bertahan 1 jam",
    note: "Customer bilang sudah 2 tahun pakai",
    status: "repairing",
    checkinAt: new Date("2024-01-14T14:30:00"),
    hpCatalog: {
      modelName: "iPhone 11",
      brand: { name: "Apple" },
    },
    technician: { id: "tech-1", name: "Budi Teknisi" },
    invoice: {
      id: "inv-1",
      grandTotal: 150000,
      paymentStatus: "unpaid",
    },
  },
  {
    id: "demo-3",
    hpCatalogId: "hp-3",
    customerName: "Citra",
    noWa: "08345678901",
    complaint: "Port charge rusak, tidak bisa charging",
    status: "done",
    checkinAt: new Date("2024-01-13T09:00:00"),
    doneAt: new Date("2024-01-13T16:00:00"),
    hpCatalog: {
      modelName: "Redmi Note 10",
      brand: { name: "Xiaomi" },
    },
    technician: { id: "tech-2", name: "Andi" },
    invoice: {
      id: "inv-2",
      grandTotal: 75000,
      paymentStatus: "unpaid",
    },
  },
  {
    id: "demo-4",
    hpCatalogId: "hp-4",
    customerName: "Dina",
    noWa: "08456789012",
    complaint: "Software error, bootloop",
    note: "IC rusak, tidak bisa diperbaiki",
    status: "failed",
    checkinAt: new Date("2024-01-12T11:00:00"),
    doneAt: new Date("2024-01-12T15:00:00"),
    hpCatalog: {
      modelName: "A15",
      brand: { name: "OPPO" },
    },
    technician: { id: "tech-1", name: "Budi Teknisi" },
    invoice: null,
  },
  {
    id: "demo-5",
    hpCatalogId: "hp-5",
    customerName: "Eka",
    noWa: "08567890123",
    complaint: "Speaker tidak berbunyi",
    status: "done",
    isPickedUp: true,
    checkinAt: new Date("2024-01-10T08:00:00"),
    doneAt: new Date("2024-01-10T12:00:00"),
    checkoutAt: new Date("2024-01-11T10:00:00"),
    hpCatalog: {
      modelName: "Y12",
      brand: { name: "Vivo" },
    },
    technician: { id: "tech-2", name: "Andi" },
    invoice: {
      id: "inv-3",
      grandTotal: 50000,
      paymentStatus: "paid",
      createdAt: new Date("2024-01-10T08:00:00"),
      paidAt: new Date("2024-01-11T10:00:00"),
    },
  },
  {
    id: "demo-6",
    hpCatalogId: "hp-6",
    customerName: "Fajar",
    noWa: "08678901234",
    complaint: "LCD pecah, touchscreen tidak responsif",
    status: "failed",
    isPickedUp: true,
    checkinAt: new Date("2024-01-08T09:00:00"),
    doneAt: new Date("2024-01-08T15:00:00"),
    checkoutAt: new Date("2024-01-09T14:00:00"),
    hpCatalog: {
      modelName: "Galaxy A12",
      brand: { name: "Samsung" },
    },
    technician: { id: "tech-1", name: "Budi Teknisi" },
    invoice: {
      id: "inv-4",
      grandTotal: 400000,
      paymentStatus: "paid",
      createdAt: new Date("2024-01-08T09:00:00"),
      paidAt: new Date("2024-01-09T14:00:00"),
      items: [
        { id: "item-1", type: "Sparepart", name: "LCD Samsung A12 Original", qty: 1, price: 250000 },
        { id: "item-2", type: "Jasa", name: "Jasa Ganti LCD", qty: 1, price: 100000 },
        { id: "item-3", type: "Jasa", name: "Ongkos Pasang", qty: 1, price: 50000 },
      ],
    },
  },
];

export function ServiceTableDemo() {
  return (
    <ServiceTable
      services={mockServices}
      role="admin"
      headerTitle="Demo Service Table"
      headerDescription="Contoh tabel service dengan pengaturan kolom"
      headerBadge={mockServices.length}
      disableAssignment
    />
  );
}
