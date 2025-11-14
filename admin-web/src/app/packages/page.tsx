"use client";

import { adminApi } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

export default function PackagesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["packages"],
    queryFn: adminApi.listPackages,
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    sessionCount: 1,
    price: 0,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createPackage({
        name: form.name,
        description: form.description,
        sessionCount: form.sessionCount,
        price: form.price,
      }),
    onSuccess: () => {
      setForm({ name: "", description: "", sessionCount: 1, price: 0 });
      void queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.togglePackage(id, isActive),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["packages"] }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">Packages</h1>
        <p className="text-sm text-slate-500">
          Kelola paket terapi yang tersedia untuk pasien.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow"
      >
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            <span className="text-slate-600">Nama Paket</span>
            <input
              className="mt-1 w-full soft-input text-sm"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="text-slate-600">Jumlah Sesi</span>
            <input
              type="number"
              min={1}
              className="mt-1 w-full soft-input text-sm"
              value={form.sessionCount}
              onChange={(e) => setForm((prev) => ({ ...prev, sessionCount: Number(e.target.value) }))}
            />
          </label>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            <span className="text-slate-600">Harga (IDR)</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full soft-input text-sm"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="text-slate-600">Deskripsi</span>
            <input
              className="mt-1 w-full soft-input text-sm"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>
        </div>
        <button
          type="submit"
          className="inline-flex w-fit items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Menyimpan..." : "Tambah Paket"}
        </button>
      </form>

      {isLoading && <p>Loading packages...</p>}
      {isError && <p className="text-red-500">Gagal memuat paket.</p>}

      {data && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Harga</th>
                <th className="px-4 py-3">Sesi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((pkg) => (
                <tr key={pkg.id} className="border-t text-slate-700">
                  <td className="px-4 py-3">
                    <div className="font-medium">{pkg.name}</div>
                    <p className="text-xs text-slate-500">{pkg.description ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(pkg.price)}
                  </td>
                  <td className="px-4 py-3">{pkg.sessionCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        pkg.isActive
                          ? "rounded-full bg-green-100 px-2 py-1 text-xs text-green-800"
                          : "rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-600"
                      }
                    >
                      {pkg.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                      onClick={() =>
                        toggleMutation.mutate({ id: pkg.id, isActive: !pkg.isActive })
                      }
                      disabled={toggleMutation.isPending}
                    >
                      {pkg.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
