"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";

export default function AvailabilityPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const query = useQuery({
    queryKey: ["therapist-availability", startDate, endDate],
    queryFn: () =>
      adminApi.therapistAvailabilityReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Availability</h1>
            <p className="text-sm text-slate-500">
              Lihat slot kosong dan jadwal terisi tiap terapis pada rentang tanggal.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-slate-500">
              Start Date
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="soft-input ml-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-500">
              End Date
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="soft-input ml-2 text-sm"
              />
            </label>
          </div>
        </div>
      </div>

      {query.isLoading && <p>Memuat laporan...</p>}
      {query.isError && (
        <p className="text-sm text-red-500">Tidak dapat memuat data availability.</p>
      )}

      {query.data && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Terapis</th>
                <th className="px-4 py-3">Slot Tersedia</th>
                <th className="px-4 py-3">Sudah Terjadwal</th>
                <th className="px-4 py-3">Sisa Slot</th>
              </tr>
            </thead>
            <tbody>
              {query.data.rows.map((row) => (
                <tr key={row.therapistId} className="border-t text-slate-700">
                  <td className="px-4 py-3">
                    <div className="font-semibold">
                      {row.therapistName ?? row.therapistEmail}
                    </div>
                    <p className="text-xs text-slate-500">{row.therapistEmail}</p>
                  </td>
                  <td className="px-4 py-3">{row.availabilityCount}</td>
                  <td className="px-4 py-3">{row.scheduledCount}</td>
                  <td className="px-4 py-3">
                    {row.remainingSlots > 0 ? row.remainingSlots : 0}
                  </td>
                </tr>
              ))}
              {query.data.rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    Tidak ada data availability pada rentang ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
