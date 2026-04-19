# Multi-Toko

Panduan lengkap tentang fitur multi-toko di RMS.

---

## Apa itu Multi-Toko?

Multi-Toko adalah fitur yang memungkinkan satu akun Admin mengelola beberapa toko service center dalam satu sistem.

### Manfaat

- **Centralized Management**: Kelola semua toko dari satu dashboard
- **Separated Data**: Data servis, inventory, dan karyawan terpisah per toko
- **Flexible Access**: Admin bisa pindah antar toko dengan mudah

---

## Konsep Dasar

### Struktur Multi-Toko

```
┌─────────────────────────────────────────────┐
│              AKUN ADMIN                      │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐  ┌─────────────┐           │
│  │   TOKO A    │  │   TOKO B    │           │
│  ├─────────────┤  ├─────────────┤           │
│  │ - Servis    │  │ - Servis    │           │
│  │ - Inventory │  │ - Inventory │           │
│  │ - Karyawan  │  │ - Karyawan  │           │
│  └─────────────┘  └─────────────┘           │
│                                             │
└─────────────────────────────────────────────┘
```

### Apa yang Terpisah per Toko?

| Data | Terpisah? | Keterangan |
|------|-----------|------------|
| **Service Ticket** | Ya | Setiap toko punya data servis sendiri |
| **Sparepart** | Ya | Inventory terpisah per toko |
| **Service Pricelist** | Ya | Template jasa terpisah per toko |
| **Staff** | Ya | Staff hanya bisa akses toko tempat dia bekerja |
| **Teknisi** | Ya | Teknisi hanya bisa akses toko tempat dia bekerja |
| **HpCatalog** | Tidak | Katalog device bersifat global |

### Apa yang Global?

| Data | Keterangan |
|------|------------|
| **HpCatalog** | Katalog brand dan model handphone |
| **Akun Admin** | Satu akun Admin bisa akses semua toko |

---

## Mengelola Toko

### Akses Menu

Menu **Toko** hanya tersedia untuk **Admin**.

### Melihat Daftar Toko

1. Login sebagai Admin
2. Buka menu **Toko**
3. Lihat daftar toko yang dikelola

Informasi yang ditampilkan:
- Nama toko
- Alamat
- Nomor telepon
- Jumlah karyawan
- Jumlah servis

### Membuat Toko Baru

1. Buka menu **Toko**
2. Klik tombol **"Add Toko"** atau **"New"**
3. Isi form:

| Field | Keterangan | Contoh |
|-------|------------|--------|
| **Nama Toko** | Nama service center | "Service Center ABC" |
| **Alamat** | Alamat lengkap | "Jl. Sudirman No. 123" |
| **Telepon** | Nomor telepon toko | "08123456789" |
| **Logo** | Logo toko (opsional) | Upload file gambar |

4. Klik **"Save"**

**Yang terjadi saat toko baru dibuat:**
- Toko baru muncul di daftar
- Inventory sparepart kosong (perlu ditambahkan)
- Service pricelist kosong (perlu ditambahkan)
- Belum ada karyawan di toko baru

### Edit Informasi Toko

1. Buka menu **Toko**
2. Cari toko yang ingin diedit
3. Klik tombol **"Edit"**
4. Ubah informasi yang diperlukan:
   - Nama toko
   - Alamat
   - Telepon
   - Logo
5. Klik **"Save"**

### Hapus Toko

**Peringatan:** Menghapus toko akan menghapus semua data terkait!

Data yang akan terhapus:
- Semua service ticket di toko tersebut
- Semua inventory sparepart
- Semua service pricelist
- Semua karyawan dari toko tersebut

**Cara hapus:**

1. Buka menu **Toko**
2. Cari toko yang ingin dihapus
3. Klik tombol **"Delete"**
4. Konfirmasi penghapusan (biasanya perlu konfirmasi tambahan)

---

## Pindah Antar Toko

### Cara Pindah Toko

#### Melalui Menu Toko

1. Buka menu **Toko**
2. Cari toko yang ingin dibuka
3. Klik tombol **"Open"** atau nama toko
4. Dashboard akan refresh dengan data toko tersebut

#### Melalui Selector (jika ada)

1. Klik selector toko di header/navbar
2. Pilih toko dari dropdown
3. Dashboard akan refresh dengan data toko tersebut

### Apa yang Berubah Saat Pindah Toko?

- **Service Ticket**: Hanya menampilkan servis dari toko aktif
- **Sparepart**: Hanya menampilkan inventory toko aktif
- **Service Pricelist**: Hanya menampilkan pricelist toko aktif
- **Karyawan**: Hanya menampilkan karyawan toko aktif
- **Overview**: Statistik dari toko aktif

---

## Mengelola Karyawan per Toko

### Menambah Karyawan ke Toko

1. Pastikan toko yang benar sudah aktif
2. Buka menu **Karyawan**
3. Klik **"Add Karyawan"**
4. Isi form:
   - Email
   - Nama
   - Password
   - Role (Staff atau Teknisi)
5. Klik **"Save"**

**Karyawan akan otomatis ter-assign ke toko yang aktif.**

### Karyawan di Multi-Toko

| Role | Bisa Akses Beberapa Toko? |
|------|---------------------------|
| Admin | Ya (semua toko) |
| Staff | Tidak (hanya toko tempat terdaftar) |
| Teknisi | Tidak (hanya toko tempat terdaftar) |

**Jika karyawan perlu akses ke beberapa toko:**
- Solusi saat ini: Buat akun terpisah untuk setiap toko
- Atau: Upgrade ke role Admin

### Memindahkan Karyawan ke Toko Lain

1. Buka menu **Karyawan**
2. Cari karyawan yang ingin dipindahkan
3. Klik **"Edit"**
4. Ubah toko assignment
5. Klik **"Save"**

---

## Data Servis per Toko

### Pembuatan Service Ticket

Service ticket dibuat untuk toko yang sedang aktif.

**Cara:**
1. Pastikan toko yang benar sudah aktif
2. Buka menu **Service**
3. Klik **"New Service"**
4. Isi form dan simpan

**Ticket akan otomatis ter-assign ke toko aktif.**

### Melihat Servis Antar Toko

**Admin** bisa melihat servis dari semua toko:
- Pindah ke toko yang ingin dilihat
- Atau gunakan filter "Semua Toko" (jika tersedia)

**Staff/Teknisi** hanya bisa melihat servis dari toko tempat dia bekerja.

---

## Inventory per Toko

### Sparepart

Setiap toko memiliki inventory sparepart sendiri.

**Konsekuensi:**
- Sparepart di toko A tidak muncul di toko B
- Stock terpisah per toko
- Harga bisa berbeda antar toko

**Cara mengelola:**
1. Pindah ke toko yang ingin dikelola
2. Buka menu **Inventory** → **Sparepart**
3. Tambah/Edit/Hapus sparepart

### Service Pricelist

Setiap toko memiliki template jasa sendiri.

**Konsekuensi:**
- Pricelist di toko A tidak muncul di toko B
- Harga jasa bisa berbeda antar toko

**Cara mengelola:**
1. Pindah ke toko yang ingin dikelola
2. Buka menu **Inventory** → **Service Pricelist**
3. Tambah/Edit/Hapus jasa

---

## Katalog Device (HpCatalog)

### Apa itu HpCatalog?

HpCatalog adalah katalog global berisi daftar brand dan model handphone. Katalog ini **bersifat global**, tidak terpisah per toko.

### Mengapa Global?

- Memudahkan input device saat buat ticket
- Menghindari duplikasi data
- Konsistensi nama brand dan model

### Cara Menggunakan

Saat membuat service ticket:

1. Ketik nama brand atau model di field **Device**
2. Jika sudah ada di katalog → pilih dari dropdown
3. Jika belum ada → ketik nama baru, sistem akan buat entry baru

**Device yang dibuat akan tersedia di semua toko.**

---

## Reporting per Toko

### Statistik di Overview

Overview menampilkan statistik dari **toko yang sedang aktif**:
- Jumlah servis per status
- Pendapatan
- Performa teknisi
- Stock menipis

### Melihat Statistik Semua Toko

Jika fitur tersedia, Admin bisa:
- Lihat agregat semua toko
- Bandingkan performa antar toko
- Export laporan per toko

---

## FAQ

### Q: Bisakah satu karyawan bekerja di beberapa toko?

**Tidak secara langsung.** Karyawan (Staff/Teknisi) hanya bisa terdaftar di satu toko.

**Workaround:**
- Buat akun terpisah untuk setiap toko
- Atau berikan role Admin (bisa akses semua toko)

### Q: Bisakah sparepart dipindahkan antar toko?

Saat ini, inventory **terpisah per toko**. Tidak ada fitur transfer stock antar toko.

**Workaround:**
- Catat manual di notes
- Kurangi stock di toko asal, tambah stock di toko tujuan

### Q: Bisakah data servis digabungkan dari semua toko?

Ya, untuk **Admin**:
- Gunakan filter "Semua Toko" di halaman Service (jika tersedia)
- Atau lihat agregat di Overview (jika fitur tersedia)

### Q: Bagaimana cara setup toko baru?

1. Admin buat toko baru
2. Tambah inventory sparepart
3. Tambah service pricelist
4. Tambah karyawan (Staff/Teknisi)
5. Toko siap digunakan

### Q: Apakah HpCatalog perlu diisi per toko?

**Tidak.** HpCatalog bersifat global. Cukup isi sekali, tersedia di semua toko.

---

## Tips Praktis

### Untuk Admin

1. **Kelola inventory sebelum buka toko baru**
   - Siapkan sparepart yang umum dipakai
   - Setup service pricelist standar

2. **Assign karyawan dengan benar**
   - Pastikan setiap toko punya minimal satu Staff
   - Distribusikan Teknisi sesuai kebutuhan

3. **Monitor performa per toko**
   - Gunakan Overview untuk melihat statistik
   - Bandingkan performa antar toko

4. **Backup data sebelum hapus toko**
   - Simpan data penting sebelum hapus toko
   - Data yang terhapus tidak bisa dikembalikan

### Untuk Staff

1. **Pastikan toko yang benar**
   - Cek toko aktif sebelum buat ticket
   - Cek toko aktif sebelum tambah inventory

2. **Koordinasi dengan Admin jika perlu pindah toko**
   - Jika ada kebutuhan untuk kerja di toko lain
   - Hubungi Admin untuk pengaturan

### Untuk Teknisi

1. **Fokus pada tugas di toko**
   - Tugas yang muncul hanya dari toko tempat terdaftar
   - Tidak bisa ambil tugas dari toko lain