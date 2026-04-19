# Manajemen Service Ticket

Panduan lengkap tentang membuat dan mengelola service ticket di RMS.

---

## Apa itu Service Ticket?

Service ticket adalah record yang menyimpan semua informasi terkait satu unit servis handphone. Setiap device yang masuk untuk servis akan memiliki satu ticket.

### Informasi dalam Service Ticket

| Field | Wajib? | Keterangan |
|-------|--------|------------|
| **Device** | Ya | Brand + Model handphone |
| **WhatsApp Customer** | Ya | Nomor untuk kontak |
| **Nama Customer** | Tidak | Nama customer (opsional) |
| **Keluhan** | Ya | Deskripsi masalah |
| **Password/Pattern** | Tidak | Kunci device untuk testing |
| **IMEI** | Tidak | Nomor IMEI device |
| **Teknisi** | Tidak | Teknisi yang ditugaskan |
| **Items** | Tidak | Daftar biaya (sparepart + jasa) |
| **Invoice** | Otomatis | Total biaya + status pembayaran |

---

## Membuat Service Ticket Baru

### Step-by-Step

#### 1. Buka Halaman Service

Klik menu **"Service"** di sidebar, atau klik tombol **"New Service"** (jika tersedia).

#### 2. Klik Tombol "New Service"

Tombol ini biasanya berada di:
- Pojok kanan atas tabel servis
- Atau bisa langsung dari menu dropdown

#### 3. Isi Form Service Ticket

##### Device (Wajib)

**Cara memilih device:**

1. **Dari katalog yang ada**
   - Ketik nama brand atau model di field
   - Sistem akan menampilkan autocomplete
   - Pilih dari dropdown

2. **Device baru (tidak ada di katalog)**
   - Ketik nama brand baru + model
   - Sistem akan otomatis membuat entry baru
   - Entry ini akan tersimpan di katalog global

**Contoh:**
- Ketik "Samsung" → pilih "Samsung Galaxy A12"
- Ketik "Xiaomi Redmi Note 12" → jika belum ada, akan dibuat baru

##### Nomor WhatsApp Customer (Wajib)

**Format yang diterima:**
- `08123456789`
- `+628123456789`
- `628123456789`

**Penting:**
- Nomor ini digunakan untuk identifikasi customer
- Jika ada integrasi WhatsApp, nomor ini untuk notifikasi
- Tanpa nomor WhatsApp, ticket tidak bisa dibuat

##### Nama Customer (Opsional)

- Bisa diisi atau dikosongkan
- Berguna untuk identifikasi jika customer datang lagi
- Tidak wajib, tapi disarankan diisi

##### Keluhan (Wajib)

**Tips mengisi keluhan:**
- Tuliskan masalah spesifik
- Sertakan informasi yang relevan

**Contoh keluhan yang baik:**
- "LCD pecah, masih bisa nyala"
- "Baterai boros, hanya bertahan 1 jam"
- "Tidak bisa charge, port sudah dibersihkan tapi tetap tidak mau"
- "Mati total, tidak bisa dinyalakan"

**Contoh keluhan yang kurang baik:**
- "Rusak" (terlalu umum)
- "Mau servis" (tidak menjelaskan masalah)

##### Password/Pattern (Opsional)

**Kenapa penting?**
- Memudahkan teknisi untuk testing device
- Menghindari teknisi harus reset device
- Mempercepat proses servis

**Cara mengisi:**
- Untuk PIN/Password: ketik langsung (contoh: "1234", "password123")
- Untuk Pattern: gambarkan pattern (jika ada fitur visual) atau jelaskan dengan text

**Contoh:**
- "PIN: 1234"
- "Pattern: L shape (1-2-3-6-9)"
- "Password: samsung2024"
- "Fingerprint + PIN backup: 0000"

##### IMEI (Opsional)

**Apa itu IMEI?**
International Mobile Equipment Identity - nomor unik untuk setiap handphone.

**Cara cek IMEI:**
- Ketik `*#06#` di dial pad
- Lihat di box/kardus handphone
- Lihat di menu Settings → About Phone

**Kenapa dicatat?**
- Identifikasi device jika ada keraguan
- Dokumentasi untuk garansi
- Mencegah tertukar dengan device lain

**Format:**
- Biasanya 15 digit
- Contoh: 356789012345678

#### 4. Klik "Create Ticket"

Setelah semua field terisi, klik tombol **"Create Ticket"**.

**Apa yang terjadi setelah create?**
- Ticket dibuat dengan status **"Masuk"** (Received)
- Ticket muncul di tabel servis
- Badge di sidebar terupdate
- Ticket siap untuk di-assign ke teknisi

---

## Assign Teknisi ke Service Ticket

### Kapan Perlu Assign?

Setelah service ticket dibuat, ticket berstatus "Masuk" dan menunggu teknisi. Ada dua cara untuk assign:

### Cara 1: Admin/Staff Assign Manual

1. Buka halaman **Service**
2. Cari ticket yang ingin di-assign
3. Klik kolom **"Teknisi"** di baris ticket tersebut
4. Pilih teknisi dari dropdown
5. Status otomatis berubah ke **"Proses"** (Repairing)

### Cara 2: Teknisi Ambil Sendiri

1. Teknisi login ke sistem
2. Buka halaman **Task**
3. Klik tab **"Tersedia"**
4. Cari ticket yang ingin dikerjakan
5. Klik tombol **"Take"**
6. Status otomatis berubah ke **"Proses"** dan teknisi ter-assign

---

## Edit Service Ticket

### Informasi yang Bisa Diedit

| Field | Bisa Edit? | Kapan? |
|-------|------------|--------|
| Device | Ya | Sebelum "Diambil" |
| WhatsApp Customer | Ya | Sebelum "Diambil" |
| Nama Customer | Ya | Sebelum "Diambil" |
| Keluhan | Ya | Sebelum "Diambil" |
| Password/Pattern | Ya | Sebelum "Diambil" |
| IMEI | Ya | Sebelum "Diambil" |
| Teknisi | Ya | Status "Masuk" atau "Proses" |
| Items | Ya | Status "Proses" |
| Invoice | Ya | Sebelum "Diambil" |

### Cara Edit

1. Buka halaman **Service**
2. Cari ticket yang ingin diedit
3. Klik tombol **"Edit"** atau klik baris ticket untuk buka detail
4. Ubah informasi yang diperlukan
5. Klik **"Save"** untuk menyimpan perubahan

### Pembatasan Edit

**Tidak bisa edit jika:**
- Status sudah **"Diambil"**
- Invoice sudah **"Paid"** (untuk field tertentu)

---

## Mengelola Item Biaya

### Apa itu Item?

Item adalah komponen biaya dalam servis. Ada dua jenis:

1. **Sparepart** - Komponen fisik yang diganti
2. **Jasa Servis** - Biaya pekerjaan/tenaga

### Menambah Item

#### Dari Halaman Service (Admin/Staff)

1. Buka detail service ticket
2. Scroll ke bagian **"Items"**
3. Klik **"Add Item"**
4. Pilih jenis item:
   - **Sparepart**: Pilih dari inventory
   - **Jasa**: Pilih dari pricelist atau isi manual
5. Isi quantity (untuk sparepart)
6. Harga otomatis terisi dari inventory/pricelist
7. Klik **"Save"**

#### Dari Halaman Task (Teknisi)

1. Buka halaman **Task** → tab **"Dikerjakan"**
2. Klik ticket yang ingin ditambah item
3. Klik **"Add Item"**
4. Pilih sparepart dari inventory atau jasa dari pricelist
5. Klik **"Save"**

### Menghapus Item

1. Buka detail service ticket
2. Di bagian **"Items"**, cari item yang ingin dihapus
3. Klik tombol **"Delete"** (ikon trash)
4. Konfirmasi penghapusan

**Penting:**
- Menghapus sparepart akan mengembalikan stock ke inventory
- Invoice akan otomatis terupdate

### Edit Item

1. Buka detail service ticket
2. Di bagian **"Items"**, cari item yang ingin diedit
3. Klik tombol **"Edit"** (ikon pensil)
4. Ubah quantity atau harga
5. Klik **"Save"**

---

## Invoice & Pembayaran

### Struktur Invoice

Invoice dibuat otomatis berdasarkan items yang ditambahkan:

```
Item 1: LCD Samsung A12        Rp 250.000
Item 2: Jasa Ganti LCD         Rp 100.000
Item 3: Ongkos Pasang          Rp  50.000
─────────────────────────────────────────
Grand Total:                   Rp 400.000
Status:                        Unpaid
```

### Grand Total

Grand total dihitung otomatis dari:
- Sum semua item
- Sparepart: harga × quantity
- Jasa: harga satuan

### Status Pembayaran

| Status | Keterangan |
|--------|------------|
| **Unpaid** | Invoice belum dibayar |
| **Paid** | Invoice sudah dibayar |

### Cara Mark Paid

1. Buka halaman **Service**
2. Cari ticket yang ingin di-mark paid
3. Di kolom **"Invoice"**, klik status pembayaran
4. Pilih **"Mark as Paid"**
5. Status berubah ke **"Paid"**

**Atau:**

1. Buka detail service ticket
2. Klik tombol **"Mark Paid"**
3. Konfirmasi

### Hubungan dengan Pick Up

- **Mark Paid**: Hanya mengubah status invoice, status servis tetap "Selesai"
- **Pick Up**: Mengubah status servis ke "Diambil" DAN invoice otomatis "Paid"

---

## Finalisasi Servis

### Mark Done (Selesai)

Dilakukan oleh **Teknisi** setelah servis selesai:

1. Buka halaman **Task** → tab **"Dikerjakan"**
2. Klik ticket yang ingin diselesaikan
3. Pastikan semua item sudah ditambahkan
4. Klik tombol **"Mark Done"**
5. Status berubah ke **"Selesai"** (Done)

**Apa yang terjadi:**
- Ticket status: Proses → Selesai
- Invoice final (grand total pasti)
- Menunggu customer ambil

### Mark Failed (Gagal)

Dilakukan oleh **Teknisi** jika servis tidak berhasil:

1. Buka halaman **Task** → tab **"Dikerjakan"**
2. Klik ticket yang ingin di-mark failed
3. Klik tombol **"Mark Failed"**
4. Isi alasan kegagalan di notes
5. Status berubah ke **"Gagal"** (Failed)

**Alasan umum:**
- Device rusak permanen
- Customer cancel
- Sparepart tidak tersedia
- Biaya terlalu mahal

### Pick Up (Diambil)

Dilakukan oleh **Admin/Staff** saat customer datang:

1. Buka halaman **Service**
2. Cari ticket dengan status **"Selesai"** atau **"Gagal"**
3. Klik tombol **"Pick Up"**
4. Konfirmasi
5. Status berubah ke **"Diambil"** (Picked Up)

**Apa yang terjadi:**
- Ticket status: Selesai/Gagal → Diambil
- Invoice status: Otomatis jadi **"Paid"**
- Data terkunci, tidak bisa diedit

---

## Menghapus Service Ticket

### Kapan Bisa Hapus?

| Role | Bisa Hapus? | Syarat |
|------|-------------|--------|
| Admin | Ya | Status belum "Diambil" DAN invoice "Unpaid" |
| Staff | Ya | Status belum "Diambil" DAN invoice "Unpaid" |
| Teknisi | Tidak | - |

### Cara Hapus

1. Buka halaman **Service**
2. Cari ticket yang ingin dihapus
3. Klik tombol **"Delete"** (ikon trash)
4. Konfirmasi penghapusan

### Pembatasan Hapus

**Tidak bisa hapus jika:**
- Status sudah **"Diambil"**
- Invoice sudah **"Paid"**
- Ada sparepart yang sudah dipakai (stock sudah berkurang)

**Solusi jika tidak bisa hapus:**
- Biarkan ticket dengan status "Gagal"
- Atau hubungi Admin untuk penanganan khusus

---

## Tips Praktis

### Untuk Staff/Admin

1. **Isi form lengkap saat create**
   - Semua field yang wajib harus diisi
   - Password/pattern sangat membantu teknisi
   - Keluhan yang jelas mempercepat diagnosis

2. **Assign teknisi dengan cepat**
   - Jangan biarkan ticket "menggantung" lama
   - Teknisi bisa ambil sendiri jika tidak ada assign

3. **Finalisasi tepat waktu**
   - Pick Up segera setelah customer ambil
   - Mark Paid sesuai pembayaran aktual

### Untuk Teknisi

1. **Update notes berkala**
   - Catat progress pekerjaan
   - Informasikan jika ada kendala

2. **Tambah item dengan akurat**
   - Pilih sparepart yang benar
   - Quantity sesuai kebutuhan

3. **Komunikasi sebelum mark failed**
   - Jika ada masalah, komunikasi dulu dengan Admin
   - Jelaskan alasan kegagalan dengan jelas

---

## Troubleshooting

### Device tidak muncul di autocomplete

**Solusi:**
- Ketik nama brand + model lengkap
- Jika belum ada di katalog, sistem akan buat baru
- Cek spelling brand dan model

### Tidak bisa assign teknisi

**Kemungkinan:**
- Teknisi belum terdaftar di sistem
- Teknisi tidak aktif
- Teknisi tidak bekerja di toko tersebut

**Solusi:**
- Cek menu "Karyawan"
- Pastikan teknisi sudah ada dan aktif
- Hubungi Admin

### Tidak bisa hapus ticket

**Kemungkinan:**
- Status sudah "Diambil"
- Invoice sudah "Paid"
- Ada sparepart yang sudah dipakai

**Solusi:**
- Cek status ticket
- Cek status invoice
- Jika perlu, hubungi Admin

### Stock sparepart tidak cukup

**Solusi:**
- Cek stock di menu Inventory
- Jika stock tidak cukup, hubungi Admin untuk restock
- Update notes di ticket untuk informasi customer