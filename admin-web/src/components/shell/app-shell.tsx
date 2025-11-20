"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth";

const navItems = [
  { href: "/", label: "Summary" },
  { href: "/bookings", label: "Bookings" },
  { href: "/packages", label: "Packages" },
  { href: "/revenue", label: "Revenue" },
  { href: "/availability", label: "Availability" },
  { href: "/reviews", label: "Reviews" },
  { href: "/users", label: "Users" },
  { href: "/audit-logs", label: "Audit Logs" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? "w-16" : "w-56";

  const navLinks = useMemo(
    () =>
      navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const label = collapsed ? item.label.charAt(0) : item.label;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
              isActive
                ? "bg-slate-900 text-blue-200"
                : "text-slate-400 hover:bg-slate-800/30 hover:text-blue-200"
            }`}
            title={collapsed ? item.label : undefined}
          >
            {label}
          </Link>
        );
      }),
    [collapsed, pathname],
  );

  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={`hidden border-r border-slate-200 bg-slate-950 text-white md:flex ${sidebarWidth} flex-col transition-all duration-200`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          {!collapsed && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Fisioku
              </p>
              <h1 className="text-lg font-semibold text-white">
                Admin Dashboard
              </h1>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-full border border-slate-700 p-2 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-blue-200"
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-2 px-3 py-4">{navLinks}</nav>
        <div className="px-3 pb-6">
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="w-full rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 hover:text-blue-200"
          >
            Logout
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-4 md:hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Fisioku
              </p>
              <h1 className="text-lg font-semibold text-slate-900">
                Admin Dashboard
              </h1>
            </div>
            <button
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 px-6 py-10">{children}</main>
      </div>
    </div>
  );
}
