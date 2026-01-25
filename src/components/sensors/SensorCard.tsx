"use client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { Sensor } from "@/lib/types";
import {
  getCardBackgroundColor,
  getVibrationColorFromVelocity,
  type SensorConfig,
} from "@/lib/utils/vibrationUtils";
import { cn, getSignalStrength, getSignalStrengthLabel } from "@/lib/utils";

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
  const areaLabel = (
    sensor?.area ||
    sensor?.location ||
    sensor?.installation_point ||
    "Area 1"
  ).toString();
  const machineLabel = (
    sensor?.machine ||
    sensor?.machineName ||
    sensor?.machine_number ||
    "Machine 1"
  ).toString();
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

  // Get acceleration G RMS values for each axis (for tooltip)
  const gRmsH =
    sensor?.last_data?.g_rms_h !== undefined &&
    sensor?.last_data?.g_rms_h !== null
      ? Number(sensor.last_data.g_rms_h)
      : undefined;

  const gRmsV =
    sensor?.last_data?.g_rms_v !== undefined &&
    sensor?.last_data?.g_rms_v !== null
      ? Number(sensor.last_data.g_rms_v)
      : undefined;

  const gRmsA =
    sensor?.last_data?.g_rms_a !== undefined &&
    sensor?.last_data?.g_rms_a !== null
      ? Number(sensor.last_data.g_rms_a)
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

    // Special case for Lost status: all axes turn status color (#404040)
    if (sensor.status === "lost") {
      return { backgroundColor: "#404040", color: "#ffffff" };
    }

    // If value is undefined (no data), return Gray (Standby)
    if (veloRms === undefined) {
      return { backgroundColor: "#f8f8f8", ...commonStyle };
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
      return { backgroundColor: "#f8f8f8", ...commonStyle }; // Offline/Standby (Very Light Gray)
    }

    // Default to Normal
    return { backgroundColor: "#72ff82", ...commonStyle };
  };

  // Safely derive last update timestamp from known possible fields
  const resolveLastUpdate = (s: Sensor): Date | null => {
    // Collect all possible timestamps
    const times: number[] = [];

    if (s.last_data?.datetime) {
      const d = new Date(s.last_data.datetime.replace("Z", ""));
      if (!isNaN(d.getTime())) times.push(d.getTime());
    }

    const updatedAt = (s as any).updatedAt || (s as any).updated_at;
    if (updatedAt && typeof updatedAt === "string") {
      const d = new Date(updatedAt.replace("Z", ""));
      if (!isNaN(d.getTime())) times.push(d.getTime());
    }

    if (times.length === 0) return null;

    // Use the latest one (Math.max)
    return new Date(Math.max(...times));
  };

  // Fix: Treat server time as Local by removing Z if present
  // The API sends "2025-12-18T13:16:09Z" when it means 13:16 Local Time.
  // Standard parsing shifts this to 20:16 (+7h), so we must strip Z to force local interpretation.
  const lastUpdate = resolveLastUpdate(sensor);

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

    // Priority 1: Lost
    if (sensor.status === "lost") {
      borderColor = "#404040"; // Lost - Dark Gray
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
        borderColor = "#f8f8f8";
      }
    }

    return {
      backgroundColor: "#161E28",
      borderTop: `18px solid ${borderColor}`, // Thicker top colored border
      borderRight: "1.35px solid #374151", // Thin gray border for shape
      borderBottom: "1.35px solid #374151",
      borderLeft: "1.35px solid #374151",
      color: sensor.status === "lost" ? "#404040" : "#ffffff", // Dark Gray for Lost, White for others
    };
  };

  // Helper function to get axis background color for tooltip
  const getAxisTooltipBgColor = (veloRms: number | undefined): string => {
    if (veloRms === undefined || sensor.status === "lost") return "#404040";
    const colorClass = getVibrationColorFromVelocity(
      veloRms,
      sensorConfig,
      "detail",
      false
    );
    // Extract background color from class
    if (colorClass.includes("bg-[#72ff82]")) return "#ff6b6b"; // Normal -> coral/red for tooltip
    if (colorClass.includes("bg-[#ffd84d]")) return "#ff6b6b"; // Warning -> coral/red
    if (colorClass.includes("bg-[#ff8c1a]")) return "#ff6b6b"; // Concern -> coral/red
    if (colorClass.includes("bg-[#ff4d4d]")) return "#ff6b6b"; // Critical -> coral/red
    return "#ff6b6b"; // Default coral/red as shown in image
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
                    className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 2xl:h-8 2xl:w-8 relative flex items-center justify-center shrink-0`}
                  >
                    {deviceRole.toLowerCase() === "master" ? (
                      <>
                        <svg
                          viewBox="0 0 100 110"
                          className="absolute inset-0 w-full h-full overflow-visible drop-shadow-sm"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <path
                            d="M 50 2 C 20 2 2 20 2 50 L 10 108 L 90 108 L 98 50 C 98 20 80 2 50 2 Z"
                            fill="#2563eb"
                          />
                        </svg>
                        <span className="relative z-10 text-white font-bold text-[0.625rem] sm:text-xs lg:text-sm 2xl:text-base leading-none mb-1">
                          M
                        </span>
                      </>
                    ) : (
                      <div className="w-full h-full bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-[0.625rem] sm:text-xs lg:text-sm 2xl:text-base font-bold leading-none">
                          S
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div
                    className={`text-[0.9rem] sm:text-base lg:text-lg 2xl:text-xl font-extrabold tracking-tight leading-tight truncate ${sensor.status === "lost" ? "text-[#404040]" : "text-white"}`}
                  >
                    {deviceId}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 mr-1.5 sm:mr-2 2xl:mr-3">
                  <span
                    className="flex items-center justify-center w-3 h-7 sm:w-4 sm:h-8 2xl:w-5 2xl:h-9 text-[0.7rem] sm:text-sm 2xl:text-base rounded-full font-bold leading-none shadow-sm"
                    style={getAxisBadgeStyle(veloRmsH)}
                  >
                    H
                  </span>
                  <span
                    className="flex items-center justify-center w-3 h-7 sm:w-4 sm:h-8 2xl:w-5 2xl:h-9 text-[0.7rem] sm:text-sm 2xl:text-base rounded-full font-bold leading-none shadow-sm"
                    style={getAxisBadgeStyle(veloRmsV)}
                  >
                    V
                  </span>
                  <span
                    className="flex items-center justify-center w-3 h-7 sm:w-4 sm:h-8 2xl:w-5 2xl:h-9 text-[0.7rem] sm:text-sm 2xl:text-base rounded-full font-bold leading-none shadow-sm"
                    style={getAxisBadgeStyle(veloRmsA)}
                  >
                    A
                  </span>
                </div>
              </div>
              <div className="mt-1 2xl:mt-1.5 flex items-center justify-between gap-1 overflow-hidden">
                {/* Left Column: Row 2 and Row 3 labels/stats */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  {/* Row 2: Area/Machine */}
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <div
                      className={`text-[0.95rem] sm:text-lg lg:text-xl 2xl:text-2xl font-semibold truncate leading-tight ${sensor.status === "lost" ? "text-[#404040]" : "text-gray-300"}`}
                    >
                      {areaLabel} / {machineLabel}
                    </div>
                  </div>

                  {/* Row 3: Battery | Wifi | Time */}
                  <div
                    className="flex items-center gap-0.5 2xl:gap-1 text-[0.55rem] sm:text-[0.65rem] lg:text-[0.75rem] 2xl:text-xs overflow-hidden leading-tight"
                    style={{ color: "#7A8290" }}
                  >
                    <span className="inline-flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                      {/* Modern battery icon with 4 fill bars */}
                      <svg
                        width="20"
                        height="12"
                        viewBox="0 0 24 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-1.5 sm:w-4.5 sm:h-2 lg:w-5 lg:h-2.5 2xl:w-6.5 2xl:h-3.5"
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
                        <rect
                          x="22"
                          y="5"
                          width="2"
                          height="4"
                          rx="1"
                          fill="#9CA3AF"
                        />
                        {/* 4 bars, fill based on battery level */}
                        {Array.from({ length: 4 }).map((_, i) => {
                          const percent = Math.max(
                            0,
                            Math.min(100, Number(battery) || 0)
                          );
                          // Each bar represents 25%
                          const barStart = i * 25;
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
                      {Math.max(0, Math.min(100, Number(battery) || 0)).toFixed(
                        0
                      )}
                      %
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                      {/* Custom WiFi icon with all bars visible - inactive bars in gray */}
                      {(() => {
                        const rssiInput = sensor?.last_data?.rssi || 0;
                        const isSatellite =
                          deviceRole.toLowerCase() !== "master";

                        let level: number;
                        if (isSatellite && rssiInput < 0) {
                          // Specific criteria for Satellite sensors (dBm)
                          const rssi = Number(rssiInput);
                          if (rssi === 0) level = 0;
                          else if (rssi >= -70)
                            level = 4; // Excellent: -30 to -70
                          else if (rssi >= -80)
                            level = 3; // Good: -71 to -80
                          else if (rssi >= -90)
                            level = 2; // Fair: -81 to -90
                          else level = 1; // Weak: Below -90
                        } else {
                          // Fallback to existing logic for Master or if rssi is already a level (0-4)
                          level = getSignalStrength(Number(rssiInput));
                        }

                        // Determine active color based on signal level
                        let activeColor = "#9CA3AF"; // Gray for level 0
                        if (level === 1)
                          activeColor = "#EF4444"; // Red - Weak
                        else if (level === 2)
                          activeColor = "#FB923C"; // Orange - Fair
                        else if (level >= 3) activeColor = "#00E200"; // Green - Good/Excellent

                        const inactiveColor = "#4B5563"; // Gray-600 for inactive bars

                        // Custom WiFi SVG with 3 arcs + dot (standard WiFi style)
                        return (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3 h-3 sm:w-3.5 sm:h-3.5 2xl:w-4 2xl:h-4"
                          >
                            {/* Dot at bottom - always active color if level > 0 */}
                            <circle
                              cx="12"
                              cy="19"
                              r="2"
                              fill={level >= 1 ? activeColor : inactiveColor}
                              stroke="none"
                            />

                            {/* Arc 1 - smallest (level 2+) */}
                            <path
                              d="M9 15c1.5-1.5 4.5-1.5 6 0"
                              stroke={level >= 2 ? activeColor : inactiveColor}
                              fill="none"
                            />

                            {/* Arc 2 - middle (level 3+) */}
                            <path
                              d="M6 12c3-3 9-3 12 0"
                              stroke={level >= 3 ? activeColor : inactiveColor}
                              fill="none"
                            />

                            {/* Arc 3 - largest (level 4) */}
                            <path
                              d="M3 9c4.5-4.5 13.5-4.5 18 0"
                              stroke={level >= 4 ? activeColor : inactiveColor}
                              fill="none"
                            />
                          </svg>
                        );
                      })()}
                    </span>
                    <span className="shrink truncate min-w-0">
                      {lastUpdateText}
                    </span>
                  </div>
                </div>

                {/* Temperature spanning Row 2 and Row 3 on the right */}
                <div
                  className={`flex items-baseline gap-0.5 mt-0.5 shrink-0 whitespace-nowrap pr-1.5 sm:pr-2 2xl:pr-3 ${sensor.status === "lost" ? "text-[#404040]" : "text-white"}`}
                >
                  <span
                    className="text-2xl sm:text-3xl lg:text-4xl 2xl:text-5xl font-bold leading-none"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {sensor.status === "lost"
                      ? "-"
                      : (Number(temperature) || 0).toFixed(0)}
                  </span>
                  {sensor.status !== "lost" && (
                    <span className="text-xs sm:text-sm lg:text-base 2xl:text-lg font-bold leading-none">
                      °C
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-[#0B1121] border-[1.35px] border-[#374151] p-2"
        >
          {/* MAC Address Display */}
          <div className="text-gray-300 text-xs mb-2 font-mono border-b border-gray-700 pb-1">
            MAC: {sensor.macAddress || sensor.serialNumber || "-"}
          </div>

          {/* Axis data tooltip - single box with 3 axes */}
          <div className="flex gap-2">
            {/* Horizontal (H) */}
            <div
              className="rounded-lg p-2 min-w-[150px]"
              style={{
                backgroundColor: getAxisBadgeStyle(veloRmsH).backgroundColor,
                border: "1px solid #000",
              }}
            >
              <div className="text-black font-bold text-sm mb-1">
                Horizontal (H)
              </div>
              <div className="flex justify-between text-black text-xs">
                <span className="font-normal">Acceleration</span>
                <span className="font-bold">
                  {gRmsH !== undefined ? gRmsH.toFixed(2) : "-"}{" "}
                  <span className="text-[10px] font-normal">G</span>
                </span>
              </div>
              <div className="flex justify-between text-black text-xs">
                <span className="font-normal">Velocity</span>
                <span className="font-bold">
                  {veloRmsH !== undefined ? veloRmsH.toFixed(2) : "-"}{" "}
                  <span className="text-[10px] font-normal">mm/s</span>
                </span>
              </div>
            </div>

            {/* Vertical (V) */}
            <div
              className="rounded-lg p-2 min-w-[150px]"
              style={{
                backgroundColor: getAxisBadgeStyle(veloRmsV).backgroundColor,
                border: "1px solid #000",
              }}
            >
              <div className="text-black font-bold text-sm mb-1">
                Vertical (V)
              </div>
              <div className="flex justify-between text-black text-xs">
                <span className="font-normal">Acceleration</span>
                <span className="font-bold">
                  {gRmsV !== undefined ? gRmsV.toFixed(2) : "-"}{" "}
                  <span className="text-[10px] font-normal">G</span>
                </span>
              </div>
              <div className="flex justify-between text-black text-xs">
                <span className="font-normal">Velocity</span>
                <span className="font-bold">
                  {veloRmsV !== undefined ? veloRmsV.toFixed(2) : "-"}{" "}
                  <span className="text-[10px] font-normal">mm/s</span>
                </span>
              </div>
            </div>

            {/* Axial (A) */}
            <div
              className="rounded-lg p-2 min-w-[150px]"
              style={{
                backgroundColor: getAxisBadgeStyle(veloRmsA).backgroundColor,
                border: "1px solid #000",
              }}
            >
              <div className="text-black font-bold text-sm mb-1">Axial (A)</div>
              <div className="flex justify-between text-black text-xs">
                <span className="font-normal">Acceleration</span>
                <span className="font-bold">
                  {gRmsA !== undefined ? gRmsA.toFixed(2) : "-"}{" "}
                  <span className="text-[10px] font-normal">G</span>
                </span>
              </div>
              <div className="flex justify-between text-black text-xs">
                <span className="font-normal">Velocity</span>
                <span className="font-bold">
                  {veloRmsA !== undefined ? veloRmsA.toFixed(2) : "-"}{" "}
                  <span className="text-[10px] font-normal">mm/s</span>
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
