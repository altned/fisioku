"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { useState } from "react";

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

  const verifyMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      adminApi.verifyPayment(id, approved),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

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
              </tr>
            </thead>
            <tbody>
              {data.data.map((booking) => (
                <tr key={booking.id} className="border-t text-slate-700">
                  <td className="px-4 py-3">
                    {new Date(booking.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    {booking.patient.patientProfile?.fullName ?? booking.patient.email}
                  </td>
                  <td className="px-4 py-3">
                    {booking.therapist.therapistProfile?.fullName ?? booking.therapist.email}
                  </td>
                  <td className="px-4 py-3">{booking.package.name}</td>
                  <td className="px-4 py-3 font-medium">
                    <span className="pill bg-slate-100 text-slate-600">
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{booking.payment?.status ?? "-"}</span>
                      {booking.status === "WAITING_ADMIN_VERIFY_PAYMENT" ? (
                        <div className="flex gap-2">
                          <button
                            className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                            onClick={() =>
                              verifyMutation.mutate({ id: booking.id, approved: true })
                            }
                            disabled={verifyMutation.isPending}
                          >
                            Approve
                          </button>
                          <button
                            className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                            onClick={() =>
                              verifyMutation.mutate({ id: booking.id, approved: false })
                            }
                            disabled={verifyMutation.isPending}
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
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
