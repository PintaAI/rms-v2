# Hutang Supplier

`Hutang Supplier` dipakai untuk mencatat nota supplier yang belum lunas dan pembayaran cicilannya. Fitur ini membantu Admin memantau kewajiban toko tanpa mencampurnya dengan invoice pembayaran customer.

---

## Akses

Hutang Supplier tersedia dari menu Admin:

1. buka sidebar Admin
2. masuk grup `Inventory`
3. klik `Hutang Supplier`

Fitur ini mengikuti akses `inventory.management`.

| Role | Akses |
|---|---|
| Admin | Bisa melihat, menambah, mengedit, membayar, dan menghapus hutang tertentu |
| Staff | Tidak ada menu Hutang Supplier di versi awal |
| Teknisi | Tidak ada menu Hutang Supplier di versi awal |

---

## Apa Itu Hutang Supplier?

Hutang Supplier adalah catatan nota pembelian dari supplier yang belum lunas. Setiap catatan menyimpan:

| Field | Keterangan |
|---|---|
| Supplier | Nama supplier nota tersebut |
| No nota supplier | Nomor invoice atau nota dari supplier jika ada |
| Keterangan | Catatan barang atau konteks pembelian |
| Total hutang | Nilai total nota |
| Dibayar | Total pembayaran yang sudah dicatat |
| Sisa | Total hutang dikurangi jumlah dibayar |
| Jatuh tempo | Tanggal batas pembayaran jika ada |
| Status | Status pelunasan hutang |

---

## Ringkasan Di Halaman

Bagian atas halaman menampilkan kartu ringkasan:

- `Total Sisa Hutang`: total hutang aktif yang belum lunas
- `Total Sudah Dibayar`: akumulasi pembayaran yang sudah dicatat
- `Nota Belum Lunas`: jumlah nota yang masih punya sisa hutang
- `Lewat Jatuh Tempo`: jumlah nota belum lunas dengan jatuh tempo sebelum hari ini

Status lewat jatuh tempo dihitung dari tanggal jatuh tempo dan status hutang. Status ini tidak disimpan sebagai data terpisah.

---

## Cara Tambah Supplier

Saat menambah hutang, Admin bisa memakai supplier yang sudah ada atau membuat supplier baru langsung dari form.

Untuk supplier baru:

1. klik `Tambah Hutang`
2. isi field `Nama supplier baru`
3. lanjutkan isi data hutang
4. klik `Simpan`

Jika `Nama supplier baru` diisi, sistem akan membuat supplier tersebut lebih dulu, lalu membuat hutangnya.

---

## Cara Tambah Hutang

Untuk mencatat nota supplier baru:

1. buka halaman `Hutang Supplier`
2. klik `Tambah Hutang`
3. pilih `Supplier` atau isi `Nama supplier baru`
4. isi `No nota supplier` jika ada
5. isi `Keterangan` jika perlu
6. isi `Total hutang`
7. isi `Dibayar awal` jika sudah ada pembayaran saat nota dibuat
8. isi `Jatuh tempo` jika ada
9. klik `Simpan`

Catatan:

- `Total hutang` harus lebih dari 0
- `Dibayar awal` tidak boleh lebih besar dari total hutang
- Jika `Dibayar awal` diisi, sistem akan membuat riwayat pembayaran awal

---

## Cara Edit Hutang

Klik tombol edit pada baris hutang untuk memperbarui data nota.

Data yang bisa diedit:

- supplier
- no nota supplier
- keterangan
- total hutang
- jatuh tempo

`Dibayar awal` hanya tersedia saat membuat hutang baru. Setelah hutang dibuat, pembayaran tambahan dicatat lewat tombol pembayaran.

Total hutang tidak bisa dibuat lebih kecil dari nominal yang sudah dibayar.

---

## Cara Catat Pembayaran

Untuk mencatat cicilan atau pelunasan:

1. klik tombol pembayaran pada baris hutang yang belum lunas
2. isi `Nominal pembayaran`
3. pilih `Tanggal pembayaran`
4. isi `Catatan` jika perlu
5. cek ringkasan `Sisa sekarang`, `Nominal bayar`, dan `Sisa setelah bayar`
6. klik `Simpan Pembayaran`

Nominal pembayaran harus lebih dari 0 dan tidak boleh melebihi sisa hutang.

---

## Arti Status

| Status | Arti |
|---|---|
| `Belum Dibayar` | Belum ada pembayaran untuk nota tersebut |
| `Sebagian` | Sudah ada pembayaran, tetapi masih ada sisa hutang |
| `Lunas` | Total pembayaran sudah sama dengan total hutang |
| `Lewat Tempo` | Badge tambahan untuk hutang belum lunas yang jatuh temponya sudah lewat |

Hutang dengan status `Lunas` tidak bisa ditambah pembayaran lagi.

---

## Hapus Hutang

Tombol hapus hanya muncul untuk hutang yang belum punya riwayat pembayaran.

Jika hutang sudah pernah dibayar, catatan tidak bisa dihapus dari UI versi awal supaya riwayat pembayaran tetap menjadi sumber audit.

---

## Pencarian

Pencarian di halaman Hutang Supplier saat ini bekerja di sisi tampilan dan mencakup:

- nama supplier
- nomor nota
- keterangan

---

## Batasan Versi Awal

Versi awal Hutang Supplier masih sederhana:

- hanya tersedia untuk Admin
- belum ada filter lanjutan atau pagination server
- belum ada activity log khusus untuk hutang supplier
- belum ada feature gate terpisah; fitur mengikuti `inventory.management`
- riwayat audit utama berasal dari data hutang dan pembayaran yang tersimpan
