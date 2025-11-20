import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Booking,
  BookingSession,
  BookingStatus,
  Consent,
  PatientAddress,
  PatientProfile,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SessionNote,
  SessionStatus,
  TherapistProfile,
  TherapyPackage,
  User,
  UserRole,
  UserStatus,
  Review,
} from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { UploadPaymentProofDto } from './dto/upload-payment-proof.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingResponse,
  BookingSessionResponse,
} from './interfaces/booking-response.interface';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FilesService } from '../files/files.service';
import { AuditService } from '../audit/audit.service';
import { PatientAddressResponse } from '../patient-addresses/interfaces/patient-address-response.interface';

type BookingSessionWithNote = BookingSession & {
  note: SessionNote | null;
};

export type BookingWithRelations = Booking & {
  patient: User & { patientProfile: PatientProfile | null };
  therapist: User & { therapistProfile: TherapistProfile | null };
  package: TherapyPackage;
  sessions: BookingSessionWithNote[];
  payment: Payment | null;
  review: Review | null;
  consent: Consent | null;
  patientAddress: PatientAddress | null;
};

const PAYMENT_DEADLINE_HOURS = 1;
const PAYMENT_BLOCKED_STATUSES: BookingStatus[] = [
  BookingStatus.WAITING_THERAPIST_CONFIRM,
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT,
  BookingStatus.PAID,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

const DEFAULT_THERAPIST_SHARE_RATE = 0.7;
const FINAL_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CANCELLED_BY_ADMIN,
  BookingStatus.CANCELLED_BY_PATIENT,
  BookingStatus.CANCELLED_BY_THERAPIST,
  BookingStatus.COMPLETED,
  BookingStatus.PAYMENT_EXPIRED,
  BookingStatus.REFUNDED,
];

const PATIENT_CANCELLABLE_STATUSES: BookingStatus[] = [
  BookingStatus.WAITING_THERAPIST_CONFIRM,
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT,
];

const THERAPIST_CANCELLABLE_STATUSES: BookingStatus[] = [
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT,
];

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly notificationsService: NotificationsService,
    private readonly filesService: FilesService,
    private readonly auditService: AuditService,
  ) {}

  get bookingRelations() {
    return this.bookingInclude;
  }

  mapBookingResponse(booking: BookingWithRelations): BookingResponse {
    return this.toResponse(booking);
  }

  private readonly bookingInclude = {
    patient: {
      include: { patientProfile: true },
    },
    therapist: {
      include: { therapistProfile: true },
    },
    package: true,
    sessions: { include: { note: true } },
    payment: true,
    review: true,
    consent: true,
    patientAddress: true,
  };

  async create(
    patientId: string,
    dto: CreateBookingDto,
  ): Promise<BookingResponse> {
    if (!dto.consentAccepted) {
      throw new BadRequestException('Consent must be accepted before booking.');
    }

    const preferredSchedule = new Date(dto.preferredSchedule);
    if (Number.isNaN(preferredSchedule.getTime())) {
      throw new BadRequestException('Preferred schedule is invalid.');
    }

    if (preferredSchedule.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Preferred schedule must be in the future.',
      );
    }

    const [patient, therapist, therapyPackage] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: patientId },
        include: { patientProfile: true },
      }),
      this.prisma.user.findUnique({
        where: { id: dto.therapistId },
        include: { therapistProfile: true },
      }),
      this.prisma.therapyPackage.findUnique({
        where: { id: dto.packageId },
      }),
    ]);

    if (!patient || !patient.patientProfile) {
      throw new BadRequestException(
        'Patient profile must be completed before booking.',
      );
    }

    if (
      !therapist ||
      therapist.role !== UserRole.THERAPIST ||
      therapist.status !== UserStatus.ACTIVE ||
      !therapist.therapistProfile
    ) {
      throw new NotFoundException('Therapist not found.');
    }

    if (patient.id === therapist.id) {
      throw new BadRequestException('You cannot book yourself as therapist.');
    }

    if (!therapyPackage || !therapyPackage.isActive) {
      throw new BadRequestException('Therapy package is unavailable.');
    }

    await this.ensureTherapistAvailability(therapist.id, preferredSchedule);

    const overlappingBooking = await this.findOverlappingBooking(
      dto.therapistId,
      preferredSchedule,
    );

    if (overlappingBooking) {
      throw new BadRequestException('Therapist is not available at that time.');
    }

    const therapistShareRate =
      therapyPackage.therapistShareRate ??
      new Prisma.Decimal(DEFAULT_THERAPIST_SHARE_RATE);
    const platformFeeRate = new Prisma.Decimal(1).minus(therapistShareRate);
    const therapistShareAmount = therapyPackage.price.mul(therapistShareRate);
    const platformFeeAmount = therapyPackage.price.minus(therapistShareAmount);

    let patientAddressId: string | undefined;
    if (dto.patientAddressId) {
      const address = await this.prisma.patientAddress.findUnique({
        where: { id: dto.patientAddressId },
      });
      if (!address || address.patientId !== patient.id) {
        throw new BadRequestException('Patient address is invalid.');
      }
      patientAddressId = address.id;
    }

    const booking = await this.prisma.booking.create({
      data: {
        patientId: patient.id,
        patientAddressId,
        therapistId: therapist.id,
        packageId: therapyPackage.id,
        status: BookingStatus.WAITING_THERAPIST_CONFIRM,
        notesFromPatient: dto.notesFromPatient,
        painLevel: dto.painLevel,
        preferredSchedule,
        consentAccepted: dto.consentAccepted,
        sessions: {
          create: this.buildInitialSessions(
            therapyPackage.sessionCount,
            preferredSchedule,
          ),
        },
        payment: {
          create: {
            amount: therapyPackage.price,
            method: PaymentMethod.BANK_TRANSFER,
            therapistShareRate,
            platformFeeRate,
            therapistShareAmount,
            platformFeeAmount,
          },
        },
      },
      include: this.bookingInclude,
    });

    const response = this.toResponse(booking);
    await this.chatService.ensureThreadForBooking(
      response.id,
      response.patientId,
      response.therapist.id,
    );
    await this.notificationsService.notifyBookingStatusChange(response);

    return response;
  }

  async confirmByTherapist(
    therapistId: string,
    bookingId: string,
    dto: ConfirmBookingDto,
  ): Promise<BookingResponse> {
    const booking = await this.findBookingOrThrow(bookingId);

    if (booking.therapistId !== therapistId) {
      throw new ForbiddenException('You are not assigned to this booking.');
    }

    if (booking.status !== BookingStatus.WAITING_THERAPIST_CONFIRM) {
      throw new BadRequestException('Booking cannot be confirmed.');
    }

    const updateData = dto.accept
      ? {
          status: BookingStatus.PAYMENT_PENDING,
          paymentDueAt: this.getPaymentDeadline(),
        }
      : {
          status: BookingStatus.CANCELLED_BY_THERAPIST,
          paymentDueAt: null,
          sessions: {
            updateMany: {
              where: { bookingId },
              data: { status: SessionStatus.CANCELLED },
            },
          },
        };

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: this.bookingInclude,
    });
    await this.auditService.record({
      action: dto.accept
        ? 'BOOKING_THERAPIST_ACCEPTED'
        : 'BOOKING_THERAPIST_REJECTED',
      actorId: therapistId,
      targetType: 'booking',
      targetId: bookingId,
    });
    const response = this.toResponse(updated);
    await this.notificationsService.notifyBookingStatusChange(response);
    return response;
  }

  async uploadPaymentProof(
    patientId: string,
    bookingId: string,
    dto: UploadPaymentProofDto,
  ): Promise<BookingResponse> {
    const booking = await this.findBookingOrThrow(bookingId);

    if (booking.patientId !== patientId) {
      throw new ForbiddenException(
        'You are not allowed to update this booking.',
      );
    }

    if (booking.status !== BookingStatus.PAYMENT_PENDING) {
      throw new BadRequestException('Payment proof cannot be uploaded now.');
    }

    if (booking.paymentDueAt && booking.paymentDueAt.getTime() < Date.now()) {
      await this.expirePayment(bookingId);
      throw new BadRequestException('Payment deadline has passed.');
    }

    if (!booking.payment) {
      throw new BadRequestException('Payment record not found.');
    }

    const storedFile = await this.filesService.ensurePaymentProofUsable(
      dto.fileId,
      patientId,
      { allowDifferentUploader: false },
    );

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT,
        payment: {
          update: {
            proofUrl: null,
            proofFileId: storedFile.id,
            method: dto.method ?? booking.payment.method,
            status: PaymentStatus.WAITING_ADMIN_VERIFY,
            uploadedAt: new Date(),
          },
        },
      },
      include: this.bookingInclude,
    });

    const response = this.toResponse(updated);
    await this.notificationsService.notifyBookingStatusChange(response);
    return response;
  }

  async acceptConsent(
    patientId: string,
    bookingId: string,
    textVersion: string,
    meta?: { ip?: string | string[]; userAgent?: string | string[] },
  ): Promise<BookingResponse> {
    const booking = await this.findBookingOrThrow(bookingId);

    if (booking.patientId !== patientId) {
      throw new ForbiddenException(
        'You cannot submit consent for this booking.',
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        consent: {
          upsert: {
            update: {
              textVersion,
              acceptedAt: new Date(),
              ipAddress: typeof meta?.ip === 'string' ? meta?.ip : undefined,
              userAgent:
                typeof meta?.userAgent === 'string'
                  ? meta?.userAgent
                  : undefined,
            },
            create: {
              textVersion,
              ipAddress: typeof meta?.ip === 'string' ? meta?.ip : undefined,
              userAgent:
                typeof meta?.userAgent === 'string'
                  ? meta?.userAgent
                  : undefined,
            },
          },
        },
      },
      include: this.bookingInclude,
    });

    return this.toResponse(updated as BookingWithRelations);
  }

  async verifyPayment(
    adminId: string,
    bookingId: string,
    dto: VerifyPaymentDto,
  ): Promise<BookingResponse> {
    const booking = await this.findBookingOrThrow(bookingId);

    if (
      booking.status !== BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT ||
      !booking.payment ||
      booking.payment.status !== PaymentStatus.WAITING_ADMIN_VERIFY
    ) {
      throw new BadRequestException('Payment is not ready for verification.');
    }

    const now = new Date();

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: dto.approved
        ? {
            status: BookingStatus.PAID,
            payment: {
              update: {
                status: PaymentStatus.VERIFIED,
                verifiedBy: adminId,
                verifiedAt: now,
              },
            },
          }
        : {
            status: BookingStatus.PAYMENT_PENDING,
            paymentDueAt: this.getPaymentDeadline(),
            payment: {
              update: {
                status: PaymentStatus.REJECTED,
                verifiedBy: adminId,
                verifiedAt: now,
              },
            },
          },
      include: this.bookingInclude,
    });

    const response = this.toResponse(updated);
    await this.notificationsService.notifyBookingStatusChange(response);
    await this.auditService.record({
      action: dto.approved
        ? 'BOOKING_PAYMENT_VERIFIED'
        : 'BOOKING_PAYMENT_REJECTED',
      actorId: adminId,
      targetType: 'booking',
      targetId: bookingId,
      metadata: {
        paymentStatus: dto.approved
          ? PaymentStatus.VERIFIED
          : PaymentStatus.REJECTED,
      },
    });
    return response;
  }

  private toResponse(booking: BookingWithRelations): BookingResponse {
    return {
      id: booking.id,
      patientId: booking.patientId,
      patient: {
        id: booking.patient.id,
        email: booking.patient.email,
        fullName: booking.patient.patientProfile?.fullName,
      },
      therapist: {
        id: booking.therapistId,
        fullName: booking.therapist.therapistProfile?.fullName ?? '',
        city: booking.therapist.therapistProfile?.city,
        specialties: booking.therapist.therapistProfile?.specialties ?? [],
        photoUrl: booking.therapist.therapistProfile?.photoUrl,
      },
      package: {
        id: booking.packageId,
        name: booking.package.name,
        sessionCount: booking.package.sessionCount,
        price: booking.package.price.toString(),
      },
      status: booking.status,
      notesFromPatient: booking.notesFromPatient,
      painLevel: booking.painLevel,
      preferredSchedule: booking.preferredSchedule,
      consentAccepted: booking.consentAccepted,
      paymentDueAt: booking.paymentDueAt,
      sessions: booking.sessions
        .sort((a, b) => a.sessionNumber - b.sessionNumber)
        .map(this.mapSession),
      payment: booking.payment
        ? {
            status: booking.payment.status,
            method: booking.payment.method,
            proofUrl: booking.payment.proofUrl,
            proofFileId: booking.payment.proofFileId,
            amount: booking.payment.amount.toString(),
            uploadedAt: booking.payment.uploadedAt,
            verifiedAt: booking.payment.verifiedAt,
            verifiedBy: booking.payment.verifiedBy,
            therapistSharePercentage: booking.payment.therapistShareRate
              ? Number(booking.payment.therapistShareRate) * 100
              : null,
            platformFeePercentage: booking.payment.platformFeeRate
              ? Number(booking.payment.platformFeeRate) * 100
              : null,
            therapistShareAmount: booking.payment.therapistShareAmount
              ? booking.payment.therapistShareAmount.toString()
              : null,
            platformFeeAmount: booking.payment.platformFeeAmount
              ? booking.payment.platformFeeAmount.toString()
              : null,
          }
        : null,
      patientAddress: booking.patientAddress
        ? this.mapPatientAddress(booking.patientAddress)
        : null,
      review: booking.review
        ? {
            id: booking.review.id,
            rating: booking.review.rating,
            comment: booking.review.comment,
            createdAt: booking.review.createdAt,
          }
        : null,
      consent: booking.consent
        ? {
            textVersion: booking.consent.textVersion,
            acceptedAt: booking.consent.acceptedAt,
            ipAddress: booking.consent.ipAddress,
            userAgent: booking.consent.userAgent,
          }
        : null,
      createdAt: booking.createdAt,
    };
  }

  private mapSession = (
    session: BookingSessionWithNote,
  ): BookingSessionResponse => ({
    id: session.id,
    sessionNumber: session.sessionNumber,
    scheduledAt: session.scheduledAt,
    status: session.status,
    note: session.note?.content ?? null,
  });

  private mapPatientAddress(
    address: PatientAddress,
  ): PatientAddressResponse {
    return {
      id: address.id,
      label: address.label,
      fullAddress: address.fullAddress,
      city: address.city,
      latitude: address.latitude ? Number(address.latitude) : null,
      longitude: address.longitude ? Number(address.longitude) : null,
      landmark: address.landmark,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  private async findBookingOrThrow(id: string): Promise<BookingWithRelations> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: this.bookingInclude,
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    return booking as BookingWithRelations;
  }

  async expirePayment(bookingId: string): Promise<BookingResponse | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: this.bookingInclude,
    });

    if (!booking || booking.status !== BookingStatus.PAYMENT_PENDING) {
      return null;
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.PAYMENT_EXPIRED,
        payment: booking.payment
          ? {
              update: {
                status: PaymentStatus.REJECTED,
              },
            }
          : undefined,
      },
      include: this.bookingInclude,
    });

    const response = this.toResponse(updated as BookingWithRelations);
    await this.notificationsService.notifyBookingStatusChange(response);
    return response;
  }

  async listForPatient(patientId: string): Promise<BookingResponse[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { patientId },
      include: this.bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map((booking) =>
      this.toResponse(booking as BookingWithRelations),
    );
  }

  async cancelByAdmin(bookingId: string): Promise<BookingResponse> {
    const booking = await this.findBookingOrThrow(bookingId);

    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED_BY_ADMIN
    ) {
      throw new BadRequestException('Booking cannot be cancelled.');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED_BY_ADMIN,
        paymentDueAt: null,
        sessions: {
          updateMany: {
            where: { bookingId },
            data: { status: SessionStatus.CANCELLED },
          },
        },
        payment: booking.payment
          ? {
              update: {
                status: PaymentStatus.REJECTED,
              },
            }
          : undefined,
      },
      include: this.bookingInclude,
    });

    const response = this.toResponse(updated as BookingWithRelations);
    await this.notificationsService.notifyBookingStatusChange(response);
    return response;
  }

  async cancelByPatient(
    patientId: string,
    bookingId: string,
  ): Promise<BookingResponse> {
    const booking = await this.findBookingOrThrow(bookingId);

    if (booking.patientId !== patientId) {
      throw new ForbiddenException('You cannot cancel this booking.');
    }

    if (!PATIENT_CANCELLABLE_STATUSES.includes(booking.status)) {
      throw new BadRequestException(
        'Booking cannot be cancelled at this stage. Please contact support.',
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED_BY_PATIENT,
        paymentDueAt: null,
        sessions: {
          updateMany: {
            where: { bookingId },
            data: { status: SessionStatus.CANCELLED },
          },
        },
        payment: booking.payment
          ? {
              update: {
                status: PaymentStatus.REJECTED,
              },
            }
          : undefined,
      },
      include: this.bookingInclude,
    });

    const response = this.toResponse(updated as BookingWithRelations);
    await this.notificationsService.notifyBookingStatusChange(response);
    return response;
  }

  async cancelByTherapist(
    therapistId: string,
    bookingId: string,
    reason?: string,
  ): Promise<BookingResponse> {
    const booking = await this.findBookingOrThrow(bookingId);

    if (booking.therapistId !== therapistId) {
      throw new ForbiddenException('You cannot cancel this booking.');
    }

    if (!THERAPIST_CANCELLABLE_STATUSES.includes(booking.status)) {
      throw new BadRequestException(
        'Booking cannot be cancelled by therapist at this stage.',
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED_BY_THERAPIST,
        paymentDueAt: null,
        sessions: {
          updateMany: {
            where: { bookingId },
            data: { status: SessionStatus.CANCELLED },
          },
        },
        payment: booking.payment
          ? {
              update: {
                status: PaymentStatus.REJECTED,
              },
            }
          : undefined,
      },
      include: this.bookingInclude,
    });

    await this.auditService.record({
      action: 'BOOKING_CANCELLED_BY_THERAPIST',
      actorId: therapistId,
      targetType: 'booking',
      targetId: bookingId,
      metadata: {
        reason: reason ?? null,
      },
    });

    const response = this.toResponse(updated as BookingWithRelations);
    await this.notificationsService.notifyBookingStatusChange(response);
    return response;
  }

  async attachPaymentProofByAdmin(
    adminId: string,
    bookingId: string,
    dto: { fileId: string; method?: PaymentMethod },
  ): Promise<BookingResponse> {
    const booking = await this.findBookingOrThrow(bookingId);

    if (booking.status !== BookingStatus.PAYMENT_PENDING) {
      throw new BadRequestException(
        'Payment proof cannot be attached for this booking.',
      );
    }

    if (!booking.payment) {
      throw new BadRequestException('Payment record not found.');
    }

    const storedFile = await this.filesService.ensurePaymentProofUsable(
      dto.fileId,
      adminId,
      { allowDifferentUploader: true },
    );

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT,
        payment: {
          update: {
            proofUrl: null,
            proofFileId: storedFile.id,
            method: dto.method ?? booking.payment.method,
            status: PaymentStatus.WAITING_ADMIN_VERIFY,
            uploadedAt: new Date(),
          },
        },
      },
      include: this.bookingInclude,
    });

    const response = this.toResponse(updated as BookingWithRelations);
    await this.notificationsService.notifyBookingStatusChange(response);
    return response;
  }

  private getPaymentDeadline(): Date {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + PAYMENT_DEADLINE_HOURS);
    return deadline;
  }

  async listForTherapist(
    therapistId: string,
    status?: BookingStatus,
  ): Promise<BookingResponse[]> {
    const where: Prisma.BookingWhereInput = { therapistId };
    if (status) {
      where.status = status;
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: this.bookingInclude,
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((booking) =>
      this.toResponse(booking as BookingWithRelations),
    );
  }

  private async ensureTherapistAvailability(
    therapistId: string,
    preferredSchedule: Date,
  ) {
    const availability = await this.prisma.therapistAvailability.findFirst({
      where: {
        therapistId,
        startTime: { lte: preferredSchedule },
        endTime: { gt: preferredSchedule },
      },
    });

    if (!availability) {
      throw new BadRequestException(
        'Therapist is not available at the selected time.',
      );
    }

    const conflictingSession = await this.prisma.bookingSession.findFirst({
      where: {
        booking: {
          therapistId,
          status: { in: PAYMENT_BLOCKED_STATUSES },
        },
        scheduledAt: {
          gte: availability.startTime,
          lt: availability.endTime,
        },
        status: { not: SessionStatus.CANCELLED },
      },
    });

    if (conflictingSession) {
      throw new BadRequestException(
        'Therapist is already booked near the selected time.',
      );
    }
  }

  private async findOverlappingBooking(
    therapistId: string,
    preferredSchedule: Date,
  ) {
    return this.prisma.booking.findFirst({
      where: {
        therapistId,
        status: {
          in: PAYMENT_BLOCKED_STATUSES,
        },
        sessions: {
          some: {
            scheduledAt: preferredSchedule,
          },
        },
      },
    });
  }

  private buildInitialSessions(
    sessionCount: number,
    preferredSchedule: Date,
  ): Prisma.BookingSessionCreateWithoutBookingInput[] {
    const normalizedCount = Number.isInteger(sessionCount) && sessionCount > 0 ? sessionCount : 1;
    const sessions: Prisma.BookingSessionCreateWithoutBookingInput[] = [];

    sessions.push({
      sessionNumber: 1,
      scheduledAt: preferredSchedule,
      status: SessionStatus.WAITING_THERAPIST_CONFIRM,
    });

    for (let sessionNumber = 2; sessionNumber <= normalizedCount; sessionNumber += 1) {
      sessions.push({
        sessionNumber,
        status: SessionStatus.PENDING_SCHEDULE,
      });
    }

    return sessions;
  }

  async addSessions(bookingId: string, count: number): Promise<BookingResponse> {
    if (!Number.isInteger(count) || count <= 0) {
      throw new BadRequestException('Count must be a positive integer.');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { sessions: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (FINAL_BOOKING_STATUSES.includes(booking.status)) {
      throw new BadRequestException('Cannot add sessions to a finalized booking.');
    }

    const maxSessionNumber = booking.sessions.reduce(
      (max, session) => Math.max(max, session.sessionNumber),
      0,
    );

    await this.prisma.bookingSession.createMany({
      data: Array.from({ length: count }).map((_, index) => ({
        bookingId,
        sessionNumber: maxSessionNumber + index + 1,
        status: SessionStatus.PENDING_SCHEDULE,
      })),
    });

    const updated = await this.findBookingOrThrow(bookingId);
    return this.toResponse(updated);
  }
}
