# Invoice & Pembayaran

Dokumen ini mengikuti perilaku invoice dan payment yang ada di aplikasi saat ini.

---

## Invoice Dibuat Kapan?

Invoice tidak dibuat saat ticket baru dibuat.

Invoice akan muncul setelah ada item pertama pada servis, lalu grand total dihitung dari semua item aktif.

Contoh tampilan invoice:

:::demo Invoice

---

## Komponen Invoice

Invoice mengambil data dari item servis:

| Field | Keterangan |
|---|---|
| Nama item | Nama sparepart, jasa, atau item manual |
| Type | `sparepart` atau `service` |
| Qty | Jumlah item |
| Price | Harga satuan |
| Grand total | Total semua item |
| DP amount | Nominal uang muka jika status `DP` |

---

## Status Pembayaran

| Status | Arti |
|---|---|
| `Unpaid` | Invoice belum dibayar |
| `DP` | Invoice sudah memiliki uang muka |
| `Paid` | Invoice sudah dibayar |

Perubahan status yang didukung saat ini:

| Dari | Ke | Cara |
|---|---|---|
| Unpaid | DP | Tombol `DP` / mark DP |
| Unpaid | Paid | Tombol `Bayar` |
| DP | Paid | Tombol `Bayar` |

Tidak ada alur `Paid -> Unpaid`.

---

## Siapa Yang Bisa Mengubah Invoice?

| Aksi | Admin | Staff | Teknisi |
|---|---|---|---|
| Tambah item | ✓ | ✗ | ✓* |
| Hapus item | ✓ | ✗ | ✓* |
| Mark DP | ✓ | ✓ | ✗ |
| Mark paid | ✓ | ✓ | ✗ |

`*` Teknisi hanya pada task yang ditugaskan ke dirinya.

---

## Menambah Item

Item bisa ditambahkan dari detail servis oleh Admin atau teknisi yang assigned.

Jenis item yang didukung saat ini:

1. sparepart dari inventory toko
2. jasa dari pricelist toko
3. item manual jika fitur manual item aktif

Perilaku penting:

- total invoice otomatis dihitung ulang
- stock sparepart langsung berkurang
- jika stock kurang, item gagal ditambahkan
- item manual tidak mengubah stok inventory

---

## Menghapus Item

Item bisa dihapus dari detail servis oleh Admin atau teknisi yang assigned.

Perilaku penting:

- grand total invoice dihitung ulang
- jika item adalah sparepart, stock dikembalikan
- servis yang sudah pickup tidak bisa diubah lagi

---

## Mark Paid

`Bayar` saat ini hanya bisa dilakukan oleh Staff atau Admin, dengan syarat:

- invoice memang sudah ada
- status servis `Selesai` atau `Gagal`
- servis belum `Picked Up`
- invoice belum `Paid`

Saat `Bayar` berhasil:

- payment status berubah ke `Paid`
- `paidAt` disimpan
- status servis tidak berubah

---

## Mark DP

`DP` dipakai untuk mencatat uang muka customer sebelum invoice lunas.

Syarat umum:

- invoice sudah ada
- invoice belum `Paid`
- invoice belum memiliki status `DP`
- nominal DP lebih besar dari 0

Saat DP berhasil:

- payment status berubah ke `DP`
- `dpAmount` disimpan
- invoice tidak dianggap lunas sampai ditandai `Paid`
- ticket dengan invoice `DP` tidak bisa dihapus seperti invoice paid

---

## Picked Up

`Picked up` hanya bisa dilakukan oleh Staff atau Admin, dengan syarat:

- status servis `Selesai` atau `Gagal`
- servis belum pickup sebelumnya

Saat pickup berhasil:

- sistem mengisi flag `Picked Up`
- sistem mengisi `Picked Up At`
- servis tidak bisa diubah lagi

**Penting:** pickup tidak otomatis menandai invoice sebagai `Paid`.

Jika ingin data pembayaran benar:

1. tandai `DP` jika customer baru membayar uang muka
2. tandai invoice `Bayar` bila customer sudah melunasi
3. lalu lakukan `Picked up`

---

## Perbedaan DP, Bayar, Dan Picked Up

| Aspek | DP | Bayar | Picked up |
|---|---|---|---|
| Mengubah payment status | Ya, ke `DP` | Ya, ke `Paid` | Tidak |
| Mengubah status servis | Tidak | Tidak | Tidak |
| Menambah flag picked up | Tidak | Tidak | Ya |
| Mengunci servis dari perubahan lanjut | Sebagian | Tidak penuh | Ya |

---

## Catatan Tambahan

- Invoice yang sudah `Paid` bisa dibuka dari tabel service untuk melihat detail invoice.
- DP tersimpan sebagai nominal uang muka, tetapi belum ada alur refund atau `Paid -> Unpaid`.
- Jika ticket dihapus sebelum paid, sebelum DP, dan sebelum pickup, invoice ikut terhapus.
