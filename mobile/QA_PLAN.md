# QA Plan – Fisioku Mobile

## Scope Tahap Awal
- Validasi alur login pasien/terapis menggunakan backend lokal.
- Pastikan token tersimpan aman di SecureStore dan logout menghapusnya.
- Cek endpoint `/api/v1/users/me` berhasil dipanggil setelah login.

## Manual Test Checklist
1. **Login berhasil** – gunakan akun seed (`patient@fisioku.local`).
2. **Login gagal** – masukkan password salah dan pastikan pesan error muncul.
3. **Persistensi token** – tutup aplikasi (stop bundler), buka kembali, user masih login.
4. **Logout** – tap tombol Keluar, token terhapus dan layar kembali ke login.

## Otomasi / Pipeline
- Skrip `npm run test` belum tersedia → rencanakan Detox/E2E setelah fitur inti siap.
- Tambahkan workflow GitHub Actions ke depan untuk menjalankan `expo-doctor` dan `tsc --noEmit`.
- Catat kebutuhan device target (Android 13, iOS 17) untuk regresi manual.

## Lingkungan
- File `.env` memuat `EXPO_PUBLIC_API_URL`. Contoh ada di `.env.example`.
- Backend harus berjalan di origin yang sama dengan URL tersebut (default `http://localhost:3000`).
