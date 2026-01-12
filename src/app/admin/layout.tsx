"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["admin"]} mode="redirect" redirectPath="/">
      {children}
    </RoleGuard>
  );
}
