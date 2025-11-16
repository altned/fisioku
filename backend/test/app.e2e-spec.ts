import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

type HealthResponse = {
  status: string;
  timestamp: string;
};

type TherapistListResponse = {
  data: unknown[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type AuthResponse = {
  accessToken: string;
};

type BookingE2EResponse = {
  id: string;
  status: string;
  sessions: Array<{
    id: string;
    sessionNumber: number;
  }>;
};

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      defaultVersion: '1',
      type: VersioningType.URI,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = new PrismaClient();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('/api/v1/health (GET)', async () => {
    const res: Response = await request(app.getHttpServer()).get(
      '/api/v1/health',
    );
    expect(res.status).toBe(200);
    const body = res.body as HealthResponse;
    expect(body.status).toEqual('ok');
  });

  it('/api/v1/therapists (GET)', async () => {
    const res: Response = await request(app.getHttpServer()).get(
      '/api/v1/therapists',
    );
    expect(res.status).toBe(200);
    const body = res.body as TherapistListResponse;
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.page).toBeGreaterThanOrEqual(1);
    expect(body.meta.limit).toBeGreaterThanOrEqual(1);
    expect(typeof body.meta.total).toBe('number');
  });

  it('/api/v1/bookings (POST)', async () => {
    const patientAuth = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'patient@fisioku.local',
        password: 'Password123!',
      });

    expect(patientAuth.status).toBe(200);
    const patientBody = patientAuth.body as AuthResponse;
    const patientToken = patientBody.accessToken;
    expect(patientToken).toBeDefined();

    const packagesRes = await request(app.getHttpServer())
      .get('/api/v1/packages')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(packagesRes.status).toBe(200);
    const availablePackages = packagesRes.body as Array<{ id: string }>;

    const therapist = await prisma.therapistProfile.findFirst({
      include: { user: true },
    });
    if (!therapist) {
      throw new Error('Therapist seed not found');
    }

    const therapyPackage =
      availablePackages[0] ??
      (await prisma.therapyPackage.create({
        data: {
          name: `Test Package ${Date.now()}`,
          sessionCount: 1,
          price: 250_000,
          description: 'Integration test package',
          isActive: true,
        },
      }));

    const preferredSchedule = new Date(
      Date.now() + 60 * 60 * 1000,
    ).toISOString();

    const bookingRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        therapistId: therapist.userId,
        packageId: therapyPackage.id,
        preferredSchedule,
        consentAccepted: true,
        painLevel: 4,
        notesFromPatient: 'Integration booking test',
      });

    expect(bookingRes.status).toBe(201);
    const bookingBody = bookingRes.body as BookingE2EResponse;
    expect(bookingBody.status).toEqual('WAITING_THERAPIST_CONFIRM');
    expect(bookingBody.sessions).toHaveLength(1);
    const sessionId = bookingBody.sessions[0].id;

    const consentRes = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingBody.id}/consent`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ textVersion: 'Consent v1.0' });
    expect(consentRes.status).toBe(201);

    const chatRes = await request(app.getHttpServer())
      .get(`/api/v1/chat/threads/${bookingBody.id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(chatRes.status).toBe(200);
    const chatBody = chatRes.body as { firestoreId: string };
    expect(chatBody.firestoreId).toEqual(bookingBody.id);

    const therapistAuth = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'therapist@fisioku.local',
        password: 'Password123!',
      });

    expect(therapistAuth.status).toBe(200);
    const therapistToken = (therapistAuth.body as AuthResponse).accessToken;

    const confirmRes = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingBody.id}/therapist-confirm`)
      .set('Authorization', `Bearer ${therapistToken}`)
      .send({ accept: true });

    expect(confirmRes.status).toBe(200);
    const confirmBody = confirmRes.body as BookingE2EResponse;
    expect(confirmBody.status).toEqual('PAYMENT_PENDING');

    const noteRes = await request(app.getHttpServer())
      .put(`/api/v1/booking-sessions/${sessionId}/note`)
      .set('Authorization', `Bearer ${therapistToken}`)
      .send({ content: 'Catatan sesi awal' });

    expect(noteRes.status).toBe(200);
    const noteBody = noteRes.body as { content: string };
    expect(noteBody.content).toEqual('Catatan sesi awal');

    const scheduleRes = await request(app.getHttpServer())
      .patch(`/api/v1/booking-sessions/${sessionId}/schedule`)
      .set('Authorization', `Bearer ${therapistToken}`)
      .send({
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    expect(scheduleRes.status).toBe(200);

    const completeRes = await request(app.getHttpServer())
      .patch(`/api/v1/booking-sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${therapistToken}`);

    expect(completeRes.status).toBe(200);

    const uploadRes = await request(app.getHttpServer())
      .post('/api/v1/files/payment-proof')
      .set('Authorization', `Bearer ${patientToken}`)
      .attach('file', Buffer.from('dummy-image'), {
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
      });

    expect(uploadRes.status).toBe(201);
    const uploadBody = uploadRes.body as { fileId: string };
    expect(uploadBody.fileId).toBeDefined();

    const proofRes = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingBody.id}/payment-proof`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ fileId: uploadBody.fileId });

    expect(proofRes.status).toBe(200);
    const proofBody = proofRes.body as BookingE2EResponse;
    expect(proofBody.status).toEqual('WAITING_ADMIN_VERIFY_PAYMENT');

    const adminAuth = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@fisioku.local',
        password: 'Password123!',
      });

    expect(adminAuth.status).toBe(200);
    const adminToken = (adminAuth.body as AuthResponse).accessToken;

    const summaryRes = await request(app.getHttpServer())
      .get('/api/v1/admin/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(summaryRes.status).toBe(200);

    const verifyRes = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingBody.id}/payment/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true });

    expect(verifyRes.status).toBe(200);
    const verifyBody = verifyRes.body as BookingE2EResponse;
    expect(verifyBody.status).toEqual('PAID');

    await prisma.booking.update({
      where: { id: bookingBody.id },
      data: { status: 'COMPLETED' },
    });

    const reviewRes = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingBody.id}/review`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ rating: 5, comment: 'Pelayanan ramah' });

    expect(reviewRes.status).toBe(201);
    const reviewBody = reviewRes.body as { rating: number };
    expect(reviewBody.rating).toEqual(5);

    const tokenValue = `test-token-${Date.now()}`;
    const registerTokenRes = await request(app.getHttpServer())
      .post('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ token: tokenValue, platform: 'ios' });

    expect(registerTokenRes.status).toBe(201);
    const tokenBody = registerTokenRes.body as { token: string };
    expect(tokenBody.token).toEqual(tokenValue);

    const pkgRes = await request(app.getHttpServer())
      .post('/api/v1/admin/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Admin Package ${Date.now()}`,
        sessionCount: 2,
        price: 500000,
      });
    expect(pkgRes.status).toBe(201);
    const pkgBody = pkgRes.body as { id: string };
    const pkgId = pkgBody.id;

    const myBookingsRes = await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(myBookingsRes.status).toBe(200);
    const myBookings = myBookingsRes.body as BookingE2EResponse[];
    expect(Array.isArray(myBookings)).toBe(true);
    expect(myBookings.some((booking) => booking.id === bookingBody.id)).toBe(
      true,
    );

    await prisma.booking.delete({
      where: { id: bookingBody.id },
    });
    await prisma.therapyPackage.delete({
      where: { id: therapyPackage.id },
    });
    await prisma.notificationToken.deleteMany({
      where: { token: tokenValue },
    });
    await prisma.therapyPackage.delete({ where: { id: pkgId } });
  });
});
