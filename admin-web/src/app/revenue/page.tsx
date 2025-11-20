"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function RevenuePage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const query = useQuery({
    queryKey: ["therapist-revenue", startDate, endDate],
    queryFn: () =>
      adminApi.therapistRevenueReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Revenue</h1>
            <p className="text-sm text-slate-500">
              Monitor pendapatan per terapis beserta bagi hasil platform.
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
        <p className="text-sm text-red-500">
          Tidak dapat memuat laporan sekarang.
        </p>
      )}

      {query.data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Total Revenue"
              value={currency(query.data.totals.totalRevenue)}
            />
            <SummaryCard
              title="Bagian Terapis"
              value={currency(query.data.totals.totalTherapistShare)}
            />
            <SummaryCard
              title="Bagian Platform"
              value={currency(query.data.totals.totalPlatformFee)}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Terapis</th>
                  <th className="px-4 py-3">Total Revenue</th>
                  <th className="px-4 py-3">Terapis</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Booking</th>
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((row) => (
                  <tr key={row.therapistId} className="border-t text-slate-700">
                    <td className="px-4 py-3">
                      <div className="font-semibold">
                        {row.therapistName ?? row.therapistEmail}
                      </div>
                      <p className="text-xs text-slate-500">
                        {row.therapistEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3">{currency(row.totalRevenue)}</td>
                    <td className="px-4 py-3">{currency(row.therapistShare)}</td>
                    <td className="px-4 py-3">{currency(row.platformFee)}</td>
                    <td className="px-4 py-3">{row.bookingCount}</td>
                  </tr>
                ))}
                {query.data.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                      Tidak ada data pada rentang tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
