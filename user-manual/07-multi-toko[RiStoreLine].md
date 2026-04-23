# Multi-Toko

Fitur multi-toko di RMS saat ini dipakai untuk memisahkan data operasional per toko dan memungkinkan Admin berpindah konteks toko.

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

---

## Edit Toko

Form edit toko saat ini mendukung:

- nama toko
- logo
- alamat
- telepon
- status `active` / `inactive`

---

## Hapus Toko

Admin bisa menghapus toko yang dimiliki, tetapi ada batasan penting:

- toko terakhir **tidak bisa** dihapus
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

---

## Karyawan Di Multi-Toko

Halaman `Karyawan` saat ini dikelola per toko aktif.

Yang tersedia saat ini:

- tambah karyawan baru untuk toko aktif
- hapus karyawan dari toko aktif
- lihat performa 30 hari terakhir

Yang **belum** ada di UI saat ini:

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

---

## Catatan Login Dan Redirect

- `/dashboard` mengarahkan user ke toko pertama yang bisa diakses.
- Admin tanpa toko diarahkan ke onboarding.
- Staff dan teknisi tanpa assignment toko tidak bisa menggunakan dashboard toko.
