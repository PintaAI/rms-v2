# Invoice & Pembayaran

Dokumen ini mengikuti perilaku invoice dan payment yang ada di aplikasi saat ini.

---

## Invoice Dibuat Kapan?

Invoice **tidak** dibuat saat ticket baru dibuat.

Invoice akan muncul setelah ada item pertama pada servis, lalu grand total dihitung dari semua item aktif.

Contoh tampilan invoice:

:::demo Invoice

---

## Komponen Invoice

Invoice mengambil data dari item servis:

| Field | Keterangan |
|---|---|
| Nama item | Nama sparepart atau jasa |
| Type | `sparepart` atau `service` |
| Qty | Jumlah item |
| Price | Harga satuan |
| Grand total | Total semua item |

---

## Status Pembayaran

| Status | Arti |
|---|---|
| `Unpaid` | Invoice belum dibayar |
| `Paid` | Invoice sudah dibayar |

Perubahan status yang didukung saat ini:

| Dari | Ke | Cara |
|---|---|---|
| Unpaid | Paid | Tombol `Bayar` |

Tidak ada alur `Paid -> Unpaid`.

---

## Siapa Yang Bisa Mengubah Invoice?

| Aksi | Admin | Staff | Teknisi |
|---|---|---|---|
| Tambah item | ✓ | ✗ | ✓* |
| Hapus item | ✓ | ✗ | ✓* |
| Mark paid | ✓ | ✓ | ✗ |

`*` Teknisi hanya pada task yang ditugaskan ke dirinya.

---

## Menambah Item

Item bisa ditambahkan dari detail servis oleh Admin atau teknisi yang assigned.

Jenis item yang didukung saat ini:

1. sparepart dari inventory toko
2. jasa dari pricelist toko

Perilaku penting:

- total invoice otomatis dihitung ulang
- stock sparepart langsung berkurang
- jika stock kurang, item gagal ditambahkan

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
- invoice masih `Unpaid`

Saat `Bayar` berhasil:

- payment status berubah ke `Paid`
- `paidAt` disimpan
- status servis tidak berubah

---

## Picked Up

`Picked up` hanya bisa dilakukan oleh Staff atau Admin, dengan syarat:

- status servis `Selesai` atau `Gagal`
- servis belum pickup sebelumnya

Saat pickup berhasil:

- sistem mengisi flag `Picked Up`
- sistem mengisi `Picked Up At`
- servis tidak bisa diubah lagi

**Penting:** pickup **tidak** otomatis menandai invoice sebagai `Paid`.

Jika ingin data pembayaran benar:

1. tandai invoice `Bayar` lebih dulu bila customer memang sudah membayar
2. lalu lakukan `Picked up`

---

## Perbedaan Bayar vs Picked Up

| Aspek | Bayar | Picked up |
|---|---|---|
| Mengubah payment status | Ya | Tidak |
| Mengubah status servis | Tidak | Tidak |
| Menambah flag picked up | Tidak | Ya |
| Mengunci servis dari perubahan lanjut | Tidak penuh | Ya |

---

## Catatan Tambahan

- Invoice yang sudah `Paid` bisa dibuka dari tabel service untuk melihat detail invoice.
- Tidak ada dukungan partial payment atau DP di alur saat ini.
- Jika ticket dihapus sebelum paid dan sebelum pickup, invoice ikut terhapus.
