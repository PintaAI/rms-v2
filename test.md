# Checklist Pengujian RMS

## 1. Fondasi
- [ ] Jalankan `bun run lint`.
- [ ] Jalankan `bun run build`.
- [ ] Pastikan `DATABASE_URL` valid.
- [ ] Pastikan Prisma generate berhasil.
- [ ] Pastikan seed kecil berjalan.
- [ ] Pastikan error env blob jelas saat token kosong.

## 2. Autentikasi
- [ ] Register email/password membuat user admin.
- [ ] Subscription free otomatis dibuat.
- [ ] Login benar masuk dashboard.
- [ ] Login salah ditolak.
- [ ] Logout menghapus session.
- [ ] Route protected mengarah ke `/auth` tanpa session.
- [ ] Route publik mengarah ke `/dashboard` saat sudah login.
- [ ] OAuth Google tidak crash saat env kosong.
- [ ] Session expired meminta login ulang.

## 3. Role
- [ ] Admin masuk `/{tokoid}/admin`.
- [ ] Staff masuk `/{tokoid}/staff`.
- [ ] Teknisi masuk `/{tokoid}/teknisi`.
- [ ] Admin tanpa toko masuk `/onboard`.
- [ ] Staff tanpa toko melihat pesan akses kosong.
- [ ] Teknisi tanpa toko melihat pesan akses kosong.
- [ ] Staff tidak bisa membuka halaman admin.
- [ ] Teknisi tidak bisa membuka halaman admin/staff.
- [ ] Admin tidak bisa membuka toko milik user lain.

## 4. Isolasi Toko
- [ ] Service toko A tidak muncul di toko B.
- [ ] Sparepart toko A tidak muncul di toko B.
- [ ] Pricelist toko A tidak muncul di toko B.
- [ ] Karyawan toko A tidak muncul di toko B.
- [ ] Activity log toko A tidak muncul di toko B.
- [ ] Assignment teknisi lintas toko ditolak.
- [ ] Service item memakai inventory toko sendiri saja.

## 5. Plan Dan Fitur
- [ ] Free maksimal 1 toko.
- [ ] Free tidak bisa menambah staff.
- [ ] Free tidak bisa menambah teknisi.
- [ ] Premium maksimal 3 toko.
- [ ] Premium maksimal 5 staff.
- [ ] Premium maksimal 5 teknisi.
- [ ] Enterprise tanpa batas operasional.
- [ ] Inventory terkunci pada free.
- [ ] Karyawan terkunci pada free.
- [ ] Assignment teknisi terkunci pada free.
- [ ] Invoice terkunci pada free.
- [ ] Audit gudang hanya enterprise.
- [ ] Fitur disabled toko hilang dari UI.
- [ ] Fitur disabled toko ditolak server action.
- [ ] Staff/teknisi memakai plan efektif admin toko.

## 6. Onboarding
- [ ] Wizard admin baru tampil.
- [ ] Nama toko wajib.
- [ ] Nama toko minimal 2 karakter.
- [ ] Logo upload sukses.
- [ ] Gagal upload logo tidak merusak pembuatan toko.
- [ ] Email karyawan invalid ditolak.
- [ ] Email duplikat form ditolak.
- [ ] Email terdaftar ditolak.
- [ ] Password karyawan minimal 4 karakter.
- [ ] Team tidak dibuat saat plan tidak mengizinkan.
- [ ] Setelah selesai diarahkan ke admin dashboard.

## 7. Toko
- [ ] Admin membuat toko saat limit belum penuh.
- [ ] Staff/teknisi tidak bisa membuat toko.
- [ ] Admin mengubah nama, alamat, phone, logo, status.
- [ ] Nama update terlalu pendek ditolak.
- [ ] User luar tidak bisa update toko.
- [ ] Toko terakhir tidak bisa dihapus.
- [ ] Hapus toko non-terakhir berhasil.
- [ ] Data relasi tidak meninggalkan orphan berbahaya.

## 8. Karyawan
- [ ] Admin premium membuat staff.
- [ ] Admin premium membuat teknisi.
- [ ] Staff/teknisi tidak bisa membuat karyawan.
- [ ] Nama minimal 2 karakter.
- [ ] Format email valid.
- [ ] Password minimal 4 karakter.
- [ ] Email terdaftar ditolak.
- [ ] Limit staff dihormati.
- [ ] Limit teknisi dihormati.
- [ ] Admin tidak bisa menghapus diri sendiri.
- [ ] User bukan karyawan tidak bisa dihapus lewat modul ini.
- [ ] Hapus karyawan dengan service lama tidak merusak data.

## 9. Device
- [ ] Brand bisa dicari.
- [ ] Device bisa dicari dari model.
- [ ] Device bisa dicari dari brand plus model.
- [ ] Search kosong memberi default list.
- [ ] Admin bisa membuat brand.
- [ ] Staff/teknisi tidak bisa write catalog.
- [ ] Brand duplikat tidak menggandakan data.
- [ ] Device duplikat satu brand ditangani aman.

## 10. Service Dasar
- [ ] Admin/staff membuat service.
- [ ] Teknisi tidak bisa membuat service.
- [ ] Device wajib valid.
- [ ] Nomor WA wajib.
- [ ] Keluhan wajib.
- [ ] Field opsional tersimpan null saat kosong.
- [ ] Status awal `received`.
- [ ] `isPickedUp` awal false.
- [ ] Activity `service_created` tercatat.
- [ ] List service paginated.
- [ ] Filter status bekerja.
- [ ] Filter waktu bekerja.
- [ ] Detail service sesuai hak akses.
- [ ] Update detail sebelum pickup berhasil.
- [ ] Update setelah pickup ditolak.
- [ ] Delete sebelum pickup berhasil.
- [ ] Delete invoice paid ditolak.
- [ ] Delete setelah pickup ditolak.
- [ ] Delete mengembalikan stok sparepart.

## 11. Workflow Teknisi
- [ ] Daftar task tersedia benar.
- [ ] Daftar task milik teknisi benar.
- [ ] Ambil task `received` mengubah status `repairing`.
- [ ] Takeover task tersedia berhasil.
- [ ] Dua teknisi ambil bersamaan hanya satu sukses.
- [ ] Teknisi assigned mengubah status.
- [ ] Teknisi tidak assigned ditolak.
- [ ] Status `done` mengisi `doneAt`.
- [ ] Status `failed` mengisi `doneAt`.
- [ ] Note teknisi tersimpan.
- [ ] Setelah pickup status tidak bisa berubah.
- [ ] Activity assignment, takeover, status tercatat.

## 12. Item Service
- [ ] Item manual bisa ditambah admin/staff.
- [ ] Item manual bisa ditambah teknisi assigned.
- [ ] Qty harus lebih dari 0.
- [ ] Harga tidak boleh negatif.
- [ ] Nama item wajib.
- [ ] Item pertama mengubah `received` ke `repairing`.
- [ ] Pricelist memakai harga default toko sendiri.
- [ ] Pricelist toko lain ditolak.
- [ ] Sparepart universal bisa dipakai semua device.
- [ ] Sparepart non-universal wajib kompatibel.
- [ ] Sparepart toko lain ditolak.
- [ ] Stok kurang ditolak.
- [ ] Stok berkurang sesuai qty.
- [ ] Race stok tidak membuat nilai negatif.
- [ ] Hapus sparepart item mengembalikan stok.
- [ ] Hapus manual item tidak mengubah stok.
- [ ] Setelah pickup item tidak bisa diubah.

## 13. Invoice
- [ ] Invoice dibuat otomatis saat item ditambah jika fitur aktif.
- [ ] Grand total menghitung `qty * price`.
- [ ] Total berubah setelah tambah item.
- [ ] Total berubah setelah hapus item.
- [ ] Invoice tidak dibuat saat fitur mati.
- [ ] Bayar hanya untuk status `done` atau `failed`.
- [ ] Bayar ulang ditolak.
- [ ] Bayar setelah pickup ditolak.
- [ ] `paidAt` terisi.
- [ ] Preview invoice paid terbuka.
- [ ] Activity invoice tercatat.

## 14. Pickup
- [ ] Service `done` bisa pickup.
- [ ] Service `failed` bisa pickup.
- [ ] Service `received` ditolak.
- [ ] Service `repairing` ditolak.
- [ ] Pickup kedua ditolak.
- [ ] `checkoutAt` terisi.
- [ ] Setelah pickup edit/delete/item/payment ditolak.

## 15. Inventory
- [ ] Admin mengelola sparepart.
- [ ] Staff/teknisi hanya melihat bila diizinkan.
- [ ] Nama sparepart wajib.
- [ ] Harga sparepart tidak negatif.
- [ ] Stok sparepart tidak negatif.
- [ ] Nama duplikat satu toko ditolak.
- [ ] Nama sama toko lain boleh.
- [ ] Compatibility tersimpan.
- [ ] Update compatibility mengganti daftar lama.
- [ ] Delete sparepart terpakai ditolak.
- [ ] Delete sparepart menghapus compatibility.
- [ ] Activity sparepart tercatat.
- [ ] Admin mengelola pricelist.
- [ ] Title pricelist wajib.
- [ ] Harga pricelist tidak negatif.
- [ ] Title duplikat satu toko ditolak.
- [ ] Delete pricelist tidak merusak service lama.

## 16. Audit Gudang
- [ ] Hanya admin enterprise bisa akses.
- [ ] Staff/teknisi ditolak.
- [ ] Start membuat session aktif.
- [ ] Snapshot mengambil semua sparepart toko.
- [ ] Dua audit aktif ditolak.
- [ ] Race start hanya satu sukses.
- [ ] Physical sama menghasilkan `matched`.
- [ ] Physical kurang menghasilkan missing.
- [ ] Physical lebih menghasilkan excess.
- [ ] Physical null kembali pending.
- [ ] Physical negatif ditolak.
- [ ] Note maksimal 500 karakter.
- [ ] Discrepancy wajib alasan.
- [ ] Pending item mencegah complete.
- [ ] Item kurang/lebih mencegah complete.
- [ ] Item session lain ditolak.
- [ ] Complete menyesuaikan stok.
- [ ] Perubahan stok selama audit menggagalkan complete.
- [ ] Complete mengisi `completedAt`.
- [ ] Cancel mengisi `cancelledAt`.
- [ ] Session selesai tidak bisa diubah lagi.
- [ ] Activity audit tercatat.

## 17. Dashboard
- [ ] Admin stats service benar.
- [ ] Staff stats service benar.
- [ ] Teknisi stats task benar.
- [ ] Low stock menghitung stok <= 5.
- [ ] Revenue bulanan paid benar.
- [ ] Revenue pending benar.
- [ ] Revenue harian benar.
- [ ] Recent service urut terbaru.
- [ ] Activity log tampil sesuai fitur.
- [ ] Sidebar menu mengikuti role.
- [ ] Sidebar badge berubah setelah mutasi.
- [ ] Breadcrumb sesuai route.

## 18. Upload API
- [ ] GET tanpa login ditolak.
- [ ] POST tanpa login ditolak.
- [ ] PUT tanpa login ditolak.
- [ ] DELETE tanpa login ditolak bila tersedia.
- [ ] File kosong ditolak.
- [ ] File besar ditangani aman.
- [ ] Pathname aneh tidak merusak storage.
- [ ] Response upload berisi URL valid.
- [ ] Blob token kosong memberi 500 jelas.

## 19. User Manual
- [ ] `/user-manual` publik.
- [ ] API tanpa slug mengembalikan dokumen pertama.
- [ ] Slug valid mengembalikan konten.
- [ ] Slug invalid tidak crash.
- [ ] Heading H2 terdeteksi.
- [ ] Demo block render sesuai registry.
- [ ] Icon filename terbaca.

## 20. UI/UX
- [ ] Layout desktop rapi.
- [ ] Layout mobile tanpa overflow.
- [ ] Sidebar mobile bisa dibuka/tutup.
- [ ] Dialog tidak keluar viewport.
- [ ] Empty state jelas.
- [ ] Error state terlihat.
- [ ] Submit loading mencegah double click.
- [ ] Toast sukses/gagal muncul.
- [ ] Dark mode terbaca.
- [ ] Dynamic theme tidak merusak kontras.
- [ ] Keyboard focus terlihat.
- [ ] Dialog bisa ditutup Escape.

## 21. Keamanan
- [ ] Server action tanpa session mengembalikan unauthorized.
- [ ] Cross-role mengembalikan forbidden.
- [ ] Cross-toko selalu ditolak.
- [ ] Data sensitif tidak muncul di log produksi.
- [ ] Password pattern tidak tampil di area tidak perlu.
- [ ] Activity payload tidak menyimpan rahasia.
- [ ] Public blob hanya untuk file non-sensitif.

## 22. E2E Wajib
- [ ] Admin free register -> onboard -> toko -> dashboard.
- [ ] Premium admin -> tambah toko -> staff -> teknisi -> inventory.
- [ ] Staff buat service -> assign teknisi -> teknisi kerjakan -> invoice paid -> pickup.
- [ ] Sparepart stok 10 -> pakai 2 -> stok 8 -> hapus item -> stok 10.
- [ ] Invoice 2 item -> total benar -> hapus 1 -> total berubah.
- [ ] Teknisi A ambil task -> teknisi B takeover -> log benar.
- [ ] Enterprise audit -> isi stok -> complete -> inventory sesuai fisik.
- [ ] Dua toko aktif -> semua data tetap terpisah.
- [ ] Delete constraint penting semuanya ditolak dengan pesan jelas.
