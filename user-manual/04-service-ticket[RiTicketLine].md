# Service Ticket

Dokumen ini menjelaskan pembuatan dan pengelolaan ticket servis yang ada di aplikasi saat ini.

---

## Isi Ticket

| Field | Wajib | Keterangan |
|---|---|---|
| Device | Ya | Brand dan model dari katalog global |
| WhatsApp | Ya | Nomor kontak customer, divalidasi sebagai nomor Indonesia |
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
- nomor WhatsApp tersimpan untuk kontak customer dan notifikasi otomatis jika WhatsApp toko aktif

---

## Device Input

Field device memakai katalog global `Brand + Model`.

Perilaku saat ini:

- pencarian menampilkan device yang sudah ada
- jika tidak ditemukan, tombol `Create` akan membuat brand/model baru
- device baru langsung bisa dipakai untuk ticket yang sedang dibuat
- daftar device disimpan sebagai katalog global, bukan per toko
- browser menyimpan cache katalog lokal dan mengambil versi baru saat katalog berubah

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

Assignment teknisi membutuhkan fitur `Workflow Teknisi`. Jika plan belum mendukung atau fitur dimatikan dari pengaturan toko, workflow teknisi bisa terkunci.

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
- menambah item sparepart, jasa, atau manual item sesuai fitur yang aktif
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
3. item manual, jika fitur `Tambah Invoice Manual` aktif

Perilaku saat ini:

- sparepart dipilih dari daftar sparepart kompatibel / universal milik toko
- jasa dipilih dari daftar pricelist jasa milik toko
- item manual bisa dipakai untuk toko sederhana yang tidak memakai inventory/pricelist lengkap
- saat sparepart ditambahkan, stock langsung berkurang
- saat item sparepart dihapus, stock kembali ke inventory
- penambahan sparepart membutuhkan fitur inventory aktif

---

## Hapus Ticket

Admin dan Staff bisa menghapus ticket, tetapi ada batasan backend:

- tidak bisa hapus jika servis sudah pickup
- tidak bisa hapus jika invoice sudah `Paid` atau `DP`

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
5. Staff / Admin menangani DP, pembayaran lunas, dan pickup
