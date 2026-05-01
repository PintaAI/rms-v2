# Inventory

Inventory saat ini terdiri dari `Sparepart`, `Jasa`, restock, label barcode, scanner HP untuk restock, dan `Audit Gudang`.

---

## Akses Inventory

| Role | Akses utama |
|---|---|
| Admin | Kelola sparepart, kelola jasa, restock, label barcode, dan audit gudang |
| Staff | Lihat inventory |
| Teknisi | Lihat inventory |

**Catatan:** backend membatasi perubahan inventory hanya untuk Admin. Fitur inventory membutuhkan akses plan yang sesuai dan bisa dimatikan dari pengaturan toko.

---

## Halaman Admin Inventory

Halaman `Inventory` Admin saat ini punya:

- tab `Sparepart`
- tab `Jasa`
- pencarian terpisah untuk tiap tab
- mode tampilan `table` dan `card` untuk daftar inventory
- restock sparepart
- cetak label barcode sparepart

Menu tambahan Admin:

- `Audit Gudang`

---

## Sparepart

### Data yang disimpan

| Field | Keterangan |
|---|---|
| Nama | Nama sparepart |
| Barcode | Kode unik sparepart per toko untuk scanner dan label |
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
- pencarian restock berdasarkan barcode, ID, atau nama sparepart
- badge stock berwarna sesuai kondisi
- badge kompatibilitas untuk maksimal 3 device pertama, lalu `+N more`

Yang tidak ada saat ini:

- filter stok menipis
- filter universal / compatible
- pencarian berdasarkan nama device di UI inventory

---

## Restock Dan Scanner

Restock sparepart dipakai untuk menambah stok sparepart yang sudah ada.

Input restock yang didukung:

1. ketik barcode / ID / nama sparepart
2. scanner hardware yang mengisi input lalu menekan `Enter`
3. HP sebagai scanner melalui tombol `Scan via HP`

Alur scanner HP:

1. Admin membuka dialog `Restock Sparepart`
2. klik `Scan via HP`
3. sistem menampilkan QR pairing desktop
4. buka scanner dari HP dengan memindai QR tersebut
5. HP mengirim hasil barcode ke dialog restock melalui koneksi WebRTC

Catatan penting:

- scanner HP saat ini dipakai untuk restock sparepart
- format yang didukung di scanner HP adalah QR dan Code128
- QR pairing memiliki waktu kedaluwarsa dan bisa dibuat ulang
- scanner HP tidak menggantikan seluruh input barcode di aplikasi

---

## Label Barcode

Admin bisa mencetak label barcode untuk sparepart. Label ini membantu proses restock dan bisa dipakai oleh scanner hardware maupun scanner HP.

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

`Audit Gudang` digunakan untuk mencocokkan stock sistem dengan hitungan fisik sparepart di toko.

Audit Gudang adalah fitur Enterprise dan hanya bisa dijalankan Admin jika fitur `Audit Gudang` aktif untuk toko tersebut.

### Alur utama

- Admin klik `Mulai Audit`.
- Sistem snapshot semua sparepart toko, termasuk stock sistem dan harga sparepart saat audit dimulai.
- Admin mengisi stock fisik setiap sparepart.
- Sistem menghitung selisih, nilai selisih, dan potensi hilang untuk item yang stock fisiknya lebih kecil dari sistem.
- Jika ada mismatch, Admin memilih alasan sebelum audit bisa diselesaikan.
- Saat audit selesai, stock sistem otomatis disesuaikan ke stock fisik.

### Alasan mismatch

Alasan yang tersedia:

- dipakai service tapi belum dicatat
- barang hilang
- barang rusak
- stock masuk belum dicatat
- salah stock sebelumnya
- salah hitung fisik
- lainnya

`Potensi hilang` adalah estimasi untuk investigasi, bukan kerugian final. Mismatch bisa terjadi karena proses operasional, misalnya teknisi lupa input sparepart ke service.

### Batasan

- satu toko hanya bisa punya satu audit aktif
- audit hanya untuk sparepart, bukan jasa
- audit yang sudah selesai menyimpan riwayat dan activity log
- audit selesai akan menyesuaikan stock sistem ke stock fisik

---

## Catatan Per Role

### Admin

- bisa tambah, edit, dan hapus sparepart
- bisa tambah, edit, dan hapus jasa
- bisa restock sparepart dan mencetak label barcode
- bisa menjalankan audit gudang dan menyelesaikannya untuk menyesuaikan stock

### Staff

- gunakan inventory untuk lookup stok dan referensi barang
- perubahan inventory bukan workflow yang didukung untuk Staff

### Teknisi

- inventory teknisi read-only
- digunakan untuk cek ketersediaan sparepart saat mengerjakan task
