"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  adminApi,
  uploadPaymentProofFile,
  type BookingListResponse,
} from "@/lib/api";
import { ChangeEvent, useMemo, useRef, useState } from "react";

const bookingStatuses = [
  "WAITING_THERAPIST_CONFIRM",
  "PAYMENT_PENDING",
  "WAITING_ADMIN_VERIFY_PAYMENT",
  "PAID",
  "IN_PROGRESS",
  "COMPLETED",
];

export default function BookingsPage() {
  const [status, setStatus] = useState<string>("");
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["bookings", status],
    queryFn: () => adminApi.bookings({ status: status || undefined }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["bookings"] });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500">
            Monitor proses booking dan status pembayaran terbaru.
          </p>
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="soft-input text-sm"
        >
          <option value="">Semua Status</option>
          {bookingStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p>Loading bookings...</p>}
      {isError && <p className="text-red-500">Gagal memuat data booking.</p>}

      {data && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Pasien</th>
                <th className="px-4 py-3">Terapis</th>
                <th className="px-4 py-3">Paket</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pembayaran</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
            </tbody>
          </table>
          <div className="border-t bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Total {data.meta.total} booking, halaman {data.meta.page} / {data.meta.totalPages}
          </div>
        </div>
      )}
    </div>
  );
}

type BookingRowData = BookingListResponse["data"][number];

function BookingRow({ booking }: { booking: BookingRowData }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatQuery = useQuery({
    queryKey: ["booking-chat", booking.id],
    queryFn: () => adminApi.chatMessages(booking.id),
    enabled: showChat,
  });

  const verifyMutation = useMutation({
    mutationFn: (approved: boolean) =>
      adminApi.verifyPayment(booking.id, approved),
    onSuccess: () => invalidate(),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) =>
      adminApi.cancelBooking(booking.id, { reason }),
    onSuccess: () => invalidate(),
  });

  const overrideMutation = useMutation({
    mutationFn: (payload: { sessionId: string; scheduledAt: string }) =>
      adminApi.overrideSession(booking.id, payload.sessionId, {
        scheduledAt: payload.scheduledAt,
      }),
    onSuccess: () => invalidate(),
  });

  const attachMutation = useMutation({
    mutationFn: (fileId: string) =>
      adminApi.attachPaymentProof(booking.id, { fileId }),
    onSuccess: () => invalidate(),
  });

  const nextSession = useMemo(
    () =>
      booking.sessions?.find((session) => session.status !== "COMPLETED") ??
      null,
    [booking.sessions],
  );

  const isTerminal = [
    "COMPLETED",
    "CANCELLED_BY_ADMIN",
    "CANCELLED_BY_PATIENT",
    "CANCELLED_BY_THERAPIST",
    "PAYMENT_EXPIRED",
    "REFUNDED",
  ].includes(booking.status);

  const canUploadProof = booking.status === "PAYMENT_PENDING";

  const handleForceCancel = () => {
    if (isTerminal) return;
    const reason = window.prompt("Alasan pembatalan? (opsional)") ?? undefined;
    cancelMutation.mutate(reason);
  };

  const handleOverrideSchedule = () => {
    if (!nextSession) {
      window.alert("Tidak ada sesi yang bisa dijadwalkan ulang.");
      return;
    }
    const defaultValue =
      nextSession.scheduledAt ?? new Date().toISOString().slice(0, 16);
    const result =
      window.prompt(
        "Masukkan jadwal baru (format ISO, mis. 2025-01-01T09:00:00)",
        defaultValue,
      ) ?? "";
    if (!result.trim()) {
      return;
    }
    overrideMutation.mutate({ sessionId: nextSession.id, scheduledAt: result });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const { fileId } = await uploadPaymentProofFile(file);
      await attachMutation.mutateAsync(fileId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Gagal upload");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <>
    <tr className="border-t text-slate-700">
      <td className="px-4 py-3">
        {new Date(booking.createdAt).toLocaleString("id-ID")}
      </td>
      <td className="px-4 py-3">
        {booking.patient.patientProfile?.fullName ?? booking.patient.email}
      </td>
      <td className="px-4 py-3">
        {booking.therapist.therapistProfile?.fullName ??
          booking.therapist.email}
        <div className="text-xs text-slate-500">
          {booking.therapist.averageRating
            ? `⭐ ${booking.therapist.averageRating.toFixed(1)} (${booking.therapist.reviewCount ?? 0})`
            : "Belum ada rating"}
        </div>
      </td>
      <td className="px-4 py-3">{booking.package.name}</td>
      <td className="px-4 py-3 font-medium">
        <span className="pill bg-slate-100 text-slate-600">
          {booking.status}
        </span>
        {nextSession ? (
          <div className="mt-1 text-xs text-slate-500">
            Sesi #{nextSession.sessionNumber}:{" "}
            {nextSession.scheduledAt
              ? new Date(nextSession.scheduledAt).toLocaleString("id-ID")
              : "Belum dijadwalkan"}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span>{booking.payment?.status ?? "-"}</span>
            {booking.status === "WAITING_ADMIN_VERIFY_PAYMENT" ? (
              <div className="flex gap-2">
                <button
                  className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                  onClick={() => verifyMutation.mutate(true)}
                  disabled={verifyMutation.isPending}
                >
                  Approve
                </button>
                <button
                  className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  onClick={() => verifyMutation.mutate(false)}
                  disabled={verifyMutation.isPending}
                >
                  Reject
                </button>
              </div>
            ) : null}
          </div>
          {booking.payment?.proofFileId ? (
            <span className="text-xs text-slate-500">
              File ID: {booking.payment.proofFileId}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <button
            className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            onClick={handleForceCancel}
            disabled={isTerminal || cancelMutation.isPending}
          >
            Force Cancel
          </button>
          <button
            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            onClick={handleOverrideSchedule}
            disabled={!nextSession || overrideMutation.isPending}
          >
            Override Jadwal
          </button>
          <div>
            <button
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              onClick={handleUploadClick}
              disabled={!canUploadProof || uploading}
            >
              {uploading ? "Mengunggah..." : "Upload Bukti"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <button
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            onClick={() => setShowSessions((prev) => !prev)}
          >
            {showSessions ? "Sembunyikan Catatan" : "Catatan Sesi"}
          </button>
          <button
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            onClick={() => setShowChat((prev) => !prev)}
          >
            {showChat ? "Tutup Chat" : "Lihat Chat"}
          </button>
        </div>
      </td>
    </tr>
    {showSessions ? (
      <tr className="border-t bg-slate-50 text-slate-600">
        <td className="px-4 py-3 text-xs" colSpan={7}>
          <div className="space-y-3">
            {booking.sessions && booking.sessions.length > 0 ? (
              booking.sessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-sm font-semibold text-slate-900">
                    Sesi #{session.sessionNumber} • {session.status}
                  </div>
                  <div className="text-xs text-slate-500">
                    {session.scheduledAt
                      ? new Date(session.scheduledAt).toLocaleString("id-ID")
                      : "Belum dijadwalkan"}
                  </div>
                  {session.note?.content ? (
                    <p className="mt-1 text-sm text-slate-700">
                      Catatan: {session.note.content}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">
                      Belum ada catatan untuk sesi ini.
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Tidak ada sesi terdaftar.</p>
            )}
          </div>
        </td>
      </tr>
    ) : null}
    {showChat ? (
      <tr className="border-t bg-white text-slate-600">
        <td className="px-4 py-3 text-xs" colSpan={7}>
          {chatQuery.isLoading ? (
            <p>Memuat chat...</p>
          ) : chatQuery.isError ? (
            <p className="text-red-500">Gagal memuat chat.</p>
          ) : chatQuery.data && chatQuery.data.length > 0 ? (
            <div className="space-y-3">
              {chatQuery.data.map((msg) => (
                <div key={msg.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">
                    {msg.sender.name} •{" "}
                    {new Date(msg.sentAt).toLocaleString("id-ID")}
                  </div>
                  <p className="text-sm text-slate-800">{msg.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Belum ada pesan.</p>
          )}
        </td>
      </tr>
    ) : null}
    </>
  );
}
