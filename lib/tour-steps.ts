import type { Step } from "react-joyride";



export const adminTourSteps: Step[] = [
  {
   
    target: "[data-tour='overview-title']",
    title: "Selamat Datang! 👋",
    content:
      "Ini adalah dashboard utama toko Anda. Di sini Anda dapat melihat ringkasan statistik dan aktivitas terbaru dalam satu tampilan.",
    placement: "bottom",
  },
  {
    
    target: "[data-tour='stats-services']",
    title: "Statistik Servis 📊",
    content:
      "Pantau status semua servis: total servis, sedang dikerjakan, selesai, dan gagal. Klik untuk melihat detail lebih lanjut.",
    placement: "bottom",
  },
  {
    
    target: "[data-tour='stats-revenue']",
    title: "Statistik Pendapatan 💰",
    content:
      "Lacak pendapatan: total yang sudah dibayar, tagihan tertunda, pemasukan harian, dan notifikasi stok rendah.",
    placement: "bottom",
  },
  {

    target: "[data-tour='sidebar-trigger']",
    title: "Toggle Sidebar 📌",
    content:
      "Klik tombol ini untuk menyembunyikan atau menampilkan sidebar navigasi. Berguna untuk mendapatkan ruang layar lebih luas.",
    placement: "right",
  },
  {

    target: "[data-tour='sidebar-nav']",
    title: "Menu Navigasi 🧭",
    content:
      "Gunakan menu ini untuk berpindah antar halaman: Overview, Toko, Servis, Karyawan, dan Inventory.",
    placement: "right",
  },
  {
   
    target: "[data-tour='new-service-btn']",
    title: "Buat Servis Baru ➕",
    content:
      "Klik tombol ini untuk membuat entri servis baru. Anda dapat mencatat perangkat pelanggan yang perlu diperbaiki.",
    placement: "bottom",
  },
  {
   
    target: "[data-tour='service-table']",
    title: "Daftar Servis 📋",
    content:
      "Lihat dan kelola semua permintaan servis terbaru beserta statusnya. Gunakan filter dan pencarian untuk menemukan data dengan cepat.",
    placement: "top",
  },
];

export const staffTourSteps: Step[] = [
  {
   
    target: "[data-tour='overview-title']",
    title: "Selamat Datang! 👋",
    content:
      "Ini adalah halaman utama untuk mengelola servis dan aktivitas toko.",
    placement: "bottom",
  },
  {
  
    target: "[data-tour='stats-services']",
    title: "Statistik Servis 📊",
    content: "Lihat ringkasan status servis yang perlu ditangani.",
    placement: "bottom",
  },
  {
   
    target: "[data-tour='new-service-btn']",
    title: "Buat Servis Baru ➕",
    content: "Klik untuk mendaftarkan servis baru dari pelanggan.",
    placement: "bottom",
  },
  {
   
    target: "[data-tour='service-table']",
    title: "Daftar Servis 📋",
    content: "Kelola dan perbarui status servis pelanggan di sini.",
    placement: "top",
  },
];

export const technicianTourSteps: Step[] = [
  {
  
    target: "[data-tour='overview-title']",
    title: "Selamat Datang! 👋",
    content:
      "Ini adalah halaman tugas teknisi. Anda dapat melihat servis yang ditugaskan.",
    placement: "bottom",
  },
  {

    target: "[data-tour='stats-services']",
    title: "Tugas Anda 📋",
    content: "Lihat jumlah tugas yang sedang dikerjakan dan selesai.",
    placement: "bottom",
  },
  {
  
    target: "[data-tour='service-table']",
    title: "Daftar Servis 📋",
    content: "Perbarui status dan catatan servis yang Anda tangani.",
    placement: "top",
  },
];

export function getTourSteps(role: string): Step[] {
  switch (role) {
    case "admin":
      return adminTourSteps;
    case "staff":
      return staffTourSteps;
    case "technician":
      return technicianTourSteps;
    default:
      return [];
  }
}