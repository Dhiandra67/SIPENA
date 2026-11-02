# SIPENA Frontend

Frontend React + Vite. Semua request `/api` diproxy ke Laravel pada `http://127.0.0.1:8000`.

## Menjalankan frontend

Jalankan backend Laravel di satu terminal dari root project:

```powershell
npm.cmd run dev
```

Di terminal kedua:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Buka `http://127.0.0.1:5173`. Perintah `npm.cmd start` juga menjalankan frontend pada port yang sama.

Di PowerShell gunakan `npm.cmd` untuk menghindari pemblokiran `npm.ps1` oleh Execution Policy. Backend yang tersedia saat ini baru memiliki `GET /api/health`; endpoint login `POST /api/auth/login` belum dibuat, sehingga formulir akan menampilkan pesan bahwa endpoint belum tersedia sampai route autentikasi backend ditambahkan.
