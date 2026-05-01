# Overview - RMS

RMS adalah aplikasi untuk mengelola operasional toko servis handphone dari unit masuk sampai pickup. Sistem menyatukan ticket servis, teknisi, inventory sparepart, invoice, pembayaran, notifikasi WhatsApp, dan data multi-toko dalam satu alur kerja.

---

## Gambaran Sistem

- Aplikasi berjalan per toko. Setelah login, pengguna diarahkan ke toko pertama yang bisa diakses.
- Admin yang belum punya toko akan diarahkan ke halaman onboarding.
- Data servis, inventory, jasa, karyawan, fitur, dan WhatsApp dipisahkan per toko.
- Katalog device bersifat global, jadi brand/model yang dibuat sekali bisa dipakai di semua toko.
- Fitur mengikuti plan dan pengaturan toko. Toko kecil bisa memakai mode sederhana, sementara toko besar bisa mengaktifkan inventory, tim, analytics, dan audit gudang sesuai kebutuhan.

---

## Alur Servis Saat Ini

Status servis yang dipakai sistem saat ini:

```mermaid
flowchart LR
    A([Masuk]) --> B([Proses])
    B --> C([Selesai])
    B --> D([Gagal])
    C --> E([Picked Up flag])
    D --> E([Picked Up flag])
```

| Status / Flag | Arti |
|---|---|
| **Masuk** | Ticket baru dibuat dan belum mulai dikerjakan |
| **Proses** | Ticket sedang dikerjakan teknisi |
| **Selesai** | Perbaikan selesai |
| **Gagal** | Pengerjaan dihentikan / tidak berhasil |
| **Picked Up** | Penanda bahwa unit sudah diambil customer |

**Penting:** `Picked Up` bukan status terpisah. Setelah pickup, status servis tetap `Selesai` atau `Gagal`, lalu sistem menambahkan penanda `Picked Up` dan waktu `Picked Up At`.

---

## Role Dan Menu

```mermaid
flowchart TD
    Admin --> AdminOverview
    Admin --> Toko
    Admin --> Service
    Admin --> Karyawan
    Admin --> Inventory
    Admin --> AuditGudang
    Admin --> Settings

    Staff --> StaffOverview
    Staff --> Service
    Staff --> Inventory

    Teknisi --> TeknisiOverview
    Teknisi --> Task
    Teknisi --> Inventory
```

### Admin

- `Admin Overview`
- `Toko`
- `Service`
- `Karyawan`
- `Inventory > Sparepart & Jasa`
- `Inventory > Audit Gudang`
- `Settings > Fitur, WhatsApp, Billing, Tampilan`

### Staff

- `Staff Overview`
- `Service`
- `Inventory`

### Teknisi

- `Teknisi Overview`
- `Task`
- `Inventory`

---

## Fitur Inti Yang Sudah Ada

### Service ticket

- Admin dan Staff bisa membuat ticket baru.
- Device dipilih dari katalog global melalui pencarian.
- Jika device belum ada, form bisa membuat brand/model baru langsung dari input device.
- Field utama ticket: device, WhatsApp, nama customer, keluhan, password/pattern, dan IMEI.
- Nomor WhatsApp divalidasi sebagai nomor Indonesia agar siap dipakai untuk kontak customer dan notifikasi.

### Pengerjaan teknisi

- Teknisi bisa mengambil task `Masuk` yang belum punya teknisi.
- Teknisi juga bisa takeover task `Masuk` atau `Proses` yang sedang dipegang teknisi lain.
- Teknisi yang ditugaskan bisa menambah item sparepart/jasa/manual, menghapus item, lalu menandai `Selesai` atau `Gagal`.
- Workflow teknisi mengikuti akses plan dan pengaturan fitur toko.

### Inventory

- Admin mengelola sparepart dan jasa pada halaman `Inventory`.
- Sparepart bisa `Universal` atau dibatasi ke daftar device tertentu.
- Jasa disimpan sebagai daftar pricelist per toko.
- Stock sparepart otomatis berkurang saat item ditambahkan ke servis, dan kembali saat item dihapus atau ticket dihapus.
- Restock sparepart bisa memakai input manual, scanner hardware, atau HP sebagai scanner melalui QR pairing dari dialog restock.
- `Audit Gudang` membantu Admin mencocokkan stok sistem dengan stok fisik, mencatat alasan selisih, dan menyesuaikan stok dengan riwayat audit.

### Invoice dan pembayaran

- Invoice belum ada saat ticket baru dibuat.
- Invoice muncul dan total dihitung setelah item pertama ditambahkan.
- Status pembayaran yang didukung: `Unpaid`, `DP`, dan `Paid`.
- `Mark DP` menandai invoice sudah memiliki uang muka dan menyimpan nominal DP.
- `Mark Paid` hanya bisa dilakukan pada servis yang sudah `Selesai` atau `Gagal`.
- `Pickup` tidak otomatis mengubah invoice menjadi `Paid`.

### WhatsApp toko

- Admin bisa menghubungkan WhatsApp toko melalui QR dari menu pengaturan.
- Notifikasi otomatis bisa dikirim saat service `Selesai` atau `Gagal` jika koneksi WhatsApp aktif.
- Template pesan bisa memakai placeholder customer, brand, model, toko, dan status.

### Multi-toko

- Admin bisa membuat toko baru, edit toko, pindah toko, dan menghapus toko.
- Toko terakhir tidak bisa dihapus.
- Limit jumlah toko mengikuti plan aktif.

### Simple mode dan plan

- Plan `Free` cocok untuk owner-operated shop: satu toko, ticket dasar, item manual, dan invoice dengan batas bulanan.
- Fitur tim, inventory, workflow teknisi/staff, analytics, activity log, dan audit gudang bisa terkunci jika plan belum memenuhi syarat.
- Admin bisa mematikan fitur opsional per toko dari `Pengaturan Fitur` agar tampilan tidak terlalu ramai.

---

## Catatan Penting

- Halaman Staff tidak punya workflow assignment teknisi di UI saat ini.
- Perubahan inventory dibatasi ke Admin di backend dan juga mengikuti akses fitur plan.
- Invoice dibuka dari tabel saat statusnya `Paid`.
- Ticket yang sudah `Picked Up` tidak bisa diedit, diubah statusnya, atau dihapus.
- Phone scanner saat ini dipakai untuk restock sparepart, bukan untuk semua input di aplikasi.

---

## Dokumentasi Lanjutan

| Dokumen | Isi |
|---|---|
| [Alur Servis](?doc=02-alur-servis) | Status, transisi, pickup, dan takeover |
| [Role & Akses](?doc=03-role-dan-akses) | Hak akses per role dan pengaruh plan |
| [Service Ticket](?doc=04-service-ticket) | Pembuatan dan pengelolaan ticket |
| [Inventory](?doc=05-inventory) | Sparepart, jasa, restock, scanner, dan audit gudang |
| [Invoice & Pembayaran](?doc=06-invoice-pembayaran) | Cara kerja invoice, DP, paid, dan pickup |
| [Multi-Toko](?doc=07-multi-toko) | Pengelolaan toko, isolasi data, dan limit plan |
| [Fitur Lanjutan & Plan](?doc=08-fitur-lanjutan-dan-plan) | WhatsApp, scanner HP, simple mode, dan feature gate |
