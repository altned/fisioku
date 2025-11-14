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
  PatientProfile,
  Payment,
  PaymentMethod,
  PaymentStatus,
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

type BookingWithRelations = Booking & {
  patient: User & { patientProfile: PatientProfile | null };
  therapist: User & { therapistProfile: TherapistProfile | null };
  package: TherapyPackage;
  sessions: BookingSession[];
  payment: Payment | null;
  review: Review | null;
};

const PAYMENT_DEADLINE_HOURS = 1;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly bookingInclude = {
    patient: {
      include: { patientProfile: true },
    },
    therapist: {
      include: { therapistProfile: true },
    },
    package: true,
    sessions: true,
    payment: true,
    review: true,
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

    const booking = await this.prisma.booking.create({
      data: {
        patientId: patient.id,
        therapistId: therapist.id,
        packageId: therapyPackage.id,
        status: BookingStatus.WAITING_THERAPIST_CONFIRM,
        notesFromPatient: dto.notesFromPatient,
        painLevel: dto.painLevel,
        preferredSchedule,
        consentAccepted: dto.consentAccepted,
        sessions: {
          create: {
            sessionNumber: 1,
            scheduledAt: preferredSchedule,
            status: SessionStatus.WAITING_THERAPIST_CONFIRM,
          },
        },
        payment: {
          create: {
            amount: therapyPackage.price,
            method: PaymentMethod.BANK_TRANSFER,
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
      await this.markBookingExpired(bookingId);
      throw new BadRequestException('Payment deadline has passed.');
    }

    if (!booking.payment) {
      throw new BadRequestException('Payment record not found.');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.WAITING_ADMIN_VERIFY_PAYMENT,
        payment: {
          update: {
            proofUrl: dto.proofUrl,
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
    return response;
  }

  private toResponse(booking: BookingWithRelations): BookingResponse {
    return {
      id: booking.id,
      patientId: booking.patientId,
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
            amount: booking.payment.amount.toString(),
            uploadedAt: booking.payment.uploadedAt,
            verifiedAt: booking.payment.verifiedAt,
            verifiedBy: booking.payment.verifiedBy,
          }
        : null,
      review: booking.review
        ? {
            id: booking.review.id,
            rating: booking.review.rating,
            comment: booking.review.comment,
            createdAt: booking.review.createdAt,
          }
        : null,
      createdAt: booking.createdAt,
    };
  }

  private mapSession = (session: BookingSession): BookingSessionResponse => ({
    id: session.id,
    sessionNumber: session.sessionNumber,
    scheduledAt: session.scheduledAt,
    status: session.status,
  });

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

  private async markBookingExpired(bookingId: string) {
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.PAYMENT_EXPIRED,
        payment: {
          update: {
            status: PaymentStatus.REJECTED,
          },
        },
      },
    });
  }

  private getPaymentDeadline(): Date {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + PAYMENT_DEADLINE_HOURS);
    return deadline;
  }
}
