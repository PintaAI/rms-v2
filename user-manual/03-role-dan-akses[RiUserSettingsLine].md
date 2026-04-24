# Role & Akses

Dokumen ini mengikuti permission dan UI yang ada di codebase saat ini.

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
| Mark invoice paid | ✓ | ✓ | ✗ |
| Picked up | ✓ | ✓ | ✗ |
| Kelola toko | ✓ | ✗ | ✗ |
| Kelola karyawan | ✓ | ✗ | ✗ |
| Kelola inventory | ✓ | ✗ | ✗ |
| Audit gudang | ✓ | ✗ | ✗ |
| Lihat inventory | ✓ | ✓ | ✓ |

`*` Teknisi hanya untuk task yang ditugaskan ke dirinya.

---

## Admin

### Menu

- `Admin Overview`
- `Toko`
- `Service`
- `Karyawan`
- `Inventory > Sparepart & Jasa`
- `Inventory > Audit Gudang`

### Yang bisa dilakukan

- membuat, mengedit, dan menghapus ticket servis
- assign dan unassign teknisi dari kolom `Technician`
- membuka detail servis dari tabel untuk tambah item, hapus item, mark `Selesai`, mark `Gagal`, atau `Undo`
- menandai invoice `Paid`
- melakukan `Picked up`
- membuat, edit, hapus, dan pindah antar toko
- menambah dan menghapus karyawan
- membuat, edit, dan hapus sparepart serta jasa
- memulai, mengisi, membatalkan, dan menyelesaikan audit gudang

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

---

## Staff

### Menu

- `Staff Overview`
- `Service`
- `Inventory`

### Yang bisa dilakukan

- membuat ticket servis baru
- mengedit ticket selama belum pickup
- menghapus ticket selama belum pickup dan invoice belum paid
- menandai invoice `Paid`
- melakukan `Picked up`

### Batasan penting

- Staff **tidak** punya assignment teknisi dari UI saat ini.
- Staff **tidak** punya sheet detail task untuk menambah item atau mengubah status servis.
- Perubahan inventory diblokir di backend untuk non-admin.

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
- menambah sparepart dan jasa dari daftar yang tersedia
- menghapus item dari task yang dikerjakan
- menandai `Selesai` atau `Gagal`
- melakukan `Undo` untuk task selesai / gagal miliknya selama belum pickup

### Batasan penting

- Teknisi tidak bisa membuat ticket baru.
- Teknisi tidak bisa mark paid atau pickup.
- Inventory teknisi bersifat read-only.

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
