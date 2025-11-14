# fisioku

## Struktur

- `backend/` – layanan NestJS + Prisma untuk autentikasi dasar & manajemen pengguna.
- `codex-agent-context.md` – konteks proyek dan tahapan MVP.

## Menjalankan Backend

```bash
cd backend
cp .env.example .env # sesuaikan kredensial DATABASE_URL & JWT_SECRET
npm install

# jalankan database Postgres lokal via Docker
docker compose up -d db
# jika sudah ada kontainer lama dengan nama sama, jalankan `docker rm -f fisioku-postgres`

# setelah kontainer sehat, jalankan migrasi + seed
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

Perintah utilitas:

- `npm run lint` – menjalankan ESLint dengan autofix.
- `npm run test` / `npm run test:e2e` – unit & e2e test dasar.
- `npm run db:migrate` / `npm run db:seed` – utilitas Prisma tambahan.

### Variabel Lingkungan Tambahan

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` – diperlukan jika ingin mengaktifkan Firebase Admin SDK untuk push notification.

#### Cara menyiapkan kredensial Firebase Admin

1. Masuk ke [Firebase Console](https://console.firebase.google.com/) dan pilih project yang akan dipakai (atau buat baru).
2. Buka menu **Project Settings** → tab **Service accounts** → klik **Generate new private key**.
3. Simpan file JSON yang diunduh, lalu copy nilai berikut:
   - `project_id` → isi ke `FIREBASE_PROJECT_ID`.
   - `client_email` → isi ke `FIREBASE_CLIENT_EMAIL`.
   - `private_key` → isi ke `FIREBASE_PRIVATE_KEY` (ingat untuk mengganti newline menjadi `\n` saat dimasukkan ke `.env` pada Windows/Linux shell).
4. Restart server (`npm run start:dev`) agar kredensial baru terbaca. Jika tidak ingin mengirim push notification di environment tertentu, cukup kosongkan variabel-variabel tersebut.
