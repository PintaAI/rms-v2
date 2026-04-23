# Service Ticket

Dokumen ini menjelaskan pembuatan dan pengelolaan ticket servis yang ada di aplikasi saat ini.

---

## Isi Ticket

| Field | Wajib | Keterangan |
|---|---|---|
| Device | Ya | Brand dan model dari katalog global |
| WhatsApp | Ya | Nomor kontak customer |
| Nama customer | Tidak | Boleh kosong |
| Complaint | Ya | Keluhan unit |
| Password / pattern | Tidak | Bisa teks atau pattern lock |
| IMEI | Tidak | Nomor IMEI unit |
| Teknisi | Tidak | Diisi lewat assignment atau takeover |

Contoh tabel service:

:::demo ServiceTable

Contoh detail task / service:

:::demo ServiceCard

---

## Membuat Ticket Baru

Ticket baru hanya bisa dibuat oleh Admin atau Staff.

Langkah:

1. Buka menu `Service`
2. Klik `New Service`
3. Pilih device dari hasil pencarian, atau ketik device baru lalu buat dari form
4. Isi WhatsApp customer
5. Isi nama customer jika perlu
6. Isi complaint
7. Isi password teks atau pattern lock jika perlu
8. Isi IMEI jika perlu
9. Simpan ticket

Hasilnya:

- ticket dibuat dengan status `Masuk`
- teknisi belum ditugaskan
- invoice belum ada sampai item pertama ditambahkan

---

## Device Input

Field device memakai katalog global `Brand + Model`.

Perilaku saat ini:

- pencarian menampilkan device yang sudah ada
- jika tidak ditemukan, tombol `Create` akan membuat brand/model baru
- device baru langsung bisa dipakai untuk ticket yang sedang dibuat

---

## Edit Ticket

Admin dan Staff bisa mengedit ticket selama servis belum pickup.

Field yang bisa diubah:

- device
- WhatsApp
- nama customer
- complaint
- password / pattern
- IMEI

Setelah `Picked Up`:

- ticket tidak bisa diedit lagi

---

## Assignment Teknisi

### Dari halaman Admin Service

Kolom `Technician` di tabel Admin bisa dipakai untuk:

- assign teknisi ke ticket
- ganti teknisi
- unassign teknisi

Perilaku penting:

- jika ticket masih `Masuk` lalu di-assign, status berubah ke `Proses`
- jika ticket di-unassign, status servis tidak otomatis kembali ke `Masuk`

### Dari halaman Task Teknisi

Teknisi bisa mengambil task sendiri dari `Task > Tersedia`.

Perilaku penting:

- task `Masuk` tanpa teknisi akan berubah ke `Proses`
- task `Masuk` atau `Proses` yang dimiliki teknisi lain bisa di-takeover

---

## Detail Servis

Sheet detail servis saat ini tersedia untuk:

- Admin dari halaman `Service`
- Teknisi dari halaman `Overview` atau `Task`

Di detail servis, pengguna yang punya akses bisa:

- melihat complaint, pattern, IMEI, dan item
- menambah item sparepart atau jasa
- menghapus item
- mark `Selesai`
- mark `Gagal`
- `Undo` servis yang sudah selesai / gagal

Staff saat ini tidak punya workflow detail task yang setara.

---

## Item Dalam Servis

Jenis item yang didukung saat ini:

1. `Sparepart`
2. `Service`

Perilaku saat ini:

- sparepart dipilih dari daftar sparepart kompatibel / universal milik toko
- jasa dipilih dari daftar pricelist jasa milik toko
- dialog item saat ini **tidak** mendukung input jasa manual di luar pricelist
- saat sparepart ditambahkan, stock langsung berkurang
- saat item sparepart dihapus, stock kembali ke inventory

---

## Hapus Ticket

Admin dan Staff bisa menghapus ticket, tetapi ada batasan backend:

- tidak bisa hapus jika servis sudah pickup
- tidak bisa hapus jika invoice sudah `Paid`

Jika ticket dihapus:

- item servis ikut dihapus
- invoice ikut dihapus
- stock sparepart yang sudah dipakai akan dikembalikan

---

## Ringkasan Praktis

1. Admin / Staff membuat ticket baru
2. Admin assign teknisi atau teknisi ambil task sendiri
3. Admin / teknisi yang berwenang mengelola item dari detail servis
4. Teknisi atau Admin menutup pekerjaan dengan `Selesai` atau `Gagal`
5. Staff / Admin menangani pembayaran dan pickup
