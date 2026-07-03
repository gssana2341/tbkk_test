"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LogOut } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BottomNav() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: () => (
        <Image
          src="/Group 53.png"
          alt="Dashboard"
          width={22}
          height={22}
          style={{ filter: "invert(1) brightness(2)" }}
        />
      ),
    },
    {
      name: "Reports",
      href: "/reports",
      icon: () => <BarChart3 size={22} />,
    },
    {
      name: "Admin",
      href: "/admin",
      icon: () => (
        <Image
          src="/Group 51.png"
          alt="Admin"
          width={22}
          height={22}
          style={{ filter: "invert(1) brightness(2)" }}
        />
      ),
    },
    {
      name: "Settings",
      href: "/settings",
      icon: () => (
        <Image
          src="/Group 52.png"
          alt="Settings"
          width={22}
          height={22}
          style={{ filter: "invert(1) brightness(2)" }}
        />
      ),
    },
    {
      name: "History",
      href: "/history",
      icon: () => (
        <Image
          src="/Vector.png"
          alt="Notification"
          width={22}
          height={22}
          style={{ filter: "invert(1) brightness(2)", height: "auto" }}
        />
      ),
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (item.name === "Admin") {
      const role = user?.role?.toLowerCase();
      return role === "admin" || role === "superadmin";
    }
    if (item.name === "Reports") {
      return user?.role?.toLowerCase() === "superadmin";
    }
    return true;
  });

  // Page 1 contains first 5 items, Page 2 contains any overflows + Logout
  const page1Items = filteredItems.slice(0, 5);
  const page2Items = filteredItems.slice(5);

  const colWidthClass = page1Items.length === 5 ? "w-1/5" : "w-1/4";

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1121] border-t-[1.35px] border-[#374151] h-16 safe-area-bottom overflow-x-auto snap-x snap-mandatory no-scrollbar flex items-stretch scroll-smooth">
        {/* Page 1 (Snaps to start) */}
        <div className="w-full flex-shrink-0 flex items-stretch snap-start snap-always">
          {page1Items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/" && pathname.startsWith("/sensors/")) ||
              (pathname.startsWith(item.href) && item.href !== "/");

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${isActive
                    ? "text-blue-400 bg-blue-900/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  {typeof item.icon === "function"
                    ? item.icon()
                    : React.createElement(item.icon, { size: 22 })}
                </div>
                <span className="text-[10px] font-medium leading-none">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Page 2 (Snaps to start) */}
        <div className="w-full flex-shrink-0 flex items-stretch snap-start snap-always">
          {page2Items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/" && pathname.startsWith("/sensors/")) ||
              (pathname.startsWith(item.href) && item.href !== "/");

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${colWidthClass} flex flex-col items-center justify-center gap-1 transition-colors ${isActive
                    ? "text-blue-400 bg-blue-900/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  {typeof item.icon === "function"
                    ? item.icon()
                    : React.createElement(item.icon, { size: 22 })}
                </div>
                <span className="text-[10px] font-medium leading-none">
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* Logout */}
          <button
            onClick={() => setLogoutDialogOpen(true)}
            className={`${colWidthClass} flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white hover:bg-white/5 transition-colors`}
          >
            <LogOut size={22} className="text-red-400" />
            <span className="text-[10px] font-medium leading-none text-red-400">Logout</span>
          </button>

          {/* Symmetrical Spacers to keep items aligned properly to the left */}
          {Array.from({ length: Math.max(0, page1Items.length - 1 - page2Items.length) }).map((_, idx) => (
            <div key={`spacer-${idx}`} className={`${colWidthClass} flex-shrink-0`} />
          ))}
        </div>
      </nav>

      {/* Confirm Logout Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="bg-[#0B1121] border border-[#374151] text-white w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-400" />
              Confirm Logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#374151] border-0 text-white hover:bg-[#4B5563]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
