# Inventory Management

Panduan lengkap tentang mengelola sparepart dan service pricelist di RMS.

---

## Apa itu Inventory?

Inventory di RMS terdiri dari dua komponen:

1. **Sparepart** - Komponen fisik yang digunakan dalam servis
2. **Service Pricelist** - Template harga jasa servis

---

## Sparepart

### Konsep Dasar

Setiap toko memiliki inventory sparepart sendiri. Sparepart di toko A berbeda dengan toko B.

### Jenis Sparepart

#### 1. Universal Sparepart

Sparepart yang bisa digunakan di device apa saja.

**Contoh:**
- Charger universal
- Earphone generic
- Tempered glass berbagai ukuran
- Baterai external/powerbank

**Cara setting:**
- Tidak perlu set kompatibilitas device
- Otomatis bisa dipakai untuk semua device

#### 2. Compatible Sparepart

Sparepart yang hanya cocok untuk device tertentu.

**Contoh:**
- LCD Samsung Galaxy A12 (hanya untuk A12)
- Baterai iPhone 11 (hanya untuk iPhone 11)
- Konektor charge Xiaomi Redmi Note 10

**Cara setting:**
- Pilih device yang kompatibel saat membuat sparepart
- Satu sparepart bisa kompatibel dengan beberapa device

---

## Mengelola Sparepart

### Akses Menu

| Role | Akses |
|------|-------|
| Admin | Full CRUD (Create, Read, Update, Delete) |
| Staff | Read only (lihat daftar, cek stock) |
| Teknisi | Read only (lihat daftar, cek stock) |

Menu **Sparepart** berada di:
- Admin: Menu **Inventory** → Submenu **Sparepart**
- Staff: Menu **Sparepart**
- Teknisi: Menu **Inventory** → Submenu **Sparepart**

### Membuat Sparepart Baru (Admin Only)

#### Step-by-Step

1. Buka menu **Inventory** → **Sparepart**
2. Klik tombol **"Add Sparepart"** atau **"New"**
3. Isi form sparepart:

| Field | Keterangan | Contoh |
|-------|------------|--------|
| **Nama** | Nama sparepart | "LCD Samsung Galaxy A12" |
| **Harga Default** | Harga jual default | 250000 |
| **Stock** | Jumlah tersedia | 10 |
| **Tipe** | Universal atau Compatible | Compatible |
| **Kompatibilitas** | Device yang cocok (jika Compatible) | Samsung Galaxy A12 |

4. Klik **"Save"**

#### Tips Mengisi

**Nama Sparepart:**
- Gunakan nama yang jelas dan spesifik
- Sertakan brand dan model jika compatible
- Contoh baik: "LCD Samsung Galaxy A12 Original"
- Contoh kurang baik: "LCD A12" (kurang spesifik)

**Harga Default:**
- Ini adalah harga default saat dipakai di servis
- Bisa diubah saat dipakai di ticket tertentu
- Gunakan angka tanpa titik atau koma (250000, bukan 250.000)

**Stock:**
- Jumlah unit yang tersedia di toko
- Akan berkurang otomatis saat dipakai di servis
- Akan bertambah kembali jika item dihapus dari servis

**Tipe & Kompatibilitas:**
- **Universal**: Tidak perlu pilih device, bisa dipakai semua
- **Compatible**: Pilih satu atau beberapa device yang cocok

### Melihat Daftar Sparepart

Daftar sparepart menampilkan informasi:

| Kolom | Keterangan |
|-------|------------|
| **Nama** | Nama sparepart |
| **Harga** | Harga default |
| **Stock** | Jumlah tersedia |
| **Tipe** | Universal/Compatible |
| **Kompatibilitas** | Device yang cocok (jika Compatible) |
| **Digunakan** | Jumlah kali dipakai di servis |

### Filter & Pencarian

**Filter:**
- Semua sparepart
- Universal saja
- Compatible saja
- Stock menipis (di bawah threshold)

**Pencarian:**
- Ketik nama sparepart
- Ketik nama device (untuk mencari compatible)
- Pencarian real-time

### Edit Sparepart (Admin Only)

1. Buka menu **Inventory** → **Sparepart**
2. Cari sparepart yang ingin diedit
3. Klik tombol **"Edit"** atau klik baris sparepart
4. Ubah informasi yang diperlukan
5. Klik **"Save"**

**Yang bisa diedit:**
- Nama
- Harga default
- Stock (manual adjustment)
- Kompatibilitas

### Hapus Sparepart (Admin Only)

1. Buka menu **Inventory** → **Sparepart**
2. Cari sparepart yang ingin dihapus
3. Klik tombol **"Delete"**
4. Konfirmasi penghapusan

**Pembatasan:**
- Sparepart yang sudah dipakai di servis **tidak bisa dihapus**
- Sparepart yang sedang ada di ticket aktif **tidak bisa dihapus**

**Solusi jika tidak bisa hapus:**
- Set stock ke 0
- Rename menjadi "[DISCONTINUED] Nama Sparepart"

---

## Stock Management

### Pengurangan Stock Otomatis

Stock berkurang otomatis ketika:
- Sparepart ditambahkan ke service ticket sebagai item
- Quantity yang ditambahkan sesuai dengan pengurangan stock

**Contoh:**
- Stock LCD Samsung A12: 10
- Ditambahkan ke ticket dengan qty 1
- Stock otomatis: 9

### Pengembalian Stock Otomatis

Stock bertambah kembali ketika:
- Item sparepart dihapus dari service ticket
- Service ticket dihapus (dan ada item sparepart)

**Contoh:**
- Stock LCD Samsung A12: 9
- Item dihapus dari ticket
- Stock otomatis: 10

### Warning Stock Menipis

Sistem memberikan peringatan ketika stock mendekati batas minimum.

**Default threshold:**
- Stock di bawah 5 unit = warning

**Lokasi warning:**
- Overview dashboard (Admin)
- Halaman Sparepart (ada badge warning)
- Saat tambah item ke ticket (jika stock tidak cukup)

### Manual Stock Adjustment

Admin bisa mengubah stock secara manual:

1. Buka menu **Inventory** → **Sparepart**
2. Edit sparepart yang ingin diubah stocknya
3. Ubah nilai stock
4. Simpan

**Kapan perlu manual adjustment:**
- Restock dari supplier
- Stock opname
- Koreksi stock

---

## Service Pricelist

### Konsep Dasar

Service Pricelist adalah template harga jasa servis. Berguna untuk:
- Mempercepat input biaya jasa
- Standardisasi harga jasa
- Memudahkan teknisi menambahkan biaya

### Contoh Service Pricelist

| Nama Jasa | Harga Default |
|-----------|---------------|
| Ganti LCD | Rp 150.000 |
| Ganti Baterai | Rp 75.000 |
| Repair IC | Rp 200.000 |
| Software / Flashing | Rp 100.000 |
| Ganti Konektor Charge | Rp 50.000 |
| Ganti Speaker | Rp 50.000 |
| Ganti Mic | Rp 50.000 |
| Cleaning | Rp 25.000 |

### Mengelola Service Pricelist (Admin Only)

#### Membuat Jasa Baru

1. Buka menu **Inventory** → **Service Pricelist**
2. Klik tombol **"Add Service"** atau **"New"**
3. Isi form:
   - **Nama Jasa**: Deskripsi jasa (contoh: "Ganti LCD")
   - **Harga Default**: Harga default (contoh: 150000)
4. Klik **"Save"**

#### Edit Jasa

1. Buka menu **Inventory** → **Service Pricelist**
2. Cari jasa yang ingin diedit
3. Klik **"Edit"**
4. Ubah nama atau harga
5. Klik **"Save"**

#### Hapus Jasa

1. Buka menu **Inventory** → **Service Pricelist**
2. Cari jasa yang ingin dihapus
3. Klik **"Delete"**
4. Konfirmasi penghapusan

**Pembatasan:**
- Jasa yang sudah dipakai di service ticket **tidak bisa dihapus**
- Solusi: rename menjadi "[UNUSED]" atau nonaktifkan (jika ada fitur nonaktif)

---

## Menggunakan Sparepart di Service Ticket

### Untuk Teknisi

1. Buka halaman **Task** → tab **"Dikerjakan"**
2. Klik ticket yang ingin ditambahkan item
3. Di bagian **"Items"**, klik **"Add Item"**
4. Pilih **"Sparepart"**
5. Ketik nama sparepart atau pilih dari dropdown
6. Pilih quantity
7. Harga otomatis terisi dari harga default
8. Klik **"Save"**

**Penting:**
- Sistem akan cek stock sebelum menambahkan
- Jika stock tidak cukup, akan muncul warning
- Stock berkurang otomatis setelah item ditambahkan

### Untuk Admin/Staff

1. Buka halaman **Service**
2. Klik ticket yang ingin ditambahkan item
3. Di bagian **"Items"**, klik **"Add Item"**
4. Pilih **"Sparepart"**
5. Pilih sparepart dari inventory
6. Set quantity
7. Harga bisa diubah jika perlu
8. Klik **"Save"**

---

## Menggunakan Jasa di Service Ticket

### Cara 1: Dari Pricelist

1. Di bagian **"Items"**, klik **"Add Item"**
2. Pilih **"Jasa Servis"**
3. Pilih dari pricelist yang tersedia
4. Harga otomatis terisi dari pricelist
5. Klik **"Save"**

### Cara 2: Manual

1. Di bagian **"Items"**, klik **"Add Item"**
2. Pilih **"Jasa Servis"**
3. Pilih **"Custom"** atau ketik nama jasa baru
4. Isi nama jasa secara manual
5. Isi harga secara manual
6. Klik **"Save"**

---

## FAQ

### Q: Bagaimana cara mengetahui sparepart mana yang sering dipakai?

Lihat kolom **"Digunakan"** di daftar sparepart. Menunjukkan berapa kali sparepart tersebut dipakai di servis.

### Q: Bisakah satu sparepart kompatibel dengan banyak device?

**Ya.** Saat membuat sparepart dengan tipe "Compatible", bisa pilih beberapa device yang kompatibel.

### Q: Apa yang terjadi jika stock habis?

- Sistem akan memberikan warning saat tambah item
- Teknisi/Admin tetap bisa menambahkan item (dengan warning)
- Stock bisa menjadi negatif (tergantung konfigurasi)

### Q: Bisakah mengubah harga saat menambahkan ke ticket?

**Ya.** Harga default dari inventory/pricelist bisa diubah saat menambahkan ke ticket tertentu. Perubahan harga hanya berlaku untuk ticket tersebut.

### Q: Bagaimana cara menambah stock setelah restock?

1. Edit sparepart
2. Ubah nilai stock (tambah sesuai jumlah restock)
3. Simpan

Contoh: Stock saat ini 5, restock 20 → ubah stock menjadi 25

---

## Tips Praktis

### Untuk Admin

1. **Kelola inventory secara rutin**
   - Update stock setiap ada restock
   - Cek sparepart dengan stock menipis
   - Hapus sparepart yang sudah tidak dipakai (jika memungkinkan)

2. **Standardisasi nama sparepart**
   - Gunakan format konsisten
   - Contoh: "[Nama Part] [Brand] [Model] [Grade]"
   - Contoh: "LCD Samsung Galaxy A12 Original"

3. **Kelola pricelist**
   - Buat template jasa yang sering dipakai
   - Update harga sesuai standar toko

### Untuk Staff/Teknisi

1. **Cek stock sebelum janji ke customer**
   - Hindari janji servis jika stock tidak ada
   - Koordinasi dengan Admin untuk restock

2. **Gunakan pricelist untuk konsistensi**
   - Pilih dari pricelist daripada input manual
   - Harga lebih konsisten antar teknisi

3. **Laporkan jika ada masalah**
   - Sparepart tidak ada di inventory tapi dibutuhkan
   - Harga di pricelist tidak sesuai
   - Stock di sistem tidak sesuai aktual