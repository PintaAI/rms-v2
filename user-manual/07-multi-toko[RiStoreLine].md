# Multi-Toko

Fitur multi-toko di RMS dipakai untuk memisahkan data operasional per toko dan memungkinkan Admin berpindah konteks toko. Jumlah toko yang bisa dibuat mengikuti plan aktif.

---

## Apa Yang Dipisahkan Per Toko?

| Data | Per toko? |
|---|---|
| Service ticket | Ya |
| Sparepart | Ya |
| Jasa / pricelist | Ya |
| Karyawan staff | Ya |
| Karyawan teknisi | Ya |
| Overview stats | Ya |
| Pengaturan fitur toko | Ya |
| WhatsApp setting | Ya |

Data global yang dipakai semua toko:

| Data | Global? |
|---|---|
| Brand device | Ya |
| Model device (`HpCatalog`) | Ya |

---

## Halaman Toko

Admin mengelola toko dari halaman `Toko`.

Yang tersedia saat ini:

- lihat semua toko yang terhubung ke akun admin
- pindah ke toko lain dengan klik card toko
- tambah toko baru
- edit toko yang ada
- hapus toko

Jika plan aktif memiliki limit toko, tombol tambah toko bisa gagal saat limit tercapai.

---

## Membuat Toko Baru

Form `Add Toko` saat ini mendukung:

- nama toko
- logo opsional
- alamat opsional
- nomor telepon opsional

Setelah toko dibuat:

- daftar toko di sidebar/header ikut berubah setelah refresh data user
- admin diarahkan ke dashboard toko baru
- onboarding bisa merekomendasikan plan dan fitur berdasarkan kebutuhan toko
- fitur opsional yang tidak dibutuhkan bisa dimatikan agar toko tetap sederhana

---

## Edit Toko

Form edit toko saat ini mendukung:

- nama toko
- logo
- alamat
- telepon
- status `active` / `inactive`

Pengaturan lanjutan toko tersedia dari settings Admin, termasuk fitur, WhatsApp, billing/premium, dan tampilan.

---

## Hapus Toko

Admin bisa menghapus toko yang dimiliki, tetapi ada batasan penting:

- toko terakhir tidak bisa dihapus
- jika toko yang sedang aktif dihapus, aplikasi akan pindah ke toko admin lain yang masih tersisa
- jika tidak ada toko lain, aplikasi kembali ke `/dashboard`

Karena penghapusan dilakukan langsung pada data toko, seluruh data yang berelasi pada toko tersebut ikut terdampak sesuai relasi database.

---

## Pindah Antar Toko

Cara pindah toko saat ini:

1. buka menu `Toko`
2. klik card toko lain
3. aplikasi pindah ke route `/<tokoid>/admin`

Setelah pindah toko, halaman berikut memakai data toko aktif:

- overview
- service
- inventory
- karyawan
- settings

---

## Karyawan Di Multi-Toko

Halaman `Karyawan` saat ini dikelola per toko aktif.

Yang tersedia saat ini:

- tambah karyawan baru untuk toko aktif
- hapus karyawan dari toko aktif
- lihat performa 30 hari terakhir

Yang belum ada di UI saat ini:

- edit data karyawan
- pindahkan karyawan ke toko lain
- reset password dari halaman karyawan

---

## Servis Dan Inventory Per Toko

Saat membuat ticket atau item inventory, data otomatis masuk ke toko yang sedang aktif.

Artinya:

- service di toko A tidak muncul di toko B
- stock sparepart di toko A tidak memengaruhi toko B
- jasa di toko A hanya muncul di service toko A
- WhatsApp toko A tidak otomatis dipakai toko B
- fitur yang dimatikan di toko A tidak otomatis dimatikan di toko B

---

## Plan Dan Limit Multi-Toko

Limit default saat ini:

| Plan | Toko | Staff | Teknisi | Service / bulan | Invoice / bulan |
|---|---:|---:|---:|---:|---:|
| Free | 1 | 0 | 0 | 50 | 50 |
| Premium | 3 | 5 | 5 | Unlimited | Unlimited |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |

Catatan:

- limit diterapkan saat membuat toko atau menambah karyawan
- fitur tertentu tetap bisa terkunci walaupun toko sudah ada
- Admin bisa melihat fitur aktif/terkunci dari settings toko

---

## Catatan Login Dan Redirect

- `/dashboard` mengarahkan user ke toko pertama yang bisa diakses.
- Admin tanpa toko diarahkan ke onboarding.
- Staff dan teknisi tanpa assignment toko tidak bisa menggunakan dashboard toko.
