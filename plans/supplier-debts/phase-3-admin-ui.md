# Supplier Debts Phase 3: Admin UI

## Goal

Phase 3 adds the admin page and components for manual supplier debt management.

The UI should be useful but intentionally simple.

## Route

Add page:

```txt
app/(dashboard)/[tokoid]/admin/supplier-debts/page.tsx
```

This page should be admin-only and should require `inventory.management`.

Use the existing page feature check style from inventory pages.

## Page Layout

Page title:

```txt
Hutang Supplier
```

Subtitle:

```txt
Catat nota supplier yang belum lunas dan pembayaran cicilannya.
```

Top actions:

- `Tambah Hutang`
- optional `Tambah Supplier`, only if not embedded in the debt form

## Summary Cards

Show three cards:

```txt
Total Sisa Hutang
Total Sudah Dibayar
Nota Belum Lunas
```

Optional fourth card:

```txt
Lewat Jatuh Tempo
```

Overdue should be computed client-side or server-side from:

```txt
status != paid and dueDate < today
```

Do not store overdue status in DB.

## Table Columns

Minimum columns:

```txt
Supplier
No Nota
Keterangan
Total
Dibayar
Sisa
Jatuh Tempo
Status
Aksi
```

Status labels:

```txt
unpaid  = Belum Dibayar
partial = Sebagian
paid    = Lunas
```

If overdue, show a visual badge next to status:

```txt
Lewat Tempo
```

## Components

Create new folder:

```txt
components/dashboard/supplier-debts
```

Add components:

```txt
supplier-debt-table.tsx
supplier-debt-form-dialog.tsx
supplier-payment-dialog.tsx
```

Optional component if useful:

```txt
supplier-form-dialog.tsx
```

Keep components local to this feature. Do not introduce shared abstractions unless repeated elsewhere.

## SupplierDebtTable

Responsibilities:

- render rows
- display status badge
- calculate and display overdue badge
- open edit debt dialog
- open payment dialog
- call delete action for deletable rows

Delete button rule:

- show only when `paymentCount === 0`

## SupplierDebtFormDialog

Use for create and edit.

Fields:

```txt
Supplier
No nota supplier
Keterangan
Total hutang
Dibayar awal, create mode only
Jatuh tempo
```

Supplier input options:

- select existing supplier
- simple inline create supplier by name if no supplier exists or user types a new supplier name

For the simplest first pass, use separate fields:

```txt
Supplier dropdown
Nama supplier baru
```

If `Nama supplier baru` is filled, create supplier first, then create debt.

## SupplierPaymentDialog

Fields:

```txt
Nominal pembayaran
Tanggal pembayaran
Catatan
```

Show summary before submit:

```txt
Sisa sekarang
Nominal bayar
Sisa setelah bayar
```

Disable submit if amount is invalid or exceeds remaining debt.

## Empty State

If no debts exist:

```txt
Belum ada hutang supplier. Tambahkan nota supplier yang belum lunas untuk mulai memantau kewajiban toko.
```

## Search And Filters

V1 can skip advanced filters.

Optional simple search can be client-side:

- supplier name
- invoice number
- description

Avoid server pagination in V1 unless the page is already slow.

## Formatting

Use existing utilities:

```txt
formatCurrency
formatDate
```

Use shadcn components already in the repo. Do not introduce new UI libraries or icons outside `@remixicon/react`.
