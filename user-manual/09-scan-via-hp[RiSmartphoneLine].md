# Scan Via HP

`Scan via HP` membuat kamera HP berfungsi sebagai scanner barcode untuk RMS. Fitur ini membantu restock sparepart dan pemilihan sparepart saat menambah item perbaikan tanpa perlu scanner hardware khusus.

---

## Fungsi Utama

Scanner HP dapat membaca label sparepart lalu mengirim hasil scan ke desktop melalui koneksi realtime RMS.

Saat ini scanner HP dipakai di:

- dialog `Restock Sparepart`
- dialog `Tambah Item Perbaikan` pada tab sparepart

Format barcode yang didukung:

- QR Code
- Code128

---

## Pairing Scanner

Gunakan alur ini saat HP belum pernah dipakai sebagai scanner RMS, atau saat pairing tersimpan sudah tidak valid.

1. Buka fitur yang memiliki tombol `Scan via HP`.
2. Klik `Scan via HP` di desktop.
3. Desktop menampilkan QR pairing.
4. Buka kamera/scanner HP dan scan QR tersebut.
5. HP membuka halaman scanner RMS.
6. Jika browser meminta izin kamera, pilih `Allow` atau `Izinkan`.
7. Setelah status menjadi `Terhubung`, tahan tombol scan di HP lalu arahkan ke label sparepart.

Setelah berhasil terhubung, browser HP menyimpan token perangkat agar bisa reconnect tanpa scan QR di sesi berikutnya.

---

## Reconnect HP Tersimpan

Jika HP sudah pernah berhasil pairing:

1. Di desktop, buka fitur yang memiliki tombol `Scan via HP`.
2. Klik `Scan via HP`.
3. Di HP yang sama, buka halaman `/scanner`.
4. Tekan `Hubungkan ke Desktop`.
5. Setelah status `Terhubung`, tahan tombol scan di HP lalu arahkan ke label sparepart.

Reconnect hanya bekerja saat desktop sedang membuka sesi `Scan via HP` aktif.

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

## Keamanan Pairing

Pairing bekerja sebagai izin perangkat sederhana untuk browser HP tersebut.

Artinya:

- koneksi realtime scanner tetap dibuat ulang setiap kali dipakai
- HP tidak bisa mengirim scan jika desktop tidak membuka sesi scanner aktif
- token pairing hanya berlaku untuk sesi QR tersebut
- token perangkat disimpan di browser HP dan hash-nya disimpan di server
- tidak ada daftar HP tersimpan di desktop

---

## Batasan Dan Troubleshooting

Scanner HP membutuhkan browser modern, izin kamera, dan koneksi jaringan yang dapat mengakses server realtime RMS.

Masalah umum:

| Masalah | Solusi |
|---|---|
| Kamera tidak terbuka | Pastikan browser mengizinkan akses kamera |
| QR pairing kedaluwarsa | Klik retry atau buka ulang `Scan via HP` |
| HP tersimpan tidak reconnect | Pastikan desktop sedang membuka `Scan via HP` |
| Barcode tidak terbaca | Perbaiki pencahayaan, jarak, dan posisi label |
| Koneksi gagal di jaringan tertentu | Coba jaringan lain dan pastikan server realtime RMS aktif |
