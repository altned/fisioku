"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";

export default function ReviewsPage() {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const query = useQuery({
    queryKey: ["reviews", search, ratingFilter],
    queryFn: () =>
      adminApi.reviews({
        search: search || undefined,
        minRating: ratingFilter ? Number(ratingFilter) : undefined,
      }),
  });

  const summary = useMemo(() => {
    if (!query.data) return null;
    const ratingSum = query.data.summary.reduce(
      (acc, item) => acc + item.averageRating * item.reviewCount,
      0,
    );
    const totalReview = query.data.summary.reduce(
      (acc, item) => acc + item.reviewCount,
      0,
    );
    const average = totalReview ? ratingSum / totalReview : 0;
    return {
      average,
      totalReview,
      totalTherapist: query.data.summary.length,
    };
  }, [query.data]);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Reviews</h1>
            <p className="text-sm text-slate-500">
              Pantau kualitas pelayanan terapis dari umpan balik pasien.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama terapis/pasien"
              className="soft-input text-sm"
            />
            <select
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
              className="soft-input text-sm"
            >
              <option value="">Semua rating</option>
              <option value="3">Rating ≥ 3</option>
              <option value="4">Rating ≥ 4</option>
              <option value="5">Rating 5</option>
            </select>
          </div>
        </div>
      </div>

      {query.isLoading && <p>Memuat review...</p>}
      {query.isError && <p className="text-red-500">Gagal memuat review.</p>}

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Rating Rata-rata"
            value={summary.average.toFixed(2)}
            description="Tertimbang dari semua ulasan"
          />
          <SummaryCard
            title="Total Review"
            value={summary.totalReview.toLocaleString("id-ID")}
            description={`${summary.totalTherapist} terapis dinilai`}
          />
          <SummaryCard
            title="Terapis Top"
            value={query.data?.summary?.[0]?.therapistName ?? "-"}
            description={`Rating ${
              query.data?.summary?.[0]?.averageRating?.toFixed(2) ?? "-"
            } • ${query.data?.summary?.[0]?.reviewCount ?? 0} review`}
          />
        </div>
      )}

      {query.data && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white shadow">
            <div className="border-b px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Peringkat Terapis
              </h2>
              <p className="text-xs text-slate-500">
                Top performer berdasar rating terbaru.
              </p>
            </div>
            <ul className="divide-y">
              {query.data.summary.map((item) => (
                <li key={item.therapistId} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.therapistName ?? item.therapistEmail}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.reviewCount} review
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900">
                      {item.averageRating.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">/ 5</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white shadow">
            <div className="border-b px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Ulasan Terbaru
              </h2>
            </div>
            <div className="divide-y">
              {query.data.reviews.map((review) => (
                <div key={review.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {review.therapistName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Pasien: {review.patientName}
                      </p>
                    </div>
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                      {review.rating} / 5
                    </span>
                  </div>
                  {review.comment ? (
                    <p className="mt-2 text-sm text-slate-600">"{review.comment}"</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">
                      Tidak ada komentar tambahan.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(review.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
              {query.data.reviews.length === 0 && (
                <p className="px-5 py-6 text-sm text-slate-500">
                  Belum ada review.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {description ? (
        <p className="text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
