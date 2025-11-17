"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { useState } from "react";

const roles = ["PATIENT", "THERAPIST", "ADMIN"];
const statuses = ["ACTIVE", "INACTIVE"];

export default function UsersPage() {
  const [role, setRole] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["users", role, status, search],
    queryFn: () =>
      adminApi.users({
        role: role || undefined,
        status: status || undefined,
        search: search || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
            <p className="text-sm text-slate-500">
              Kelola akun pasien, terapis, dan admin.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 ml-auto">
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="soft-input text-sm"
            >
              <option value="">Semua Role</option>
              {roles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="soft-input text-sm"
            >
              <option value="">Semua Status</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari email/nama"
              className="soft-input text-sm"
            />
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <p>Memuat data...</p>
      ) : query.isError ? (
        <p className="text-red-500">Tidak dapat memuat data.</p>
      ) : query.data ? (
        <UsersTable data={query.data.data} meta={query.data.meta} />
      ) : null}
    </div>
  );
}

type UsersTableProps = Awaited<ReturnType<typeof adminApi.users>>;

function UsersTable({ data, meta }: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Nama</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </tbody>
      </table>
      <div className="border-t bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Total {meta.total} user, halaman {meta.page} / {meta.totalPages}
      </div>
    </div>
  );
}

type UserRowProps = UsersTableProps["data"][number];

function UserRow({ user }: { user: UserRowProps }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: string) => adminApi.updateUserStatus(user.id, status),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const fullName =
    user.patientProfile?.fullName ??
    user.therapistProfile?.fullName ??
    "Belum diisi";

  const toggleStatus = () => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    mutation.mutate(nextStatus);
  };

  return (
    <tr className="border-t text-slate-700">
      <td className="px-4 py-3">{user.email}</td>
      <td className="px-4 py-3">{fullName}</td>
      <td className="px-4 py-3">{user.role}</td>
      <td className="px-4 py-3">
        <span
          className={
            user.status === "ACTIVE"
              ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
              : "rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          }
        >
          {user.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          onClick={toggleStatus}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Memproses..." : "Toggle Status"}
        </button>
      </td>
    </tr>
  );
}
