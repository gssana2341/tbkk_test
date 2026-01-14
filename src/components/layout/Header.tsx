"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Settings, ChevronDown } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserProfile } from "@/api/users/users";
import { getSensors } from "@/lib/data/sensors";
import type { Sensor } from "@/lib/types";

import {
  getVibrationLevelFromConfig,
  SensorConfig,
} from "@/lib/utils/vibrationUtils";

// Helper function to get page title from pathname
function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/sensors/")) return "Sensor Detail";
  if (pathname.startsWith("/sensors")) return "Sensors";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/analytics") return "Analytics";
  if (pathname === "/alerts") return "Alerts";
  if (pathname === "/admin") return "Admin";
  if (pathname === "/history") return "Notification History";
  return "Dashboard";
}

interface NotificationItem {
  id: string;
  sensorName: string;
  status: "CRITICAL" | "WARNING" | "CONCERN" | "NORMAL";
  statusClass: string;
  area: string;
  machine: string;
  rmsH: string;
  rmsV: string;
  rmsA: string;
  temp: string;
  datetime: string;
}

export default function Header() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastCleared, setLastCleared] = useState<Date | null>(null);

  // Load last cleared timestamp on mount
  useEffect(() => {
    const stored = localStorage.getItem("notificationLastCleared");
    if (stored) {
      setLastCleared(new Date(stored));
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    // Get latest ignored timestamp from state or local storage logic
    // We use the state 'lastCleared' which is updated on mount and on clear.
    // However, inside useCallback, we need to be careful about stale closures if we use state.
    // Reading from localStorage directly inside the async function is safer for immediate consistency without tight deps.
    const storedDate = localStorage.getItem("notificationLastCleared");
    const ignoreBefore = storedDate ? new Date(storedDate) : null;

    try {
      const { sensors } = await getSensors({ limit: 10000 });

      // Transform and filter simultaneously based on RECALCULATED status
      const notificationItems: NotificationItem[] = [];

      sensors.forEach((sensor: Sensor) => {
        // 1. Recalculate true status using helper (fixes 0 threshold issue)
        const hVal = sensor.last_data?.velo_rms_h || 0;
        const vVal = sensor.last_data?.velo_rms_v || 0;
        const aVal = sensor.last_data?.velo_rms_a || 0;

        // Cast to SensorConfig
        const config = sensor as unknown as SensorConfig;

        const hStatus = getVibrationLevelFromConfig(hVal, config);
        const vStatus = getVibrationLevelFromConfig(vVal, config);
        const aStatus = getVibrationLevelFromConfig(aVal, config);

        // Determine worst status among axes
        let calculatedStatus: "CRITICAL" | "WARNING" | "CONCERN" | "NORMAL" =
          "NORMAL";
        const statuses = [hStatus, vStatus, aStatus];

        if (statuses.includes("critical")) {
          calculatedStatus = "CRITICAL";
        } else if (statuses.includes("concern")) {
          calculatedStatus = "CONCERN";
        } else if (statuses.includes("warning")) {
          calculatedStatus = "WARNING";
        }

        // 2. Only add if status is WARNING or CRITICAL (ignore Normal)
        if (calculatedStatus !== "NORMAL") {
          // Check if notification is older than lastCleared
          if (sensor.last_data?.datetime) {
            const notifDate = new Date(sensor.last_data.datetime);
            if (ignoreBefore && notifDate <= ignoreBefore) {
              return; // Skip this notification
            }
          }

          const datetime = sensor.last_data?.datetime
            ? new Date(sensor.last_data.datetime)
              .toLocaleString("en-GB", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              .replace(",", "")
            : "-";

          let statusClass = "";
          switch (calculatedStatus) {
            case "CRITICAL":
              statusClass = "bg-[#ff2b05] text-black";
              break;
            case "CONCERN":
              statusClass = "bg-[#ff9900] text-black";
              break;
            case "WARNING":
              statusClass = "bg-[#ffff00] text-black";
              break;
          }
          notificationItems.push({
            id: sensor.id,
            sensorName: sensor.serialNumber || sensor.name,
            status: calculatedStatus,
            statusClass,
            area: sensor.installation_point || "-",
            machine: sensor.machine_number || "-",
            rmsH: sensor.last_data?.velo_rms_h?.toFixed(2) || "0.00",
            rmsV: sensor.last_data?.velo_rms_v?.toFixed(2) || "0.00",
            rmsA: sensor.last_data?.velo_rms_a?.toFixed(2) || "0.00",
            temp: sensor.last_data?.temperature?.toFixed(1) || "0.0",
            datetime,
          });
        }
      });

      setNotifications(notificationItems);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user profile to get avatar URL
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (user) {
          const response = await getUserProfile();
          if (response.user?.avatar_url) {
            setAvatarUrl(response.user.avatar_url);
          } else if (user.avatar_url) {
            // Fallback to user object avatar_url if available
            setAvatarUrl(user.avatar_url);
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Token expired or invalid, logout user
          logout();
          return;
        }
        console.error("Error fetching user profile:", error);
        // Fallback to user object avatar_url if API fails
        if (user?.avatar_url) {
          setAvatarUrl(user.avatar_url);
        }
      }
    };

    fetchUserProfile();
  }, [user, logout]);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh notifications every 60 seconds
  useEffect(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }

    autoRefreshIntervalRef.current = setInterval(() => {
      fetchNotifications();
    }, 60000); // 60 seconds

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [fetchNotifications]);

  const handleClearAll = () => {
    const now = new Date();
    localStorage.setItem("notificationLastCleared", now.toISOString());
    setLastCleared(now);
    setNotifications([]); // Visually clear immediately
    // Ideally we re-fetch to ensure consistency, but clearing list is enough for perceived speed
    // fetchNotifications();
  };

  return (
    <header className="bg-[#0B1121] border-b-[1.35px] border-[#374151] py-3 px-6 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center gap-3">
          <span className="text-lg 2xl:text-2xl font-medium text-white">
            TBKK-Surazense
          </span>
          <span className="text-gray-400 2xl:text-xl">/</span>
          <span className="text-gray-300 text-sm 2xl:text-lg">{pageTitle}</span>
          {user?.role && (
            <Badge className="bg-[#4c1d95] hover:bg-[#4c1d95] text-[#ddd6fe] border-[#5b21b6] rounded-full px-3 py-0.5 text-xs 2xl:text-base font-semibold capitalize">
              {user.role}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white hover:bg-gray-700"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
                  >
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#0B1121] text-white w-[380px] shadow-2xl border-[1.35px] border-[#374151] p-0 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#374151]">
                <div>
                  <p className="text-sm text-gray-400">Notifications</p>
                  <p className="text-lg font-semibold text-white">
                    {notifications.length} Notifications
                  </p>
                </div>
                <button
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-blue-400 hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-700">
                {loading ? (
                  <div className="px-5 py-8 text-center text-gray-500 text-sm">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-400 text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((item: NotificationItem) => (
                    <div
                      key={item.id}
                      className="relative px-5 py-4 cursor-default hover:bg-[#374151] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">
                            Sensor: {item.sensorName}
                          </p>
                          <p className="text-xs text-gray-400">
                            Area: {item.area} • Machine: {item.machine}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-0.5 text-xs font-semibold rounded-full mr-8 ${item.statusClass}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-400">
                        <span className="flex justify-between">
                          RMS H (mm/s)
                          <strong className="text-white">{item.rmsH}</strong>
                        </span>
                        <span className="flex justify-between">
                          RMS V (mm/s)
                          <strong className="text-white">{item.rmsV}</strong>
                        </span>
                        <span className="flex justify-between">
                          RMS A (mm/s)
                          <strong className="text-white">{item.rmsA}</strong>
                        </span>
                        <span className="flex justify-between">
                          Temp (°C)
                          <strong className="text-white">{item.temp}</strong>
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                        <span>Date &amp; Time</span>
                        <span className="font-semibold text-gray-300">
                          {item.datetime}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-5 py-3 text-sm font-medium text-gray-400 text-center border-t-[1.35px] border-[#374151] bg-[#0B1121]">
                {notifications.length} Notifications
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-white hover:bg-gray-700 h-auto py-2 px-3"
              >
                <Avatar className="h-8 w-8 border border-gray-600">
                  {avatarUrl && (
                    <AvatarImage
                      src={avatarUrl}
                      alt={user?.name || "User"}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-gray-600 text-gray-300 text-xs font-medium">
                    {user?.name
                      ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {user ? user.name : "Guest"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#0B1121] border-[1.35px] border-[#374151]"
            >
              <DropdownMenuLabel className="text-white">
                {user ? user.name : "Guest"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                asChild
                className="text-gray-200 hover:bg-gray-700"
              >
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                onClick={logout}
                className="text-gray-200 hover:bg-gray-700 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
