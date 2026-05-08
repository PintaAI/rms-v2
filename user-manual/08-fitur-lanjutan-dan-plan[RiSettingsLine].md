# Fitur Lanjutan & Plan

Dokumen ini merangkum fitur tambahan yang membuat RMS lebih dari sekadar ticket servis: WhatsApp toko, katalog device global, scanner HP, feature gate, dan simple mode.

---

## Simple Mode Untuk Free User

Plan `Free` dirancang agar toko kecil bisa mulai tanpa bloat.

Yang cocok untuk Free:

- satu toko
- owner/admin mengelola sendiri
- ticket servis dasar
- invoice dan item manual
- belum membutuhkan staff, teknisi terpisah, inventory lengkap, analytics, atau audit gudang

Limit Free saat ini:

| Limit | Nilai |
|---|---:|
| Toko | 1 |
| Staff | 0 |
| Teknisi | 0 |
| Service per bulan | 50 |
| Invoice per bulan | 50 |

Jika toko mulai membutuhkan tim, inventory, dan laporan, onboarding akan merekomendasikan upgrade sesuai jawaban kebutuhan.

---

## Feature Gate Dan Pengaturan Fitur

RMS memiliki registry fitur berdasarkan plan dan role.

Contoh fitur Free:

- dashboard overview
- manajemen toko dasar
- manajemen service
- invoice service
- item manual

Contoh fitur Premium:

- inventory management
- manajemen karyawan
- workflow staff
- workflow teknisi
- activity log
- revenue analytics

Contoh fitur Enterprise:

- audit gudang

Admin bisa membuka `Pengaturan Fitur` untuk melihat fitur yang aktif, terkunci, atau dimatikan untuk toko tersebut. Fitur opsional bisa dimatikan agar UI toko tetap sederhana.

---

## WhatsApp Toko

Admin bisa menghubungkan WhatsApp toko dari settings Admin.

Alur utama:

1. buka settings Admin
2. buka tab WhatsApp
3. klik `Connect WhatsApp`
4. scan QR dari WhatsApp toko/admin melalui menu perangkat tertaut
5. refresh status sampai koneksi terbuka

Jika aktif, sistem bisa mengirim notifikasi otomatis saat service:

- `Selesai`
- `Gagal`

Template pesan mendukung placeholder:

- `{customerName}`
- `{brand}`
- `{model}`
- `{tokoName}`
- `{status}`

Catatan:

- WhatsApp yang dihubungkan adalah WhatsApp milik toko/admin, bukan WhatsApp customer
- notifikasi hanya dikirim jika koneksi terbuka dan toggle notifikasi aktif
- sistem menyimpan waktu notifikasi agar tidak double-send untuk service yang sama

---

## Katalog Device Global

Brand dan model HP disimpan sebagai katalog global.

Manfaat:

- input ticket lebih cepat karena device bisa dicari
- device yang dibuat sekali bisa dipakai semua toko
- kompatibilitas sparepart bisa mengacu ke katalog yang sama
- browser menyimpan cache katalog dan refresh saat versi berubah

Jika device belum ada saat membuat ticket, Admin bisa membuat brand/model baru langsung dari input device.

---

## HP Sebagai Scanner

RMS mendukung HP sebagai scanner barcode untuk restock sparepart.

Alur singkat:

1. Admin buka dialog `Restock Sparepart`
2. klik `Scan via HP`
3. desktop menampilkan QR pairing
4. HP membuka halaman scanner dari QR tersebut
5. HP mengirim hasil scan ke desktop lewat koneksi realtime RMS
6. desktop memproses barcode untuk memilih sparepart restock

Yang didukung saat ini:

- QR pairing sementara
- kamera belakang HP
- format QR dan Code128
- feedback beep/vibrate jika browser mendukung
- proteksi duplicate scan singkat

Batasan saat ini:

- scanner HP dipakai untuk restock sparepart
- belum dipakai untuk IMEI, service form, audit gudang, atau semua input barcode
- koneksi bergantung pada browser, izin kamera, dan kondisi jaringan

---

## Audit Gudang

Audit Gudang adalah fitur Enterprise untuk mencocokkan stok sistem dengan stok fisik.

Nilai utamanya bukan hanya mengubah stok, tetapi menemukan alasan selisih.

Alasan mismatch yang tersedia:

- dipakai service tapi belum dicatat
- barang hilang
- barang rusak
- stock masuk belum dicatat
- salah stock sebelumnya
- salah hitung fisik
- lainnya

Saat audit selesai, sistem menyesuaikan stok ke hitungan fisik dan menyimpan activity log.

---

## Cara Memilih Mode Operasional

Gunakan panduan sederhana ini:

| Kondisi toko | Rekomendasi |
|---|---|
| Owner kerja sendiri, belum butuh stok detail | Free + item manual |
| Ada staff atau teknisi | Premium |
| Perlu inventory sparepart | Premium |
| Perlu audit fisik berkala | Enterprise |
| Banyak cabang atau tim besar | Enterprise |

Prinsipnya: mulai dari alur servis paling sederhana, lalu aktifkan fitur tambahan hanya saat operasional toko membutuhkannya.
