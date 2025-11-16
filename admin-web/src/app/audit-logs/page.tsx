"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi, type AuditLogEntry } from "@/lib/api";

export default function AuditLogsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => adminApi.auditLogs({ page: 1, limit: 25 }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">
          Catat semua aksi penting admin untuk referensi cepat.
        </p>
      </div>

      {isLoading && <p>Memuat audit log...</p>}
      {isError && <p className="text-red-500">Gagal memuat audit log.</p>}

      {data && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Pelaku</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((log) => (
                <tr key={log.id} className="border-t text-slate-700">
                  <td className="px-4 py-3">
                    {new Date(log.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3">
                    {log.actor?.email ?? log.actor?.id ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {log.targetType} • {log.targetId}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {renderMetadata(log)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Total {data.meta.total} log ditampilkan (halaman {data.meta.page} / {data.meta.totalPages})
          </div>
        </div>
      )}
    </div>
  );
}

function renderMetadata(log: AuditLogEntry) {
  if (!log.metadata || typeof log.metadata !== "object") {
    return "-";
  }
  try {
    return JSON.stringify(log.metadata);
  } catch (error) {
    return "-";
  }
}
