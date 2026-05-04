# Scan Via HP

`Scan via HP` membuat kamera HP berfungsi sebagai scanner barcode untuk RMS. Fitur ini membantu restock sparepart dan pemilihan sparepart saat menambah item perbaikan tanpa perlu scanner hardware khusus.

---

## Fungsi Utama

Scanner HP dapat membaca label sparepart lalu mengirim hasil scan ke desktop melalui koneksi WebRTC.

Saat ini scanner HP dipakai di:

- dialog `Restock Sparepart`
- dialog `Tambah Item Perbaikan` pada tab sparepart

Format barcode yang didukung:

- QR Code
- Code128

---

## Pairing Pertama Kali

Gunakan alur ini saat HP belum pernah dipasangkan dengan desktop RMS.

1. Buka fitur yang memiliki tombol `Scan via HP`.
2. Klik `Scan via HP` di desktop.
3. Desktop menampilkan QR pairing.
4. Buka kamera/scanner HP dan scan QR tersebut.
5. HP membuka halaman scanner RMS.
6. Jika browser meminta izin kamera, pilih `Allow` atau `Izinkan`.
7. Setelah status menjadi `Terhubung`, tahan tombol scan di HP lalu arahkan ke label sparepart.

Setelah pairing pertama berhasil, HP akan disimpan sebagai perangkat scanner terpercaya.

---

## Reconnect Tanpa Scan QR

Jika HP sudah pernah dipasangkan, QR tidak perlu discan ulang.

Alur reconnect:

1. Di HP yang sama, buka halaman `/scanner` pada RMS.
2. Di desktop, buka fitur yang membutuhkan scanner.
3. Klik `Scan via HP`.
4. HP akan mencari desktop aktif dan otomatis terhubung.
5. Setelah status `Terhubung`, tahan tombol scan di HP untuk mulai scan barcode.

Catatan penting:

- HP hanya bisa reconnect saat desktop sedang membuka sesi `Scan via HP`.
- Jika user login di browser lain tetapi tidak membuka `Scan via HP`, koneksi tidak terpengaruh.
- Jika ada lebih dari satu desktop membuka scanner, sesi desktop terbaru yang akan ditemukan oleh HP.

---

## Menggunakan Scanner Di HP

Halaman scanner HP menggunakan pola `hold to scan`.

- Kamera bisa aktif sebagai viewfinder.
- Tahan tombol bulat besar hanya saat ingin scan.
- Lepas tombol untuk menjeda scan.
- Jika barcode berhasil dibaca, HP memberi feedback beep/vibrate jika browser mendukung.
- Scan duplikat dalam waktu sangat singkat akan diabaikan agar item tidak terkirim berkali-kali.

Tips scan:

- pastikan label cukup terang
- sejajarkan garis merah dengan barcode
- dekatkan HP jika barcode kecil
- gunakan kamera belakang
- hindari glare pada label glossy

---

## Mengelola HP Tersimpan

Desktop akan menampilkan daftar `HP tersimpan` saat scanner dibuka.

Yang bisa dilakukan:

- melihat nama HP yang pernah dipasangkan
- melihat waktu terakhir HP digunakan
- klik `Lupakan` untuk mencabut akses HP tersebut

Hak akses:

- pemilik pairing bisa melupakan HP miliknya
- Admin toko bisa melupakan HP scanner yang terdaftar pada toko tersebut

Di HP, tombol `Lupakan HP ini` menghapus token scanner dari browser HP tersebut. Setelah dilupakan, HP harus pairing ulang melalui QR.

---

## Keamanan Pairing

Pairing tersimpan bekerja seperti izin perangkat scanner, bukan koneksi permanen.

Artinya:

- koneksi WebRTC tetap dibuat ulang setiap kali dipakai
- HP tidak bisa mengirim scan jika desktop tidak membuka sesi scanner aktif
- server hanya menyimpan hash token perangkat, bukan token asli
- perangkat tetap valid sampai dilupakan atau dicabut aksesnya

Jika HP hilang atau dipakai orang lain, buka daftar `HP tersimpan` lalu klik `Lupakan`.

---

## Batasan Dan Troubleshooting

Scanner HP membutuhkan browser modern, izin kamera, dan koneksi jaringan yang mendukung WebRTC.

Masalah umum:

| Masalah | Solusi |
|---|---|
| Kamera tidak terbuka | Pastikan browser mengizinkan akses kamera |
| QR pairing kedaluwarsa | Klik retry atau buka ulang `Scan via HP` |
| HP tersimpan tidak reconnect | Pastikan desktop sedang membuka `Scan via HP` |
| Barcode tidak terbaca | Perbaiki pencahayaan, jarak, dan posisi label |
| Koneksi gagal di jaringan tertentu | Coba jaringan lain; WebRTC bisa diblokir jaringan ketat |

Jika reconnect tetap gagal, gunakan QR pairing baru dari desktop.
