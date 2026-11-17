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

Frontend memakai `GET /api/health` untuk pemeriksaan koneksi backend. Login menggunakan `POST /api/auth/login`, menyimpan bearer token sesuai pilihan "Ingat saya", dan memeriksa sesi lewat `GET /api/auth/me`. Logout mencabut token melalui `POST /api/auth/logout`. Jalankan `php artisan db:seed` di backend untuk membuat akun Admin (`test@example.com` / `password`) serta data awal guru (`guru@example.com` / `guru12345`). Akun guru baru ditambahkan oleh Admin tanpa kata sandi karena sistem otomatis membuat kata sandi sementara `guru12345`, dan guru dapat mengubah kata sandinya di halaman Guru (**Profil Saya**).

Modul **Guru** menyediakan dashboard, pengajaran saya, detail kelas, daftar siswa baca-saja, pengaturan komponen nilai per pengajaran atau serentak untuk semua kelas, input nilai dengan perhitungan nilai akhir/predikat otomatis, statistik, laporan, dan profil. Data siswa dapat dilihat per pengajaran atau seluruh pengajaran. Bobot wajib tepat 100%; nilai dapat diimpor dari `.xlsx`/`.csv` (maksimal 5 MB), dan laporan satu kelas atau seluruh pengajaran dapat diunduh sebagai `.xlsx`. Cetak laporan menggunakan dialog cetak browser. Data guru saat ini masih berupa contoh lokal dan perubahan tidak tersimpan ke backend.

Modul **Admin** menyediakan dashboard ringkasan, pengelolaan periode akademik, rekap nilai kelas, mata pelajaran, kelas, guru, siswa, dan pembagian tugas guru. Form siswa tidak meminta email atau nomor telepon, dan data guru tidak menampilkan nomor telepon, karena tidak dibutuhkan. Hak akses admin dan guru tetap dipisahkan. Navigasi menggunakan sidebar pada desktop serta bottom navigation dan menu lengkap pada mobile. Dengan sesi API aktif, data master dan impor/ekspor siswa menggunakan backend; pada mode demo lokal, contoh data disimpan di browser. Impor siswa menerima `.xlsx`/`.csv` sampai 5 MB, sedangkan ekspor menghasilkan `.xlsx`.

Saat sesi API aktif, data dashboard dan daftar Admin diperbarui otomatis setiap 5 detik selama tab terbuka. Dashboard menampilkan status memuat alih-alih data contoh sebelum respons database pertama diterima. Rekap nilai Admin dan ruang kerja Guru juga mengambil perubahan terbaru secara berkala; pembaruan ruang kerja Guru dijeda saat ada perubahan yang belum disimpan.

Untuk production, jalankan `npm.cmd run build`; output siap deployment dibuat di `dist/`.

## Deployment ke Vercel

Import repository ke Vercel dengan **Root Directory** `frontend`, **Build Command**
`npm run build`, dan **Output Directory** `dist`. File `vercel.json` mengarahkan
route aplikasi kembali ke `index.html`, sehingga halaman dapat dibuka atau di-refresh
langsung pada route seperti `/login`.

Tambahkan environment variable `VITE_API_BASE_URL` di pengaturan project Vercel
dengan URL API backend yang berakhiran `/api`, misalnya
`https://<backend-host>/api`. Ubah `<backend-host>` ke hostname backend sebenarnya.
Vite memasukkan variabel ini saat build, jadi perubahan nilainya memerlukan deployment
ulang.

Di backend Laravel, set `FRONTEND_URL` ke URL production Vercel yang sebenarnya,
tanpa garis miring di akhir. CORS backend hanya mengizinkan origin tersebut. Jika
menggunakan domain production kustom, gunakan domain itu sebagai nilai `FRONTEND_URL`.

## Pengujian

Jalankan pengujian autentikasi dan alur utama frontend dengan:

```powershell
npm.cmd test
```

Mode watch tersedia lewat `npm.cmd run test:watch`. Pemeriksaan performa membangun
production bundle lalu memverifikasi batas ukuran JavaScript (900 KiB raw dan
300 KiB gzip) serta CSS (120 KiB):

```powershell
npm.cmd run test:performance
```
