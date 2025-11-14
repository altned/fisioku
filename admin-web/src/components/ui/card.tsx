import { ReactNode } from "react";

export function Card({
  title,
  value,
  description,
}: {
  title: string;
  value: ReactNode;
  description?: string;
}) {
  return (
    <div className="glass-card relative overflow-hidden p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
        {title}
      </div>
      <div className="mt-4 text-3xl font-semibold text-slate-900">{value}</div>
      {description ? (
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
