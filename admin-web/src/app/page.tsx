"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Card } from "@/components/ui/card";

export default function SummaryPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["summary"],
    queryFn: adminApi.summary,
  });

  if (isLoading) {
    return <div>Loading summary...</div>;
  }

  if (isError || !data) {
    return <div className="text-red-500">Unable to load summary data.</div>;
  }

  const statusEntries = Object.entries(data.bookingStatusCounts);

  return (
    <div className="space-y-8">
      <div className="glass-card border-0 bg-white px-6 py-5 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Snapshot terbaru operasional booking dan pembayaran.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Total Revenue"
          value={new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(Number(data.totalRevenue))}
        />
        <Card title="Terapis Aktif" value={data.activeTherapists} />
        <Card
          title="Menunggu Verifikasi"
          value={data.pendingPayments}
          description="Booking butuh tindakan admin"
        />
        <Card
          title="Status Tercatat"
          value={statusEntries.length}
          description="Status booking unik"
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">
          Booking Status Breakdown
        </h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {statusEntries.map(([status, count]) => (
                <tr key={status} className="border-t text-slate-700">
                  <td className="px-4 py-3 font-medium">{status}</td>
                  <td className="px-4 py-3">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
