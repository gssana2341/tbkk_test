"use client";
import React, { createContext, useContext } from "react";

import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import ProtectedRoute from "./ProtectedRoute";
import Header from "@/components/layout/Header";
import FolderTree from "@/components/layout/FolderTree";
import Sidebar from "@/components/layout/Sidebar";
import {
  FolderTreeProvider,
  useFolderTree,
} from "@/components/layout/FolderTreeContext";

interface AuthWrapperProps {
  children: React.ReactNode;
}

// Context for FolderTree filter state
import type { Sensor } from "@/lib/types";
interface FolderTreeFilterContextType {
  selectedIds: string[];
  selectedSensors: Sensor[];
}
const FolderTreeFilterContext = createContext<FolderTreeFilterContextType>({
  selectedIds: [],
  selectedSensors: [],
});
export function useFolderTreeFilter() {
  return useContext(FolderTreeFilterContext);
}

function AuthWrapperContent({ children }: AuthWrapperProps) {
  // State for selected ids and sensors (for filter)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedSensors, setSelectedSensors] = React.useState<Sensor[]>([]);
  const pathname = usePathname();
  const { loading } = useAuth();
  const { collapsed } = useFolderTree();

  // Handler to receive filter changes from FolderTree
  // MUST be defined before early returns to satisfy Rules of Hooks
  const handleFilterChange = React.useCallback(
    (ids: string[], sensors: Sensor[]) => {
      setSelectedIds(ids);
      setSelectedSensors(sensors);
      // You can add more logic here to control card view visibility, etc.
    },
    []
  );

  // Check if current path is an auth page
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/auth/register" ||
    pathname === "/organizeregister" ||
    pathname === "/forgot-password";

  // Check if current path is register page (for custom scrolling)
  const isRegisterPage = pathname === "/register";

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030616]">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-white">Loading...</span>
        </div>
      </div>
    );
  }

  // For auth pages, render without protection and without layout
  if (isAuthPage) {
    return <>{children}</>;
  }

  // For all other pages, use protection and show layout with Sidebar, FolderTree, Header

  return (
    <FolderTreeFilterContext.Provider value={{ selectedIds, selectedSensors }}>
      <ProtectedRoute>
        <div
          className={`flex bg-[#030616] ${
            isRegisterPage ? "min-h-screen" : "h-screen overflow-hidden"
          }`}
        >
          {/* Left Sidebar - Navigation Menu (not covered by header) */}
          <div className="shrink-0">
            <Sidebar />
          </div>

          {/* Right side with Header on top */}
          <div
            className={`flex-1 flex flex-col ${
              isRegisterPage ? "" : "overflow-hidden"
            }`}
          >
            {/* Header at the top */}
            <Header />

            {/* Content area below header */}
            <div
              className={`flex flex-1 ${
                isRegisterPage ? "" : "overflow-hidden"
              }`}
            >
              {/* Left Panel - Organization Tree - Width adjusts based on collapsed state */}
              <div
                className={`shrink-0 bg-[#030616] border-r-[1.35px] border-[#374151] flex flex-col transition-all duration-300 ${
                  isRegisterPage
                    ? "sticky top-0 h-screen overflow-y-auto"
                    : "overflow-hidden"
                } ${collapsed ? "w-[52px]" : "w-64"}`}
              >
                <FolderTree onFilterChange={handleFilterChange} />
              </div>

              {/* Right Panel - Main Content Area */}
              <div
                className={`flex-1 bg-[#030616] p-4 ${
                  isRegisterPage ? "" : "overflow-auto"
                }`}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    </FolderTreeFilterContext.Provider>
  );
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <FolderTreeProvider>
      <AuthWrapperContent>{children}</AuthWrapperContent>
    </FolderTreeProvider>
  );
}
