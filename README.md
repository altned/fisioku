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

# setelah kontainer sehat, jalankan migrasi + seed
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

Perintah utilitas:

- `npm run lint` – menjalankan ESLint dengan autofix.
- `npm run test` / `npm run test:e2e` – unit & e2e test dasar.
- `npm run db:migrate` / `npm run db:seed` – utilitas Prisma tambahan.
