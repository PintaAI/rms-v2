# Role & Akses

Dokumen ini mengikuti permission, UI, plan, dan feature gate yang ada di aplikasi saat ini.

---

## Sidebar Per Role

:::demo SidebarNav

---

## Ringkasan Akses

| Fitur | Admin | Staff | Teknisi |
|---|---|---|---|
| Overview | ✓ | ✓ | ✓ |
| Buat service ticket | ✓ | ✓ | ✗ |
| Edit service ticket | ✓ | ✓ | ✗ |
| Hapus service ticket | ✓ | ✓ | ✗ |
| Assign / unassign teknisi dari UI | ✓ | ✗ | ✗ |
| Ambil / takeover task | ✓ | ✗ | ✓ |
| Tambah / hapus item servis | ✓ | ✗ | ✓* |
| Mark done / failed | ✓ | ✗ | ✓* |
| Undo servis selesai / gagal | ✓ | ✗ | ✓* |
| Mark invoice DP | ✓ | ✓ | ✗ |
| Mark invoice paid | ✓ | ✓ | ✗ |
| Picked up | ✓ | ✓ | ✗ |
| Kelola toko | ✓ | ✗ | ✗ |
| Kelola karyawan | ✓ | ✗ | ✗ |
| Kelola inventory | ✓ | ✗ | ✗ |
| Audit gudang | ✓ | ✗ | ✗ |
| Lihat inventory | ✓ | ✓ | ✓ |
| Pengaturan fitur toko | ✓ | ✗ | ✗ |
| Pengaturan WhatsApp toko | ✓ | ✗ | ✗ |

`*` Teknisi hanya untuk task yang ditugaskan ke dirinya.

**Catatan plan:** akses di tabel adalah akses berdasarkan role. Beberapa fitur tetap bisa terkunci oleh plan atau dimatikan dari pengaturan toko, misalnya inventory, karyawan, workflow teknisi/staff, analytics, dan audit gudang.

---

## Admin

### Menu

- `Admin Overview`
- `Toko`
- `Service`
- `Karyawan`
- `Inventory > Sparepart & Jasa`
- `Inventory > Audit Gudang`
- `Settings`

### Yang bisa dilakukan

- membuat, mengedit, dan menghapus ticket servis
- assign dan unassign teknisi dari kolom `Technician`
- membuka detail servis dari tabel untuk tambah item, hapus item, mark `Selesai`, mark `Gagal`, atau `Undo`
- menandai invoice `DP` atau `Paid`
- melakukan `Picked up`
- membuat, edit, hapus, dan pindah antar toko
- menambah dan menghapus karyawan
- membuat, edit, hapus, restock, dan cetak label sparepart
- membuat, edit, dan hapus jasa
- memulai, mengisi, membatalkan, dan menyelesaikan audit gudang
- mengatur fitur toko, plan, tampilan toko, dan koneksi WhatsApp

### Dashboard Admin

Admin Overview saat ini menampilkan:

- total service
- service sedang diperbaiki
- service selesai
- service gagal
- pendapatan bulan ini
- pending bulan ini
- pendapatan hari ini
- jumlah low stock item
- service terbaru
- activity log terbaru

Beberapa metrik seperti revenue analytics dan activity log mengikuti akses plan.

---

## Staff

### Menu

- `Staff Overview`
- `Service`
- `Inventory`

### Yang bisa dilakukan

- membuat ticket servis baru
- mengedit ticket selama belum pickup
- menghapus ticket selama belum pickup dan invoice belum paid/DP
- menandai invoice `DP` atau `Paid`
- melakukan `Picked up`

### Batasan penting

- Staff tidak punya assignment teknisi dari UI saat ini.
- Staff tidak punya sheet detail task untuk menambah item atau mengubah status servis.
- Perubahan inventory diblokir di backend untuk non-admin.
- Jika fitur staff workflow dikunci oleh plan atau dimatikan toko, akses staff bisa tidak tersedia.

### Dashboard Staff

Staff Overview saat ini menampilkan:

- total service
- service sedang diperbaiki
- service selesai
- jumlah low stock item
- ringkasan service hari ini dan 7 hari terakhir
- service terbaru

---

## Teknisi

### Menu

- `Teknisi Overview`
- `Task`
- `Inventory`

### Yang bisa dilakukan

- melihat task tersedia
- mengambil task baru
- takeover task yang sedang dipegang teknisi lain
- membuka detail task
- menambah sparepart, jasa, atau item manual sesuai fitur yang aktif
- menghapus item dari task yang dikerjakan
- menandai `Selesai` atau `Gagal`
- melakukan `Undo` untuk task selesai / gagal miliknya selama belum pickup

### Batasan penting

- Teknisi tidak bisa membuat ticket baru.
- Teknisi tidak bisa mark DP, mark paid, atau pickup.
- Inventory teknisi bersifat read-only.
- Jika fitur technician workflow dikunci oleh plan atau dimatikan toko, akses task teknisi bisa tidak tersedia.

### Dashboard Teknisi

Teknisi Overview saat ini menampilkan:

- jumlah task tersedia
- jumlah task sedang proses
- jumlah task selesai
- jumlah task yang diambil dalam 30 hari
- daftar task tersedia
- daftar task aktif milik sendiri

---

## Catatan Multi-Toko

- Admin bisa punya lebih dari satu toko dan berpindah toko dari halaman `Toko`.
- Staff dan teknisi hanya bisa membuka toko yang memang masuk assignment mereka.
- Jumlah toko, staff, dan teknisi mengikuti limit plan aktif.
