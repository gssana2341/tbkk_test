"use client";

import { useAuth } from "./AuthProvider";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
  redirectPath?: string;
  mode?: "hide" | "redirect";
}

export default function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
  redirectPath = "/",
  mode = "hide",
}: RoleGuardProps) {
  const { user, loading } = useAuth();

  if (loading) return null;

  const userRole = user?.role?.toLowerCase() || "";
  const isAllowed = allowedRoles.some(
    (role) => role.toLowerCase() === userRole
  );

  if (!isAllowed) {
    if (mode === "redirect") {
      redirect(redirectPath);
      return null;
    }
    return fallback;
  }

  return <>{children}</>;
}
