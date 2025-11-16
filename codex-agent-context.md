📘 **PROJECT CONTEXT — FISIOTERAPI BOOKING SYSTEM**

Aplikasi mobile + web untuk booking fisioterapi home-visit dengan tiga peran utama (Pasien, Terapis, Admin) menggunakan React Native, NestJS, PostgreSQL, Firebase, serta Cloud Storage.

---

## 1. Arsitektur & Stack Utama

### Mobile App (Pasien & Terapis)
- React Native, React Navigation, React Query
- Zustand/Recoil untuk state management
- Firebase SDK (Firestore + Messaging)
- `react-native-maps` untuk lokasi

### Backend API
- Node.js + NestJS dengan arsitektur modular
- Prisma ORM + PostgreSQL
- Firebase Admin SDK untuk notifikasi
- Google Cloud Storage untuk media
- REST API sebagai antarmuka utama

### Admin Web
- React (Next.js) + React Query
- TailwindCSS / MUI untuk UI component

### Realtime & Notifikasi
- Firebase Firestore untuk chat realtime
- Firebase Cloud Messaging untuk push notification

### Deployment
- Docker container
- Cloud Run untuk MVP, migrasi ke GKE saat scale-up

---

## 2. Role & Permission Rules

### Pasien
- Tidak boleh melihat booking/chat pasien lain
- Akses booking harus memenuhi `booking.patientId === req.user.id`

### Terapis
- Tidak boleh melihat booking/chat terapis lain
- Akses booking harus memenuhi `booking.therapistId === req.user.id`

### Admin
- Bebas melihat seluruh booking
- Berwenang assign terapis, verifikasi pembayaran, melihat log & catatan terapi

### Firestore Chat Security
```
match /chats/{chatId} {
  allow read, write: if
    request.auth.uid == resource.data.patientId ||
    request.auth.uid == resource.data.therapistId;
}
```

### Anti Data Leak
- FE tidak boleh mengirim `patient_id` atau `therapist_id` secara manual
- Selalu ambil identitas user dari token JWT

---

## 3. Business Rules Utama
1. Pasien pilih terapis → paket → isi keluhan → jadwal → consent → booking (`WAITING_THERAPIST_CONFIRM`)
2. Terapis konfirmasi → status `PAYMENT_PENDING` (masa berlaku 1 jam)
3. Pasien unggah bukti bayar ke storage server internal Fisioku lewat endpoint upload (`POST /files/payment-proof`) yang mengembalikan `fileId` + URL signed satu kali; FE lalu memanggil `PATCH /bookings/:id/payment-proof` dengan metadata file tersebut → status `WAITING_ADMIN_VERIFY_PAYMENT`.
4. Admin verifikasi → status `PAID`
5. Sesi pertama berlangsung, sesi berikutnya harus dengan terapis yang sama, dijadwalkan via endpoint scheduler booking; status otomatis pindah `PAID → IN_PROGRESS → COMPLETED` oleh service scheduler setelah semua sesi bertandai selesai.
6. Chat aktif selama sesi + 24 jam, lalu read-only
7. Setelah seluruh sesi selesai → pasien memberi review → booking ditutup

**Aturan Tambahan Pasca Pembayaran**
- Booking yang sudah `PAID` wajib memiliki minimal satu `booking_session` berstatus `SCHEDULED`; terapis memakai endpoint `PATCH /booking-sessions/:id/schedule` untuk reschedule dengan validasi konflik availability.
- Scheduler harian mengecek sesi terakhir berstatus `COMPLETED`; 24 jam setelah waktu selesai terakhir, booking dipindah ke `COMPLETED`, chat thread dikunci otomatis, dan review dibuka untuk pasien.
- Pembatalan/reschedule setelah `PAID` harus meninggalkan jejak audit (admin override atau kesepakatan pasien–terapis) dan selalu mengirim notifikasi ke kedua pihak.

---

## 4. State Machine

### Booking (Global)
`WAITING_THERAPIST_CONFIRM → PAYMENT_PENDING → WAITING_ADMIN_VERIFY_PAYMENT → PAID → IN_PROGRESS → COMPLETED`

Status terminal: `PAYMENT_EXPIRED`, `CANCELLED_BY_*`, `REFUNDED`

### Session
`PENDING_SCHEDULE → WAITING_THERAPIST_CONFIRM → SCHEDULED → COMPLETED`

Status terminal: `CANCELLED`

---

## 5. Modul Backend
- Auth, User, Patient, Therapist
- Booking, Booking Session, Payment
- Chat, Notification (FCM), Consent
- Review, Therapist Unavailability
- Admin, Audit Log

---

## 6. Database Entities (Ringkas)
- **users** · id, email, password, googleId, phone, role, status
- **patient_profiles** · userId, fullName, dob, gender
- **therapist_profiles** · userId, fullName, gender, city, specialties, experienceYears, licenseNumber, bio, photoUrl
- **patient_addresses** · patientId, fullAddress, city, lat, lng, landmark
- **therapy_packages** · id, name, description, sessionCount, price, defaultExpiryDays, isActive
- **bookings** · id, patientId, therapistId, packageId, status, notesFromPatient, painLevel, expiryDate
- **booking_sessions** · id, bookingId, sessionNumber, scheduledAt, status
- **payments** · bookingId, amount, method, proofUrl, status, verifiedBy
- **chat_threads** · id, bookingId, patientId, therapistId
- **chat_messages** · threadId, senderId, message, sentAt
- **session_notes** · sessionId, therapistId, content
- **reviews** · bookingId, patientId, therapistId, rating, comment

---

## 7. Aturan Agent (Codex & Claude)

### DO
- Gunakan React Native (bukan Flutter) untuk FE mobile
- Gunakan NestJS + Prisma + PostgreSQL
- Gunakan Firebase untuk chat & notifikasi
- Jaga arsitektur modular + DTO + Validation Pipes
- Pakai React Query untuk request FE
- Selalu enforce aturan akses per role & business rules booking

### DO NOT
- Jangan bocorkan data pasien/terapis ke pihak lain
- Jangan return list booking tanpa filter role
- Jangan pakai WebSocket untuk chat (tetap Firebase)
- Jangan ubah alur bisnis utama atau stack tanpa instruksi

---

## 8. Fokus MVP
1. Auth
2. Therapist Directory
3. Booking Flow
4. Payment Upload
5. Terapis Confirm
6. Admin Verify Payment
7. Chat Realtime
8. Review
9. Therapist Notes
10. Admin CMS / CRUD

---

## 9. Tahapan Pengembangan MVP

| Tahap | Tujuan Utama | Deliverable | Dependencies | Catatan |
| --- | --- | --- | --- | --- |
| 0. Persiapan | Validasi requirement & toolchain | Dokumen arsitektur final, repo monorepo/multi-repo siap, CI lint/test dasar | - | Pastikan akses Firebase, GCP, DB sudah tersedia |
| 1. Fondasi Backend | Autentikasi & role | Service NestJS + Prisma + JWT + RBAC; migrasi schema dasar (users, profiles) | Tahap 0 | Sertakan automation seeding minimal 1 user per role |
| 2. Directory & Booking Core | Menjalankan alur booking dasar | Endpoint therapist directory, booking creation, state WAITING_THERAPIST_CONFIRM, session stub | Backend tahap 1 | Mulai integrasi React Native untuk list terapis |
| 3. Konfirmasi & Pembayaran | Menutup loop booking → payment | Endpoint konfirmasi terapis, upload bukti bayar (GCS), admin verify payment, status PAID | Tahap 2 | Tambah audit trail untuk admin verify |
| 4. Chat & Notifikasi | Komunikasi & engagement | Firestore rules + RN chat UI, FCM push (booking status) | Tahap 3 | Uji locking chat ke pair patient-therapist |
| 5. Review & Notes | Post-session insight | Endpoint review pasien, catatan terapis, sesi IN_PROGRESS → COMPLETED | Tahap 3 | Pastikan notes & review hanya muncul setelah sesi |
| 6. Admin CMS | Operasional dasar admin | Next.js dashboard: daftar booking, users, paket terapi CRUD | Tahap 2 | Gunakan React Query + proteksi route admin |
| 7. QA & Launch | Stabilitas & rilis internal | Checklist QA, skenario UAT, build RN (Android/iOS) + deploy backend ke Cloud Run | Semua tahap | Sediakan rollback plan & monitoring dasar |

### Detail Aktivitas per Tahap
- **Persiapan**
  - Finalisasi dokumen kebutuhan, definisi role, matriks permission
  - Setup repositori, lint, formatter, commit hook
  - Konfigurasi Firebase project, service account, kredensial GCP
- **Fondasi Backend**
  - Implementasi module Auth (register/login, token refresh)
  - Guard role-based + policy booking/patient scope
  - Integrasi Prisma migration + seeding
- **Directory & Booking Core**
  - Terapis directory (filter lokasi/spesialisasi dasar)
  - Booking DTO + validation, state WAITING_THERAPIST_CONFIRM
  - React Native flow: pilih terapis → paket → jadwal → consent
- **Konfirmasi & Pembayaran**
  - Endpoint konfirmasi terapis, timer payment
  - Endpoint upload file internal (`POST /files/payment-proof`) yang menaruh bukti transfer di storage server (local disk/S3 kompatibel) + sanitasi mime/ukuran + response URL satu kali
  - Pasien menautkan `fileId` ke booking via `PATCH /bookings/:id/payment-proof` hingga status WAITING_ADMIN_VERIFY_PAYMENT
  - Admin panel sederhana untuk verifikasi + update status PAID
- **Chat & Notifikasi**
  - Struktur Firestore `chat_threads`, `chat_messages`
  - RN chat UI, listener realtime, push notif status booking/chat
  - Pengetesan rule Firestore sesuai snippet keamanan
  - ✅ Backend chat thread metadata + registrasi FCM token + push trigger booking status
- **Review & Notes**
  - Terapis isi session note per sesi
  - Pasien beri rating + comment setelah COMPLETED
  - Scheduler `booking-progress` yang memindahkan status `PAID → IN_PROGRESS → COMPLETED`, mengunci chat 24 jam pasca sesi terakhir, dan memicu notifikasi/reschedule bila ada penyimpangan
  - Tampilkan histori review di profil terapis
- **Admin CMS**
  - Dashboard Next.js dengan metric dasar (booking status breakdown)
  - CRUD therapy packages, manajemen user (activate/deactivate)
  - ✅ Audit log tampilan read-only + halaman tindakan khusus (force cancel, override jadwal, unggah bukti bayar manual dari pihak admin)
- **QA & Launch**
  - Test plan: unit (backend), integration (booking flow), e2e (RN)
  - Deploy backend (Cloud Run), file storage (GCS), verifikasi DNS
  - Soft launch ke user internal, kumpulkan feedback

---

## 10. Celah & Solusi Penyempurnaan Flow

| Celah | Dampak | Solusi Praktis |
| --- | --- | --- |
| Consent belum disimpan | Kepatuhan hukum lemah | ✅ Tambah tabel `consents` + endpoint `POST /bookings/:id/consent` yang menyimpan teks versi + meta (ip/user-agent). FE tinggal menampilkan teks terbaru sebelum submit. |
| Deadline pembayaran tidak otomatis expire | Booking menggantung lama | ✅ Scheduler (Nest Schedule) memeriksa `PAYMENT_PENDING` lewat dari `paymentDueAt`, ubah booking ke `PAYMENT_EXPIRED` dan tandai payment `REJECTED`, juga mengirim notifikasi status. |
| Bukti transfer diunggah langsung dari FE ke luar server | Bukti bisa dihapus user, audit lemah | ✅ Sediakan service upload internal `POST /files/payment-proof` yang menyimpan file di storage server Fisioku, memberi `fileId`, dan hanya exposing URL signed singkat ke admin. FE wajib menyertakan `fileId` saat update booking. |
| Jadwal terapis belum bisa menolak slot | Risiko double-book | ✅ Tambah tabel `TherapistAvailability` + endpoint RN untuk menambah slot, serta validasi booking yang menolak jadwal bentrok. |
| Transisi `PAID → IN_PROGRESS → COMPLETED` belum terdefinisi | Booking bisa stagnan atau lompat status | Scheduler `booking-progress` menandai sesi aktif, memindah status berdasarkan `booking_sessions`, mengunci chat 24 jam pasca sesi terakhir, dan membuka review. Terapis/admin hanya boleh ubah jadwal melalui endpoint yang otomatis mencatat audit + kirim notifikasi. |
| Chat belum otomatis read-only 24 jam pasca sesi | Chat tetap aktif terlalu lama | Setelah sesi terakhir `COMPLETED`, scheduler set `chatThread.lockedAt = completedAt + 24h`. Firestore rules + RN app blokir kirim pesan jika `lockedAt` ada. |
| Audit admin belum ada | Sulit telusur tindakan | ✅ Middleware `AuditService.record()` menyimpan setiap aksi admin (verifikasi pembayaran, toggle paket, force cancel, reupload bukti) ke tabel `audit_logs` + UI admin untuk memantau. |
| Mobile flow belum teruji end-to-end | Risiko regression saat go-live | Siapkan skrip API/UAT (Postman/Playwright) hingga RN app siap; gunakan hook React Query seragam agar logic konsisten. |
