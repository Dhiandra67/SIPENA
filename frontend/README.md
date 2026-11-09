# SIPENA Frontend

Frontend React + TypeScript + Vite. Permintaan `/api` diproxy ke backend Laravel di `http://127.0.0.1:8000`.

## Struktur halaman

Setiap halaman memiliki folder sendiri di `src/pages`. Login ada di `src/pages/Login/`, sedangkan dashboard ada di `src/pages/Dashboard/`. `src/App.tsx` memilih dashboard berdasarkan role akun setelah backend mengembalikan respons login. Saat development, kredensial demo Admin dan Guru dapat membuka dashboard sesuai role secara lokal tanpa backend atau token API; jalur ini tidak tersedia pada build production.

## Menjalankan aplikasi

Jalankan backend dan frontend di dua terminal. Dari root project, terminal pertama:

```powershell
npm.cmd run dev
```

Terminal kedua:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Buka `http://127.0.0.1:5173`. Perintah `npm.cmd start` juga menjalankan frontend. Di PowerShell gunakan `npm.cmd` agar tidak diblokir oleh execution policy yang mencegah `npm.ps1` berjalan. Tidak perlu mengubah execution policy.

Frontend memakai `GET /api/health` untuk pemeriksaan koneksi backend. Login menggunakan `POST /api/auth/login`, menyimpan bearer token sesuai pilihan "Ingat saya", dan memeriksa sesi lewat `GET /api/auth/me`. Logout mencabut token melalui `POST /api/auth/logout`. Jalankan `php artisan db:seed` di backend local/testing untuk membuat akun demo admin (`test@example.com` / `password`) dan guru (`guru@example.com` / `guru12345`); akun ini hanya untuk demonstrasi, bukan production. Kredensial hanya ditampilkan pada development build frontend. Kredensial demo Admin dan Guru juga membuka dashboard masing-masing secara lokal saat backend belum tersedia, tanpa token; perubahan data keduanya tidak tersimpan.

Modul **Guru (RAPORKU)** menyediakan dashboard, pengajaran saya, detail kelas, daftar siswa baca-saja, pengaturan komponen nilai per pengajaran atau serentak untuk semua kelas, input nilai dengan perhitungan nilai akhir/predikat otomatis, statistik, laporan, dan profil. Data siswa dapat dilihat per pengajaran atau seluruh pengajaran. Bobot wajib tepat 100%; nilai dapat diimpor dari `.xlsx`/`.csv` (maksimal 5 MB), dan laporan satu kelas atau seluruh pengajaran dapat diunduh sebagai `.xlsx`. Cetak laporan menggunakan dialog cetak browser. Data guru saat ini masih berupa contoh lokal dan perubahan tidak tersimpan ke backend.

Modul **Admin** mengikuti kebutuhan SRS/PRD untuk dashboard ringkasan, periode akademik, rentang predikat, mata pelajaran, kelas, guru, siswa, dan pembagian tugas guru. Form siswa tidak meminta email atau nomor telepon, dan data guru tidak menampilkan nomor telepon. Hak akses admin dan guru tetap dipisahkan. Navigasi menggunakan sidebar pada desktop serta bottom navigation dan menu lengkap pada mobile. Data master masih berupa contoh lokal; tambah/edit/hapus, validasi relasi dan periode aktif, serta impor/ekspor siswa berlaku di browser saja dan belum terhubung ke API. Impor siswa menerima `.xlsx`/`.csv` sampai 5 MB; ekspor dan template memakai `.xlsx`.

Untuk production, jalankan `npm.cmd run build`; output siap deployment dibuat di `dist/`.
