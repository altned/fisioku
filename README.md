# fisioku

## Struktur

- `backend/` – layanan NestJS + Prisma untuk autentikasi dasar & manajemen pengguna.
- `admin-web/` – dashboard Next.js untuk operasional admin.
- `mobile/` – aplikasi React Native (Expo) dasar untuk pasien/terapis, saat ini berfokus pada login + fetch profil.
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
- `ALLOWED_ORIGINS` – daftar origin (dipisah koma) yang diizinkan mengakses backend, misalnya `http://localhost:3001` untuk admin web lokal.

#### Cara menyiapkan kredensial Firebase Admin

1. Masuk ke [Firebase Console](https://console.firebase.google.com/) dan pilih project yang akan dipakai (atau buat baru).
2. Buka menu **Project Settings** → tab **Service accounts** → klik **Generate new private key**.
3. Simpan file JSON yang diunduh, lalu copy nilai berikut:
   - `project_id` → isi ke `FIREBASE_PROJECT_ID`.
   - `client_email` → isi ke `FIREBASE_CLIENT_EMAIL`.
   - `private_key` → isi ke `FIREBASE_PRIVATE_KEY` (ingat untuk mengganti newline menjadi `\n` saat dimasukkan ke `.env` pada Windows/Linux shell).
4. Restart server (`npm run start:dev`) agar kredensial baru terbaca. Jika tidak ingin mengirim push notification di environment tertentu, cukup kosongkan variabel-variabel tersebut.

## Menjalankan Admin Web

```bash
cd admin-web
cp .env.local.example .env.local # isi NEXT_PUBLIC_API_URL sesuai backend
npm install
npm run dev -- -p 3001
```

- `NEXT_PUBLIC_API_URL` harus mengarah ke instance backend (mis. `http://localhost:3000`).
- Login dilakukan lewat halaman `/login` menggunakan akun admin dari backend; token akan tersimpan di browser.

Halaman yang tersedia: summary dashboard (`/`), daftar booking (`/bookings`) termasuk aksi verifikasi pembayaran, dan manajemen paket (`/packages`).

## Menjalankan Mobile App

```bash
cd mobile
cp .env.example .env # set EXPO_PUBLIC_API_URL ke backend Anda
npm install
npm run start
```

- Jalankan backend terlebih dahulu dan pastikan `EXPO_PUBLIC_API_URL` mengarah ke host yang dapat dijangkau simulator/emulator.
- Untuk login awal, gunakan akun seed (`patient@fisioku.local` atau `therapist@fisioku.local`).
- Fitur saat ini: autentikasi dasar, fetch profil, daftar terapis + pencarian, detail terapis, form booking terhubung API (create + consent otomatis), daftar booking terbaru, serta layar booking yang memungkinkan upload bukti bayar & pembatalan pasien.

## Konfigurasi Firebase Chat & Push Notification

1. **Backend** – isi variabel berikut di `backend/.env` dari service account Firebase Admin:
   ```
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   Setelah itu restart server NestJS agar notifikasi FCM dan penulisan chat Firestore aktif.

2. **Mobile** – masukkan konfigurasi web Firebase ke `mobile/.env` (`EXPO_PUBLIC_FIREBASE_*`). Karena Expo Go tidak mendukung push notification mulai SDK 53, gunakan *development build* (lihat https://docs.expo.dev/develop/development-builds/introduction/).

3. **Firestore Security Rules** – tambahkan rules berikut di Firebase Console agar hanya pasien–terapis terkait yang bisa membaca/menulis chat:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /chat_threads/{threadId} {
         allow read, write: if false; // metadata hanya dari backend

         match /messages/{messageId} {
           function thread() {
             return get(/databases/$(database)/documents/chat_threads/$(threadId));
           }
           function isParticipant() {
             return request.auth != null &&
               (request.auth.uid == thread().data.patientId ||
                request.auth.uid == thread().data.therapistId);
           }
           function threadLocked() {
             return thread().data.lockedAt != null;
           }

           allow read: if isParticipant();
           allow create: if isParticipant() && !threadLocked();
           allow update, delete: if false;
         }
       }
     }
   }
   ```
   Pastikan struktur dokumen `chat_threads/{bookingId}` menyimpan `patientId`, `therapistId`, dan `lockedAt` seperti yang sudah dikontrol backend.
