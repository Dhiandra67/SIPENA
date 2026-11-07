# SIPENA – Sistem Informasi Penilaian Akademik Berbasis Web

**Digitalisasi Sistem Penilaian Akademik Siswa di SMP Karya Utama**

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB)
![Backend](https://img.shields.io/badge/backend-Laravel-FF2D20)
![Database](https://img.shields.io/badge/database-PostgreSQL-4169E1)
![SDGs Desa](https://img.shields.io/badge/SDGs%20Desa-4%20Pendidikan%20Berkualitas-C5192D)

SIPENA adalah aplikasi web yang membantu guru mengelola seluruh alur penilaian akademik siswa dalam satu platform terpadu, mulai dari input nilai, perhitungan otomatis, penentuan peringkat, hingga penyediaan data siap unggah ke sistem e-Rapor sekolah.

Proyek ini dikembangkan oleh **Kelompok 10** sebagai projek mata kuliah **Kapita Selekta Informatika**, Program Studi Teknik Informatika, Fakultas Teknologi Industri, Institut Teknologi Sumatera (ITERA), tahun 2026.

---

## Daftar Isi

- [Latar Belakang](#latar-belakang)
- [Tujuan](#tujuan)
- [Fitur Utama](#fitur-utama)
- [Pengguna dan Hak Akses](#pengguna-dan-hak-akses)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Metode Pengembangan](#metode-pengembangan)
- [Instalasi dan Menjalankan Project](#instalasi-dan-menjalankan-project)
- [Kontribusi Terhadap SDGs Desa](#kontribusi-terhadap-sdgs-desa)
- [Mitra](#mitra)
- [Tim Pengembang](#tim-pengembang)

---

## Latar Belakang

SMP Karya Utama berlokasi di Desa Karang Sari, Kecamatan Jati Agung, Kabupaten Lampung Selatan, Provinsi Lampung. Sekolah ini memiliki:

| Data | Jumlah |
|------|--------|
| Guru | 18 |
| Mata pelajaran | 12 |
| Siswa | 235 |
| Kelas | 6 |

Sekolah sudah menggunakan sistem e-Rapor selama kurang lebih 3 tahun. Namun, proses pengumpulan dan pengolahan nilai **masih dilakukan secara manual** sebelum dimasukkan ke e-Rapor. Komponen nilai yang harus direkap meliputi:

- Nilai harian
- Ulangan harian per bab
- Tugas tertulis mingguan
- Tugas praktik per sesi
- Sumatif Tengah Semester (STS)
- Ulangan Akhir Semester (UAS)

Di sisi lain, guru juga merangkap tugas administratif di luar kegiatan mengajar. Akibatnya muncul dua masalah utama:

1. **Keterbatasan waktu**: guru harus merekap puluhan komponen nilai untuk ratusan siswa di setiap periode penilaian.
2. **Akurasi rendah**: perhitungan manual yang berulang berisiko menimbulkan kesalahan nilai rapor dan peringkat siswa per kelas.

## Tujuan

- Menggantikan proses rekap dan perhitungan nilai manual dengan sistem digital yang terintegrasi.
- Mempercepat pengolahan nilai dan mengurangi beban administratif guru.
- Meningkatkan akurasi nilai akhir dan peringkat siswa.
- Menyediakan data nilai yang siap diunggah ke e-Rapor sekolah.
- Memastikan guru dapat mengoperasikan sistem secara mandiri setelah pelatihan.

## Fitur Utama

- **Manajemen data master**: data guru, siswa, kelas, dan mata pelajaran.
- **Input nilai komprehensif**: nilai harian, ulangan harian, tugas tertulis mingguan, tugas praktik, STS, dan UAS.
- **Auto-Ranking Engine**: kalkulasi otomatis akumulasi bobot nilai dan penentuan peringkat siswa per kelas secara real-time.
- **Impor/ekspor Excel/CSV**: input nilai massal dari spreadsheet dan ekspor rekapitulasi yang sudah disesuaikan untuk diunggah ke e-Rapor.
- **Penerbitan rapor**: pengelolaan dan penyediaan rapor siswa dari hasil perhitungan sistem.
- **Hak akses bertingkat (multi-role)**: tampilan dan wewenang disesuaikan dengan peran pengguna.
- **Antarmuka ramah pengguna**: dirancang agar mudah dipakai guru tanpa latar belakang teknis.

## Pengguna dan Hak Akses

| Peran | Wewenang |
|-------|----------|
| **Admin/Operator** | Mengelola data master (guru, siswa, kelas, mata pelajaran), pengaturan bobot penilaian, rekap nilai, ekspor data untuk e-Rapor |
| **Guru Mata Pelajaran** | Menginput dan mengelola nilai pada mata pelajaran dan kelas yang diampu, melihat hasil perhitungan otomatis |

## Teknologi yang Digunakan

| Lapisan | Teknologi |
|---------|-----------|
| Front-end | React, TypeScript, Vite, Tailwind CSS |
| Back-end | Laravel (PHP, RESTful API) |
| Basis data | PostgreSQL |
| Format data | Excel (.xlsx) / CSV untuk impor dan ekspor |

## Metode Pengembangan

Proyek dilaksanakan bertahap selama 8 minggu (M1–M8) dengan pendekatan Waterfall:

| Tahap | Minggu |
|-------|--------|
| Identifikasi kebutuhan | M1–M2 |
| Perancangan sistem | M2–M4 |
| Implementasi | M5 |
| Pengujian sistem | M6 |
| Sosialisasi dan pelatihan guru | M7 |
| Evaluasi capaian SDGs | M8 |
| Penyusunan laporan | M8 |

## Instalasi dan Menjalankan Project

### Prasyarat

- PHP 8.3 atau lebih baru dengan ekstensi PDO PostgreSQL
- Composer
- Node.js (disarankan versi LTS terbaru)
- PostgreSQL
- Git

### Menjalankan aplikasi

Siapkan database PostgreSQL `sipena`, lalu dari PowerShell jalankan:

```powershell
# Persiapan backend (cukup sekali)
cd backend
composer install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
php artisan migrate
php artisan db:seed
Set-Location ..
```

Jalankan backend dari root project di terminal pertama:

```powershell
npm.cmd run dev
```

Jalankan frontend dari folder `frontend` di terminal kedua:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Buka `http://127.0.0.1:5173`. Perintah `npm.cmd start` dari folder `frontend` juga menjalankan frontend. Gunakan `npm.cmd` di PowerShell agar tidak diblokir oleh execution policy yang mencegah `npm.ps1` berjalan. Frontend meneruskan request `/api` ke backend Laravel di `http://127.0.0.1:8000`.

Backend menyediakan `GET /api/health` dan autentikasi bearer token melalui `POST /api/auth/login`. Di environment local/testing, seeder membuat akun demo admin (`test@example.com` / `password`) dan guru (`guru@example.com` / `guru12345`); kredensial ini ditampilkan di frontend mode development dan tidak boleh digunakan di production. Endpoint `GET /api/auth/me` memeriksa sesi, sementara `POST /api/auth/logout` mencabut token. Rincian integrasi frontend ada di [frontend/README.md](frontend/README.md).

## Kontribusi Terhadap SDGs Desa

Proyek ini mendukung **SDGs Desa Tujuan 4: Pendidikan Desa Berkualitas** (indikator 4.1.1 – proporsi anak yang mencapai kompetensi pendidikan).

| | Uraian |
|---|---|
| **Kondisi awal** | Nilai dikumpulkan sepanjang semester lalu dihitung manual oleh guru di akhir semester sehingga lama dan kurang akurat. |
| **Target** | Sistem penilaian digital terintegrasi: guru mengelola nilai langsung sepanjang semester tanpa akumulasi manual, pengolahan lebih cepat dan akurat, laporan capaian kompetensi tersedia otomatis, dan guru mampu mengoperasikan sistem secara mandiri. |
| **Pembuktian** | Data log sistem, hasil pengujian sistem, dan wawancara guru. |

## Mitra

**SMP Karya Utama**
Desa Karang Sari, Kecamatan Jati Agung, Kabupaten Lampung Selatan, Lampung.

Pihak yang terlibat: kepala sekolah, wakil kepala sekolah bidang kurikulum, dan dewan guru.

## Tim Pengembang

**Kelompok 10 – Kapita Selekta Informatika, Teknik Informatika ITERA**

| No | NIM | Nama | Peran |
|----|-----|------|-------|
| 1 | 124140063 | Regina Cahyani Puteri | Project Manager |
| 2 | 124140039 | Tarisa Menova | UI/UX |
| 3 | 124140069 | Salsabila Afra Gunas | Front End |
| 4 | 124140153 | Cania Febriyanti | Front End |
| 5 | 124140163 | Rasya Dhiandra Bangsawan | Back End |
| 6 | 124140151 | Abdul Aziz | Back End |

---

Program Studi Teknik Informatika · Fakultas Teknologi Industri · Institut Teknologi Sumatera · 2026
