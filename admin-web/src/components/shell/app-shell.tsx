"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useAuthStore } from "@/store/auth";

const navItems = [
  { href: "/", label: "Summary" },
  { href: "/bookings", label: "Bookings" },
  { href: "/packages", label: "Packages" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Fisioku
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              Admin Dashboard
            </h1>
          </div>
          <nav className="flex items-center gap-3 text-sm font-medium">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-1.5 transition hover:text-slate-900 ${
                    isActive
                      ? "bg-slate-900 text-white shadow"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="rounded-full px-4 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
