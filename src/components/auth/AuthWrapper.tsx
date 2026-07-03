"use client";
import React, { createContext, useContext } from "react";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import ProtectedRoute from "./ProtectedRoute";
import Header from "@/components/layout/Header";
import FolderTree from "@/components/layout/FolderTree";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import MobileDrawer from "@/components/layout/MobileDrawer";
import { ChevronRight, ShieldAlert } from "lucide-react";
import {
  FolderTreeProvider,
  useFolderTree,
} from "@/components/layout/FolderTreeContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

type RoutePermission = {
  path: string;
  pageName: string;
  allowedRoles: string[];
  requiredRoleLabel: string;
};

const ROUTE_PERMISSIONS: RoutePermission[] = [
  {
    path: "/reports",
    pageName: "Reports",
    allowedRoles: ["superadmin"],
    requiredRoleLabel: "Superadmin",
  },
  {
    path: "/admin",
    pageName: "User administration",
    allowedRoles: ["admin", "superadmin"],
    requiredRoleLabel: "Admin or Superadmin",
  },
  {
    path: "/register",
    pageName: "Sensor registration",
    allowedRoles: ["admin", "editor", "superadmin"],
    requiredRoleLabel: "Editor, Admin, or Superadmin",
  },
];

function findRoutePermission(href: string) {
  const destinationPath = href.split(/[?#]/)[0];
  return ROUTE_PERMISSIONS.find(
    (permission) =>
      destinationPath === permission.path ||
      destinationPath.startsWith(`${permission.path}/`)
  );
}

function AuthWrapperContent({ children }: AuthWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showCancelPopup, setShowCancelPopup] = React.useState(false);
  const [targetPath, setTargetPath] = React.useState<string | null>(null);
  const [prevPath, setPrevPath] = React.useState<string>("/");
  const [deniedAccess, setDeniedAccess] =
    React.useState<RoutePermission | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // State for selected ids and sensors (for filter)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedSensors, setSelectedSensors] = React.useState<Sensor[]>([]);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const { loading, user } = useAuth();
  const { collapsed, setCollapsed } = useFolderTree();

  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== "A") {
        target = target.parentElement;
      }

      if (!target || !(target instanceof HTMLAnchorElement)) return;

      const href = target.getAttribute("href");
      if (!href) return;

      if (
        !href.startsWith("/") ||
        href.startsWith("//") ||
        target.getAttribute("target") === "_blank" ||
        target.getAttribute("download") !== null
      ) {
        return;
      }

      const permission = findRoutePermission(href);
      const userRole = user?.role?.toLowerCase() ?? "";

      if (permission && !permission.allowedRoles.includes(userRole)) {
        e.preventDefault();
        e.stopPropagation();

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        setShowCancelPopup(false);
        setTargetPath(null);
        setDeniedAccess(permission);
        return;
      }

      const currentPath = window.location.pathname;
      if (href === currentPath || href.startsWith("#") || href.includes("#")) {
        return;
      }

      setPrevPath(currentPath);
      setTargetPath(href);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setShowCancelPopup(true);
      }, 400);
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleGlobalClick, {
        capture: true,
      });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user?.role]);

  React.useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setShowCancelPopup(false);
    setTargetPath(null);
  }, [pathname]);

  const handleCancelNavigation = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setShowCancelPopup(false);
    setTargetPath(null);
    router.push(prevPath);
  };

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
      <div className="min-h-screen flex items-center justify-center bg-[#0B1121]">
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
          className={`flex bg-[#0B1121] ${
            isRegisterPage ? "min-h-screen" : "h-screen overflow-hidden"
          }`}
        >
          {/* Left Sidebar - Desktop only */}
          <div className="hidden md:block shrink-0">
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
              className={`flex flex-1 relative ${
                isRegisterPage ? "" : "overflow-hidden"
              }`}
            >
              {/* Left Panel - Organization Tree */}
              <div
                className={`absolute md:relative top-0 left-0 h-full z-40 shrink-0 bg-[#0B1121] transition-all duration-300 overflow-hidden ${
                  collapsed
                    ? "w-0 border-r-0"
                    : `border-r-[1.35px] border-[#374151] w-64 ${
                        isRegisterPage
                          ? "sticky top-0 h-screen overflow-y-auto"
                          : "overflow-hidden"
                      } shadow-2xl md:shadow-none`
                }`}
              >
                <FolderTree
                  onFilterChange={handleFilterChange}
                  onClose={() => setCollapsed(true)}
                />
              </div>

              {/* Mobile Backdrop Overlay */}
              {!collapsed && (
                <div
                  className="md:hidden fixed inset-0 z-30 bg-black/60 transition-opacity duration-300"
                  onClick={() => setCollapsed(true)}
                />
              )}

              {/* Floating Toggle Button */}
              {pathname === "/" && (
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="flex absolute top-1/2 -translate-y-1/2 z-50 items-center justify-center w-[26px] h-[68px] bg-[#1e293b] hover:bg-[#334155] border border-y-[#475569] border-r-[#475569] border-l-0 text-gray-300 rounded-r-md cursor-pointer transition-all duration-300 shadow-[2px_0_8px_rgba(0,0,0,0.3)] hover:text-white"
                  style={{ left: collapsed ? "0px" : "16rem" }}
                >
                  {collapsed ? (
                    <ChevronRight size={18} />
                  ) : (
                    <ChevronRight size={18} className="rotate-180" />
                  )}
                </button>
              )}

              {/* Right Panel - Main Content Area */}
              <div
                className={`flex-1 bg-[#0B1121] p-4 ${
                  isRegisterPage ? "" : "overflow-auto"
                } pb-20 md:pb-4`}
              >
                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <BottomNav />

        <AlertDialog
          open={deniedAccess !== null}
          onOpenChange={(open) => {
            if (!open) setDeniedAccess(null);
          }}
        >
          <AlertDialogContent
            data-testid="permission-denied-dialog"
            className="w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-[#374151] bg-[#0B1121] text-white"
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </span>
                Access restricted
              </AlertDialogTitle>
              <AlertDialogDescription className="pt-2 leading-6 text-slate-400">
                Your current role
                {user?.role ? ` (${user.role})` : ""} cannot access{" "}
                <span className="font-semibold text-slate-200">
                  {deniedAccess?.pageName}
                </span>
                . Required role: {deniedAccess?.requiredRoleLabel}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => setDeniedAccess(null)}
                className="bg-blue-600 text-white hover:bg-blue-500"
              >
                Understood
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Global Slow-Navigation Loading & Cancel Popup */}
        {showCancelPopup && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-md transition-all duration-300 animate-in fade-in">
            <div className="relative p-6 sm:p-8 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl max-w-sm w-[90%] mx-auto text-center space-y-6 transform scale-100 animate-in zoom-in-95 duration-200">
              {/* Spinner */}
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
                <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Loading requested page...
                </h3>
                <p className="text-xs text-slate-400">
                  Data from{" "}
                  <span className="text-blue-400 font-semibold uppercase">
                    {targetPath?.replace("/", "") || "the next section"}
                  </span>{" "}
                  is taking a bit longer to load.
                </p>
              </div>

              {/* Cancel Button */}
              <button
                onClick={handleCancelNavigation}
                className="w-full py-2.5 px-4 text-xs font-bold text-rose-300 bg-rose-950/20 border border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 rounded-xl transition-all duration-200 active:scale-98 flex items-center justify-center gap-1.5 hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] cursor-pointer"
              >
                Cancel navigation
              </button>
            </div>
          </div>
        )}
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
