# Inventory

Inventory saat ini terdiri dari dua bagian utama: `Sparepart` dan `Jasa`.

---

## Akses Inventory

| Role | Akses utama |
|---|---|
| Admin | Kelola sparepart, kelola jasa, buka audit gudang |
| Staff | Lihat inventory |
| Teknisi | Lihat inventory |

**Catatan:** backend membatasi perubahan inventory hanya untuk Admin.

---

## Halaman Admin Inventory

Halaman `Inventory` Admin saat ini punya:

- tab `Sparepart`
- tab `Jasa`
- pencarian terpisah untuk tiap tab
- mode tampilan `table` dan `card` untuk daftar inventory

Menu tambahan Admin:

- `Audit Gudang`

---

## Sparepart

### Data yang disimpan

| Field | Keterangan |
|---|---|
| Nama | Nama sparepart |
| Default price | Harga default saat dipakai di servis |
| Stock | Jumlah stock saat ini |
| Universal | Bisa dipakai di semua device |
| Compatible devices | Daftar device yang cocok |

### Universal vs compatible

- Jika tidak memilih device kompatibel, sparepart dianggap `Universal`.
- Jika memilih satu atau lebih device, sparepart diperlakukan sebagai sparepart kompatibel.

### Perilaku stock

- stock berkurang saat sparepart dipakai di servis
- stock bertambah saat item sparepart dihapus
- stock juga kembali jika ticket dihapus
- ringkasan low stock memakai batas `<= 5`

### Pencarian dan tampilan

Yang tersedia saat ini:

- pencarian berdasarkan nama sparepart
- badge stock berwarna sesuai kondisi
- badge kompatibilitas untuk maksimal 3 device pertama, lalu `+N more`

Yang **tidak** ada saat ini:

- filter stok menipis
- filter universal / compatible
- pencarian berdasarkan nama device di UI inventory

---

## Jasa

Jasa disimpan sebagai `Service Pricelist` per toko.

### Data yang disimpan

| Field | Keterangan |
|---|---|
| Title | Nama jasa |
| Default price | Harga default |

### Perilaku saat ini

- jasa ditampilkan pada tab `Jasa`
- pencarian berdasarkan title
- jasa dipilih dari daftar ini saat menambah item servis

---

## Menggunakan Inventory Di Servis

Saat menambah item pada detail servis:

- sparepart diambil dari sparepart toko yang universal atau kompatibel dengan device ticket
- jasa diambil dari pricelist jasa toko

Jika stock sparepart tidak cukup:

- penambahan item gagal
- stock tidak berubah

---

## Audit Gudang

Halaman `Audit Gudang` saat ini adalah **mock UI**.

Artinya:

- ada simulasi sesi audit dan input hitung fisik
- tidak ada integrasi ke stock sparepart nyata
- hasil audit belum menulis perubahan ke database inventory

---

## Catatan Per Role

### Admin

- bisa tambah, edit, dan hapus sparepart
- bisa tambah, edit, dan hapus jasa

### Staff

- gunakan inventory untuk lookup stok dan referensi barang
- perubahan inventory bukan workflow yang didukung untuk Staff

### Teknisi

- inventory teknisi read-only
- digunakan untuk cek ketersediaan sparepart saat mengerjakan task
