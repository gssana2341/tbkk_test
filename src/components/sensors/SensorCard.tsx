"use client";
import { Card, CardContent } from "@/components/ui/card";

import type { Sensor } from "@/lib/types";
import {
  getCardBackgroundColor,
  type SensorConfig,
} from "@/lib/utils/vibrationUtils";

interface SensorCardProps {
  sensor: Sensor;
  onClick: () => void;
}

type SensorRoleFields = {
  sensorType?: string | null;
  role?: string | null;
  deviceRole?: string | null;
};

export default function SensorCard({ sensor, onClick }: SensorCardProps) {
  const deviceId =
    sensor?.serialNumber || sensor?.id?.substring(0, 3)?.toUpperCase() || "D01";
  // Prefer sensor_type from DB, then role/deviceRole, then default to empty string
  const sensorWithRole = sensor as Sensor & SensorRoleFields;
  const deviceRole =
    sensorWithRole.sensor_type ||
    sensorWithRole.sensorType ||
    sensorWithRole.role ||
    sensorWithRole.deviceRole ||
    "";
  const areaLabel = (sensor?.installation_point || "Area 1").toString();
  const machineLabel = (sensor?.machine_number || "Machine 1").toString();
  const temperature = sensor?.last_data?.temperature ?? 0;
  const battery = sensor?.batteryLevel ?? sensor?.last_data?.battery ?? 0;
  const connectivity = sensor?.connectivity || "offline";

  // Get vibration RMS values for each axis
  // Use undefined for missing data to distinguish from 0 (which is valid data)
  const veloRmsH =
    sensor?.last_data?.velo_rms_h !== undefined &&
      sensor?.last_data?.velo_rms_h !== null
      ? Number(sensor.last_data.velo_rms_h)
      : undefined;

  const veloRmsV =
    sensor?.last_data?.velo_rms_v !== undefined &&
      sensor?.last_data?.velo_rms_v !== null
      ? Number(sensor.last_data.velo_rms_v)
      : undefined;

  const veloRmsA =
    sensor?.last_data?.velo_rms_a !== undefined &&
      sensor?.last_data?.velo_rms_a !== null
      ? Number(sensor.last_data.velo_rms_a)
      : undefined;

  // Get sensor configuration for thresholds
  const sensorConfig: SensorConfig = {
    thresholdMin: sensor?.threshold_min ? Number(sensor.threshold_min) : 0.1,
    thresholdMedium: sensor?.threshold_medium
      ? Number(sensor.threshold_medium)
      : 0.125,
    thresholdMax: sensor?.threshold_max ? Number(sensor.threshold_max) : 0.15,
    machineClass: sensor?.machine_class || undefined,
  };

  // Function to get badge style based on vibration level
  const getAxisBadgeStyle = (
    veloRms: number | undefined
  ): { backgroundColor: string; color: string } => {
    // Parse Tailwind classes to inline styles
    const commonStyle = { border: "1px solid #000000", color: "#000000" };

    // If value is undefined (no data), return Gray
    if (veloRms === undefined) {
      return { backgroundColor: "#c8c8c8", ...commonStyle };
    }

    const colorClass = getCardBackgroundColor(veloRms, sensorConfig);

    if (colorClass.includes("bg-[#00e200]")) {
      return { backgroundColor: "#72ff82", ...commonStyle }; // Normal
    } else if (colorClass.includes("bg-[#ffff00]")) {
      return { backgroundColor: "#ffd84d", ...commonStyle }; // Warning
    } else if (colorClass.includes("bg-[#ff9900]")) {
      return { backgroundColor: "#ff8c1a", ...commonStyle }; // Concern
    } else if (colorClass.includes("bg-[#ff2b05]")) {
      return { backgroundColor: "#ff4d4d", ...commonStyle }; // Critical
    } else if (colorClass.includes("bg-gray-400")) {
      return { backgroundColor: "#c8c8c8", ...commonStyle }; // Offline/Standby (Medium Gray)
    }

    // Default to Normal
    return { backgroundColor: "#72ff82", ...commonStyle };
  };

  // Safely derive last update timestamp from known possible fields
  const resolveLastUpdate = (s: Sensor): Date | null => {
    const ts =
      s.last_data?.datetime ??
      (typeof (s as unknown as { updatedAt?: string }).updatedAt === "string"
        ? (s as unknown as { updatedAt?: string }).updatedAt
        : undefined);

    if (!ts) return null;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  // Fix: Treat server time as Local by removing Z if present
  // The API sends "2025-12-18T13:16:09Z" when it means 13:16 Local Time.
  // Standard parsing shifts this to 20:16 (+7h), so we must strip Z to force local interpretation.
  const rawLastUpdate = resolveLastUpdate(sensor);
  const lastUpdate = rawLastUpdate
    ? new Date(rawLastUpdate.toISOString().replace("Z", ""))
    : null;



  const lastUpdateText = lastUpdate
    ? lastUpdate.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    : "-";

  // Determine card background color based on sensor status
  // Colors match SensorStatusSummary status boxes with gradient effect
  // Determine card background color based on sensor status
  // Colors match SensorStatusSummary status boxes with gradient effect
  // Determine card style based on sensor status
  const getCardStyle = (): React.CSSProperties => {
    let borderColor = "#72ff82"; // Default Normal (Green)

    // Priority 1: Lost (offline and not standby)
    if (
      sensor.connectivity === "offline" &&
      sensor.operationalStatus !== "standby"
    ) {
      borderColor = "#626262"; // Lost - Dark Gray
    } else {
      // Calculate Max RMS to determine status color
      const maxRms = Math.max(veloRmsH ?? 0, veloRmsV ?? 0, veloRmsA ?? 0);
      const colorClass = getCardBackgroundColor(maxRms, sensorConfig);

      // Priority 2: Critical (Red)
      if (colorClass.includes("bg-[#ff2b05]")) {
        borderColor = "#ff4d4d";
      }
      // Priority 3: Concern (Orange)
      else if (colorClass.includes("bg-[#ff9900]")) {
        borderColor = "#ff8c1a";
      }
      // Priority 4: Warning (Yellow)
      else if (colorClass.includes("bg-[#ffff00]")) {
        borderColor = "#ffd84d";
      }
      // Priority 5: Standby
      else if (sensor.operationalStatus === "standby") {
        borderColor = "#c8c8c8";
      }
    }

    return {
      backgroundColor: "#030616",
      borderTop: `12px solid ${borderColor}`, // Thick top colored border
      borderRight: "1.35px solid #374151", // Thin gray border for shape
      borderBottom: "1.35px solid #374151",
      borderLeft: "1.35px solid #374151",
      color: "#ffffff", // White text for everything
    };
  };

  return (
    <Card
      onClick={onClick}
      className="relative w-full cursor-pointer shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden"
      style={getCardStyle()}
    >
      <CardContent className="p-1 2xl:p-1.5 overflow-hidden">
        {" "}
        {/* Row 1: ID | Pills | Status */}
        <div className="flex items-center justify-between gap-0.5 2xl:gap-1 overflow-hidden">
          <div className="flex items-center justify-center shrink-0 mr-1.5">
            <div
              className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 2xl:h-8 2xl:w-8 shadow-sm flex items-center justify-center shrink-0 ${deviceRole.toLowerCase() === "master" ? "bg-blue-600" : "bg-purple-600 rounded-full"}`}
              style={
                deviceRole.toLowerCase() === "master"
                  ? {
                    borderRadius: "50% 50% 15% 15%",
                  }
                  : undefined
              }
            >
              <span className={`text-white text-lg font-bold ${deviceRole.toLowerCase() !== "master" ? "" : ""}`}>
                {deviceRole.toLowerCase() === "master" ? "M" : "S"}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[0.75rem] sm:text-sm lg:text-base 2xl:text-lg font-extrabold tracking-tight leading-tight truncate text-white">
              {deviceId}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="flex items-center justify-center w-5 h-7 sm:w-6 sm:h-8 2xl:w-7 2xl:h-9 text-[0.625rem] sm:text-xs 2xl:text-sm rounded-full font-bold leading-none shadow-sm"
              style={getAxisBadgeStyle(veloRmsH)}
            >
              H
            </span>
            <span
              className="flex items-center justify-center w-5 h-7 sm:w-6 sm:h-8 2xl:w-7 2xl:h-9 text-[0.625rem] sm:text-xs 2xl:text-sm rounded-full font-bold leading-none shadow-sm"
              style={getAxisBadgeStyle(veloRmsV)}
            >
              V
            </span>
            <span
              className="flex items-center justify-center w-5 h-7 sm:w-6 sm:h-8 2xl:w-7 2xl:h-9 text-[0.625rem] sm:text-xs 2xl:text-sm rounded-full font-bold leading-none shadow-sm"
              style={getAxisBadgeStyle(veloRmsA)}
            >
              A
            </span>
          </div>

        </div>
        {/* Divider */}
        <div className="my-1.5 2xl:my-2 h-px w-full bg-[#374151]" />
        {/* Row 2: Area/Machine | Temperature */}
        <div className="flex items-center justify-between gap-0.5 2xl:gap-1 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">

            <div className="text-xs sm:text-sm lg:text-base 2xl:text-lg font-semibold truncate text-gray-300">
              {areaLabel} / {machineLabel}
            </div>
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl 2xl:text-3xl font-bold shrink-0 whitespace-nowrap text-white">
            {(Number(temperature) || 0).toFixed(0)}°C
          </div>
        </div>
        {/* Row 3: Battery | Wifi | Time */}
        <div className="mt-0.5 2xl:mt-1 flex items-center gap-0.5 2xl:gap-1 text-[0.625rem] sm:text-xs lg:text-sm 2xl:text-base overflow-hidden">
          <span className="inline-flex items-center gap-0.5 shrink-0 whitespace-nowrap text-gray-300">
            {/* Modern battery icon with 4 fill bars */}
            <svg
              width="24"
              height="14"
              viewBox="0 0 24 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-3 sm:w-6 sm:h-3.5 lg:w-7 lg:h-4 2xl:w-8 2xl:h-4.5"
            >
              <rect
                x="1"
                y="2"
                width="20"
                height="10"
                rx="3"
                fill="#374151"
                stroke="#9CA3AF"
                strokeWidth="1.2"
              />
              {/* Battery tip */}
              <rect x="22" y="5" width="2" height="4" rx="1" fill="#9CA3AF" />
              {/* 4 bars, fill based on battery level */}
              {Array.from({ length: 4 }).map((_, i) => {
                const percent = Math.max(
                  0,
                  Math.min(100, Number(battery) || 0)
                );
                // Each bar represents 25%
                const barStart = i * 25;
                // ...existing code...
                // How much of this bar should be filled (0-1)
                const fillRatio =
                  percent > barStart
                    ? Math.min(1, (percent - barStart) / 25)
                    : 0;
                // Bar color by overall percent
                const fillColor =
                  percent > 50
                    ? "#22C55E"
                    : percent > 25
                      ? "#FACC15"
                      : "#EF4444";
                return (
                  <g key={i}>
                    {/* Bar background */}
                    <rect
                      x={3 + i * 4.25}
                      y={4}
                      width={3.5}
                      height={6}
                      rx={1}
                      fill="#4B5563"
                    />
                    {/* Bar fill (proportional) */}
                    {fillRatio > 0 && (
                      <rect
                        x={3 + i * 4.25}
                        y={4}
                        width={3.5 * fillRatio}
                        height={6}
                        rx={1}
                        fill={fillColor}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
            {Math.max(0, Math.min(100, Number(battery) || 0)).toFixed(0)}%
          </span>
          <span className="inline-flex items-center gap-0.5 shrink-0 whitespace-nowrap">
            {/* WiFi SVG icon with color by connectivity */}
            <div className="mr-1 flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5"
              >
                <defs>
                  <filter
                    id="glow"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur stdDeviation="1.1" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient
                    id="wifi-neon"
                    x1="4"
                    y1="7"
                    x2="18"
                    y2="17"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#22FF88" />
                    <stop offset="1" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
                <g
                  filter={connectivity === "online" ? "url(#glow)" : undefined}
                >
                  <path
                    d="M4.5 10.5C8.5 7 13.5 7 17.5 10.5"
                    stroke={
                      connectivity === "online" ? "url(#wifi-neon)" : "#9CA3AF"
                    }
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M7.5 13.5C9.5 12 12.5 12 14.5 13.5"
                    stroke={
                      connectivity === "online" ? "url(#wifi-neon)" : "#9CA3AF"
                    }
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <circle
                    cx="11"
                    cy="16.5"
                    r="1.3"
                    fill={connectivity === "online" ? "#22FF88" : "#9CA3AF"}
                    filter={
                      connectivity === "online" ? "url(#glow)" : undefined
                    }
                  />
                </g>
              </svg>
            </div>
          </span>
          <span className="text-[0.5rem] sm:text-[0.563rem] lg:text-xs 2xl:text-sm text-gray-300 shrink truncate min-w-0">
            {lastUpdateText}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
