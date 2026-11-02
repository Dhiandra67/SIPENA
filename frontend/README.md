# SIPENA Frontend

Antarmuka SIPENA dibuat dengan React, TypeScript, Vite, dan Tailwind CSS. Halaman masuk dan dashboard menyesuaikan desain desktop dan mobile yang disediakan.

## Struktur halaman

Setiap laman diletakkan di foldernya sendiri di dalam `src/pages`. Sebagai contoh, semua kode dan tampilan login ada di `src/pages/Login/`:

- `Login.tsx`: JSX, elemen HTML, dan interaksi halaman login.
- `Login.css`: gaya khusus untuk halaman login.
- `auth.ts`: request API dan tipe data autentikasi halaman login.
- `index.ts`: ekspor halaman agar mudah diimpor dari aplikasi.
- `src/pages/Dashboard/`: dashboard responsif untuk admin dan guru; jenis dashboard mengikuti `user.role` dari respons login.

`src/App.tsx` menentukan halaman yang sedang ditampilkan, sedangkan `src/styles.css` berisi gaya global. `index.html` tetap berada di root frontend sebagai entry HTML untuk aplikasi React; konten tiap laman dibuat sebagai JSX di folder halaman, bukan HTML terpisah. Untuk menambah laman, buat folder baru di `src/pages/NamaLaman/`, lalu tampilkan/import dari `src/App.tsx`.

## Menjalankan aplikasi

```bash
cd frontend
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Jika terminal yang digunakan adalah PowerShell dan perintah `npm install` menghasilkan pesan `npm.ps1 cannot be loaded because running scripts is disabled`, penyebabnya adalah execution policy PowerShell yang memblokir skrip `npm.ps1`, bukan kegagalan package atau konfigurasi frontend. Gunakan `npm.cmd` seperti pada contoh di atas; cara ini menjalankan launcher Windows tanpa mengubah execution policy. Alternatifnya, jalankan perintah npm dari Command Prompt dengan `npm install` dan `npm run dev`.

Isi `VITE_API_BASE_URL` sesuai alamat API backend. Nilai default di aplikasi adalah `/api`.

## Akun dummy untuk pengujian UI

Saat memeriksa tampilan dashboard, respons login di-mock di browser. Akun berikut hanya dipakai untuk pengujian tersebut dan **bukan akun backend**:

| Peran | Email | Kata sandi |
|---|---|---|
| Admin | `admin@example.test` | `password` |
| Guru | `guru@example.test` | `password` |

Akun ini tidak tersedia secara otomatis di aplikasi. Untuk login melalui form dengan backend, buat akun di backend yang terhubung.

## Kontrak autentikasi

Formulir mengirim `POST {VITE_API_BASE_URL}/auth/login` dengan body:

```json
{
  "email": "guru@sekolah.sch.id",
  "password": "kata-sandi"
}
```

Respons sukses yang diharapkan. Setelah berhasil masuk, pengguna dengan `role` admin akan melihat dashboard admin; role lainnya melihat dashboard guru. Tombol Logout menghapus token dari penyimpanan browser dan kembali ke halaman masuk.

```json
{
  "accessToken": "token",
  "user": {
    "id": "id-pengguna",
    "name": "Nama pengguna",
    "email": "guru@sekolah.sch.id",
    "role": "guru"
  }
}
```

Respons error dapat menyertakan properti `message` untuk ditampilkan pada formulir. Token disimpan di `sessionStorage` secara default, atau `localStorage` jika pengguna memilih "Ingat saya". Implementasi request berikutnya dapat mengambil token dari kedua penyimpanan tersebut.
