"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/store/auth";

export function AuthBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!token && !isLoginPage) {
      router.replace("/login");
    }
    if (token && isLoginPage) {
      router.replace("/");
    }
  }, [token, isLoginPage, router]);

  if (!token && !isLoginPage) {
    return <div className="p-6 text-sm text-slate-500">Mengalihkan ke halaman login...</div>;
  }

  return <>{children}</>;
}
