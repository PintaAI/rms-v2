# Invoice & Pembayaran

Panduan lengkap tentang invoice dan pembayaran di RMS.

---

## Konsep Dasar

### Apa itu Invoice?

Invoice adalah catatan pembayaran untuk setiap service ticket. Invoice dibuat secara otomatis berdasarkan item-item yang ditambahkan ke servis.

### Kapan Invoice Dibuat?

Invoice dibuat sejak service ticket dibuat, namun:
- Grand total awalnya **Rp 0**
- Grand total berubah saat item ditambahkan/dihapus

---

## Struktur Invoice

### Komponen Invoice

```
┌─────────────────────────────────────────────┐
│           INVOICE SERVIS                    │
├─────────────────────────────────────────────┤
│ Ticket ID: SRV-2024-001                     │
│ Customer: Ahmad (08123456789)               │
│ Device: Samsung Galaxy A12                  │
│ Teknisi: Budi                               │
├─────────────────────────────────────────────┤
│ ITEMS:                                      │
│                                             │
│ 1. LCD Samsung A12 (Sparepart)              │
│    Rp 250.000 × 1 = Rp 250.000              │
│                                             │
│ 2. Jasa Ganti LCD (Jasa)                    │
│    Rp 150.000 × 1 = Rp 150.000              │
│                                             │
│ 3. Ongkos Pasang (Jasa)                     │
│    Rp 50.000 × 1 = Rp 50.000                │
├─────────────────────────────────────────────┤
│ GRAND TOTAL: Rp 450.000                     │
│ Status: Unpaid                              │
└─────────────────────────────────────────────┘
```

### Item dalam Invoice

Setiap item memiliki:

| Field | Keterangan |
|-------|------------|
| **Nama** | Nama item (sparepart atau jasa) |
| **Tipe** | Sparepart atau Jasa |
| **Harga** | Harga satuan |
| **Quantity** | Jumlah (untuk sparepart) |
| **Subtotal** | Harga × Quantity |

### Grand Total

Dihitung otomatis dari sum semua item:

```
Grand Total = Sum (Harga × Quantity) untuk semua item
```

---

## Status Pembayaran

### Jenis Status

| Status | Keterangan | Warna Badge |
|--------|------------|-------------|
| **Unpaid** | Invoice belum dibayar | Merah |
| **Paid** | Invoice sudah dibayar | Hijau |

### Perubahan Status

| Dari | Ke | Cara |
|------|-----|------|
| Unpaid | Paid | Klik "Mark Paid" |
| Unpaid | Paid | Otomatis saat "Pick Up" |
| Paid | Unpaid | Tidak bisa (tidak reversible) |

---

## Operasi Invoice

### Menambah Item ke Invoice

#### Siapa yang bisa?

| Role | Bisa Tambah Item? |
|------|-------------------|
| Admin | Ya |
| Staff | Ya |
| Teknisi | Ya (hanya ticket yang dikerjakan) |

#### Cara Menambah Item

**Untuk Admin/Staff:**

1. Buka halaman **Service**
2. Cari ticket yang ingin ditambahkan item
3. Klik ticket untuk buka detail
4. Scroll ke bagian **"Items"**
5. Klik **"Add Item"**
6. Pilih tipe item:
   - **Sparepart**: Pilih dari inventory
   - **Jasa**: Pilih dari pricelist atau input manual
7. Isi quantity (untuk sparepart) atau harga
8. Klik **"Save"**

**Untuk Teknisi:**

1. Buka halaman **Task** → tab **"Dikerjakan"**
2. Klik ticket yang dikerjakan
3. Di bagian **"Items"**, klik **"Add Item"**
4. Pilih sparepart atau jasa
5. Klik **"Save"**

#### Yang Terjadi Saat Tambah Item

- Grand total otomatis terupdate
- Jika sparepart, stock berkurang
- Invoice status tetap (tidak berubah)

### Menghapus Item dari Invoice

#### Siapa yang bisa?

| Role | Bisa Hapus Item? |
|------|------------------|
| Admin | Ya |
| Staff | Ya |
| Teknisi | Ya (hanya ticket yang dikerjakan) |

#### Cara Menghapus Item

1. Buka detail ticket
2. Di bagian **"Items"**, cari item yang ingin dihapus
3. Klik tombol **"Delete"** (ikon trash)
4. Konfirmasi penghapusan

#### Yang Terjadi Saat Hapus Item

- Grand total otomatis terupdate
- Jika sparepart, stock kembali ke inventory
- Invoice status tetap (tidak berubah)

### Mengubah Harga Item

#### Siapa yang bisa?

| Role | Bisa Ubah Harga? |
|------|------------------|
| Admin | Ya |
| Staff | Ya |
| Teknisi | Tidak |

#### Cara Mengubah Harga

1. Buka detail ticket
2. Di bagian **"Items"**, cari item yang ingin diubah
3. Klik tombol **"Edit"** (ikon pensil)
4. Ubah harga sesuai kebutuhan
5. Klik **"Save"**

**Penting:**
- Harga yang diubah hanya berlaku untuk ticket tersebut
- Harga default di inventory/pricelist tidak berubah

---

## Mark Paid

### Apa itu Mark Paid?

Mark Paid adalah aksi menandai bahwa customer sudah membayar invoice.

### Kapan Dilakukan?

- Customer membayar di muka (sebelum ambil)
- Customer membayar saat servis selesai (sebelum ambil)
- Customer membayar sebagian (tidak didukung, invoice harus full)

### Siapa yang Bisa?

| Role | Bisa Mark Paid? |
|------|-----------------|
| Admin | Ya |
| Staff | Ya |
| Teknisi | Tidak |

### Cara Mark Paid

#### Cara 1: Dari Tabel Service

1. Buka halaman **Service**
2. Cari ticket yang ingin di-mark paid
3. Di kolom **"Invoice"**, lihat status pembayaran
4. Klik status **"Unpaid"**
5. Pilih **"Mark as Paid"**

#### Cara 2: Dari Detail Ticket

1. Buka detail ticket
2. Di bagian **"Invoice"**, lihat status pembayaran
3. Klik tombol **"Mark Paid"**
4. Konfirmasi

### Yang Terjadi Saat Mark Paid

- Invoice status: Unpaid → Paid
- Status servis tetap (tidak berubah)
- Data invoice terkunci (tidak bisa dihapus)

### Pembatasan Setelah Mark Paid

| Aksi | Bisa? |
|------|-------|
| Tambah item | Tidak |
| Hapus item | Tidak |
| Ubah harga | Tidak |
| Hapus ticket | Tidak |
| Mark Paid lagi | Tidak (sudah Paid) |

---

## Pick Up

### Apa itu Pick Up?

Pick Up adalah aksi menandai bahwa customer sudah mengambil device.

### Kapan Dilakukan?

- Customer datang mengambil device
- Customer sudah membayar (atau tidak perlu bayar)

### Siapa yang Bisa?

| Role | Bisa Pick Up? |
|------|---------------|
| Admin | Ya |
| Staff | Ya |
| Teknisi | Tidak |

### Cara Pick Up

1. Buka halaman **Service**
2. Cari ticket dengan status **"Selesai"** atau **"Gagal"**
3. Klik tombol **"Pick Up"**
4. Konfirmasi

### Yang Terjadi Saat Pick Up

- Status servis: Selesai/Gagal → Diambil
- Invoice status: Otomatis jadi **"Paid"** (jika sebelumnya Unpaid)
- Semua data terkunci (tidak bisa diedit sama sekali)

### Pembatasan Setelah Pick Up

| Aksi | Bisa? |
|------|-------|
| Edit data ticket | Tidak |
| Edit item | Tidak |
| Hapus item | Tidak |
| Hapus ticket | Tidak |
| Ubah status | Tidak |

---

## Perbedaan Mark Paid vs Pick Up

| Aspek | Mark Paid | Pick Up |
|-------|-----------|---------|
| **Tujuan** | Tandai sudah bayar | Tandai sudah ambil |
| **Perubahan Status** | Invoice: Unpaid → Paid | Servis: Selesai/Gagal → Diambil |
| **Invoice Otomatis Paid?** | Ya | Ya |
| **Data Terkunci?** | Invoice terkunci | Semua data terkunci |
| **Servis Status Berubah?** | Tidak | Ya |
| **Reversible?** | Tidak | Tidak |

### Kapan Gunakan Masing-Masing?

#### Gunakan Mark Paid jika:
- Customer bayar duluan
- Customer bayar saat servis selesai, tapi belum ambil
- Ingin mencatat pembayaran terpisah dari pengambilan

#### Gunakan Pick Up jika:
- Customer bayar dan ambil bersamaan
- Customer ambil device (sudah bayar atau tidak perlu bayar)

---

## Skenario Pembayaran

### Skenario 1: Customer Bayar di Akhir

```
1. Staff buat ticket baru
   → Status: Masuk, Invoice: Unpaid (Rp 0)

2. Teknisi ambil tugas
   → Status: Proses

3. Teknisi tambah item (LCD + Jasa)
   → Invoice: Unpaid (Rp 400.000)

4. Teknisi Mark Done
   → Status: Selesai, Invoice: Unpaid (Rp 400.000)

5. Customer datang, bayar, dan ambil
   → Staff klik "Pick Up"
   → Status: Diambil, Invoice: Paid

6. Selesai
```

### Skenario 2: Customer Bayar Duluan (DP)

```
1. Staff buat ticket baru
   → Status: Masuk, Invoice: Unpaid (Rp 0)

2. Staff/Technician tambah item
   → Invoice: Unpaid (Rp 400.000)

3. Customer bayar DP atau full
   → Staff klik "Mark Paid"
   → Invoice: Paid

4. Teknisi kerjakan
   → Status: Proses

5. Teknisi Mark Done
   → Status: Selesai

6. Customer ambil device
   → Staff klik "Pick Up"
   → Status: Diambil

7. Selesai
```

### Skenario 3: Servis Gagal, Tidak Ada Biaya

```
1. Staff buat ticket baru
   → Status: Masuk, Invoice: Unpaid (Rp 0)

2. Teknisi ambil tugas
   → Status: Proses

3. Teknisi coba perbaiki tapi gagal
   → Tidak ada item ditambahkan
   → Invoice: Unpaid (Rp 0)

4. Teknisi Mark Failed
   → Status: Gagal, Invoice: Unpaid (Rp 0)

5. Customer ambil device (tidak bayar)
   → Staff klik "Pick Up"
   → Status: Diambil, Invoice: Paid (Rp 0)

6. Selesai
```

### Skenario 4: Servis Gagal, Ada Biaya

```
1. Staff buat ticket baru
   → Status: Masuk, Invoice: Unpaid (Rp 0)

2. Teknisi ambil tugas
   → Status: Proses

3. Teknisi tambah item (sudah pasang sparepart, dll)
   → Invoice: Unpaid (Rp 100.000)

4. Servis gagal, Teknisi Mark Failed
   → Status: Gagal, Invoice: Unpaid (Rp 100.000)

5. Customer bayar biaya yang sudah dikeluarkan
   → Staff klik "Mark Paid"
   → Invoice: Paid

6. Customer ambil device
   → Staff klik "Pick Up"
   → Status: Diambil

7. Selesai
```

---

## FAQ

### Q: Bisakah invoice di-split atau bayar sebagian?

**Tidak.** Sistem tidak mendukung pembayaran parsial. Invoice harus dibayar penuh.

**Workaround:**
- Edit grand total ke jumlah yang dibayar
- Atau buat ticket baru untuk sisanya

### Q: Bisakah Mark Paid di-undo?

**Tidak.** Setelah invoice di-mark paid, tidak bisa dikembalikan ke unpaid.

### Q: Bisakah Pick Up di-undo?

**Tidak.** Setelah ticket di-pick up, tidak bisa dikembalikan ke status sebelumnya.

### Q: Bagaimana jika customer bayar tapi belum ambil?

Lakukan **Mark Paid** terlebih dahulu. Nanti saat customer ambil, lakukan **Pick Up**.

### Q: Bagaimana jika customer ambil tapi belum bayar?

Lakukan **Pick Up** langsung. Invoice otomatis akan menjadi **Paid**.

**Note:** Ini berarti sistem mengasumsikan Pick Up = lunas. Jika ada kasus khusus, edit grand total ke 0 sebelum Pick Up.

### Q: Bisakah edit invoice setelah Mark Paid?

**Tidak.** Invoice terkunci setelah Mark Paid.

### Q: Bisakah edit invoice setelah Pick Up?

**Tidak.** Semua data terkunci setelah Pick Up.

---

## Tips Praktis

### Untuk Staff/Admin

1. **Finalisasi sebelum Pick Up**
   - Pastikan semua item sudah ditambahkan
   - Pastikan grand total benar
   - Setelah Pick Up, tidak bisa edit lagi

2. **Komunikasi dengan customer**
   - Konfirmasi grand total sebelum Pick Up
   - Jelaskan breakdown biaya jika customer bertanya

3. **Mark Paid segera setelah bayar**
   - Jangan menunda mencatat pembayaran
   - Hindari kebingungan status pembayaran

### Untuk Teknisi

1. **Tambah item sebelum Mark Done**
   - Pastikan semua item sudah ditambahkan sebelum mark done
   - Grand total akan final setelah mark done

2. **Update notes jika ada perubahan biaya**
   - Jelaskan jika ada biaya tambahan
   - Komunikasi dengan staff jika estimasi berubah

3. **Koordinasi jika ada masalah pembayaran**
   - Jangan mark done jika ada kendala biaya
   - Diskusi dulu dengan staff/admin