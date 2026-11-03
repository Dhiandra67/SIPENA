# SIPENA Frontend

Frontend React + TypeScript + Vite. Permintaan `/api` diproxy ke backend Laravel di `http://127.0.0.1:8000`.

## Struktur halaman

Setiap halaman memiliki folder sendiri di `src/pages`. Login ada di `src/pages/Login/`, sedangkan dashboard ada di `src/pages/Dashboard/`. `src/App.tsx` memilih dashboard berdasarkan role akun setelah backend mengembalikan respons login.

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

Frontend memakai `GET /api/health` untuk pemeriksaan koneksi backend. Login menggunakan `POST /api/auth/login`, menyimpan bearer token sesuai pilihan "Ingat saya", dan memeriksa sesi lewat `GET /api/auth/me`. Logout mencabut token melalui `POST /api/auth/logout`. Jalankan `php artisan db:seed` di backend local/testing untuk membuat akun demo `test@example.com` dengan kata sandi `password`; akun ini hanya untuk demonstrasi, bukan production. Kredensial hanya ditampilkan pada development build frontend.

Untuk production, jalankan `npm.cmd run build`; output siap deployment dibuat di `dist/`.
