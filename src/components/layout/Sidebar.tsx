"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import Image from "next/image";
import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFolderTree } from "@/components/layout/FolderTreeContext";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();
  const { setCollapsed: setFolderTreeCollapsed } = useFolderTree();

  // Auto-close both sidebars on any navigation
  React.useEffect(() => {
    setCollapsed(true);
    setFolderTreeCollapsed(true);
  }, [pathname, setFolderTreeCollapsed]);

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: () => (
        <Image
          src="/Group 53.png"
          alt="Dashboard"
          width={20}
          height={20}
          style={{ filter: "invert(1) brightness(2)" }}
        />
      ),
    },
    {
      name: "Admin",
      href: "/admin",
      icon: () => (
        <Image
          src="/Group 51.png"
          alt="Admin"
          width={20}
          height={20}
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
          width={20}
          height={20}
          style={{ filter: "invert(1) brightness(2)" }}
        />
      ),
    },
    {
      name: "History Notification",
      href: "/history",
      icon: () => (
        <Image
          src="/Vector.png"
          alt="Notification"
          width={20}
          height={20}
          style={{ filter: "invert(1) brightness(2)", height: "auto" }}
        />
      ),
    },
  ];

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } bg-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out h-full flex flex-col`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <h1 className="text-xl font-bold text-white">TBKK-Surazense</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-gray-700 text-white"
        >
          {collapsed ? (
            <Menu size={20} />
          ) : (
            <Image
              src="/Group 639.png"
              alt="close"
              width={20}
              height={20}
              style={{ filter: "invert(1) brightness(2)" }}
            />
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          // Check if the current path matches the nav item's href exactly
          // or if it's a subpath (for sensor detail pages)
          const isActive =
            pathname === item.href ||
            (item.href === "/" && pathname.startsWith("/sensors/")) ||
            (pathname.startsWith(item.href) && item.href !== "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => {
                setFolderTreeCollapsed(true);
                setCollapsed(true);
              }}
              className={`flex items-center transition-colors ${
                isActive
                  ? "bg-blue-900 text-blue-200"
                  : "hover:bg-gray-700 text-gray-200"
              }`}
              style={{
                height: 40,
                width: collapsed ? 40 : undefined,
                borderRadius: 12,
                margin: collapsed ? "0 auto 8px auto" : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                paddingLeft: collapsed ? 0 : 12,
                paddingRight: collapsed ? 0 : 12,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  marginRight: !collapsed ? 8 : 0,
                }}
              >
                {typeof item.icon === "function"
                  ? item.icon()
                  : React.createElement(item.icon, { size: 24 })}
              </div>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700 mt-auto">
        {!collapsed && (
          <div className="space-y-2">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 text-gray-200 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
            <div className="text-sm text-gray-400 text-center">v1.0.0</div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <button
              onClick={logout}
              className="p-2 text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
