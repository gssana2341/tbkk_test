"use client";

import React, { useState, useEffect } from "react";
import type { Sensor } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getCardBackgroundColor,
  getVibrationColorFromVelocity,
  SensorConfig,
} from "@/lib/utils/vibrationUtils";
import { getDecayedBattery } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";

interface SensorDotNodeProps {
  sensor: Sensor;
  dotSize: number;
  sizeClass: string;
  circleFontSizeMap: Record<number, string>;
  handleSensorClick: (id: string) => void;
}

export default function SensorDotNode({
  sensor,
  dotSize,
  sizeClass,
  circleFontSizeMap,
  handleSensorClick,
}: SensorDotNodeProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";

  const [diagnosticFault, setDiagnosticFault] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      setDiagnosticFault(null);
      return;
    }
    // Only fetch diagnostic fault if the sensor is in an abnormal status
    if (
      sensor.status === "critical" ||
      sensor.status === "concern" ||
      sensor.status === "warning"
    ) {
      import("@/lib/api/diagnostics").then(({ diagnosticsApi }) => {
        // Use empty string to get latest, or ISO string if required
        const isoDate = new Date(sensor.lastUpdated).toISOString();
        diagnosticsApi
          .getDiagnosticHistory(sensor.id, isoDate)
          .then((res) => {
            if (res && res.dominant_fault) {
              setDiagnosticFault(res.dominant_fault.fault_name);
            }
          })
          .catch(() => {});
      });
    }
  }, [sensor.id, sensor.status, sensor.lastUpdated, isSuperAdmin]);

  const role = (sensor.sensor_type || "Satellite").toLowerCase();
  const isMaster = role === "master";
  const isSatellite = role === "satellite";

  // Get temperature value
  const temperature = sensor.last_data?.temperature || 0;

  // Compute decayed battery (skipped for ORG_SURAZENSE)
  const rawBattery = sensor.batteryLevel ?? sensor.last_data?.battery ?? 0;
  const displayBattery = getDecayedBattery(
    rawBattery,
    sensor.last_data?.datetime,
    role,
    user?.org_code
  );

  // Determine status color code
  let statusColorCode = "#72ff82"; // Default Normal (Green)

  // Calculate Max RMS and determine status color (Same logic as SensorCard)
  const veloRmsH = sensor.last_data?.velo_rms_h
    ? Number(sensor.last_data.velo_rms_h)
    : 0;
  const veloRmsV = sensor.last_data?.velo_rms_v
    ? Number(sensor.last_data.velo_rms_v)
    : 0;
  const veloRmsA = sensor.last_data?.velo_rms_a
    ? Number(sensor.last_data.velo_rms_a)
    : 0;
  const maxRms = Math.max(veloRmsH, veloRmsV, veloRmsA);

  const sensorConfig: SensorConfig = {
    thresholdMin: sensor.threshold_min ? Number(sensor.threshold_min) : 0.1,
    thresholdMedium: sensor.threshold_medium
      ? Number(sensor.threshold_medium)
      : 0.125,
    thresholdMax: sensor.threshold_max ? Number(sensor.threshold_max) : 0.15,
    machineClass: sensor.machine_class || undefined,
  };

  const colorClass = getCardBackgroundColor(maxRms, sensorConfig);

  // Priority 1: Lost
  if (sensor.status === "lost") {
    statusColorCode = "#404040"; // Lost - Dark Gray
  }
  // Priority 2: Critical (Red)
  else if (colorClass.includes("bg-[#ff2b05]")) {
    statusColorCode = "#ff4d4d"; // Critical
  }
  // Priority 3: Concern (Orange)
  else if (colorClass.includes("bg-[#ff9900]")) {
    statusColorCode = "#ff8c1a"; // Concern
  }
  // Priority 4: Warning (Yellow)
  else if (colorClass.includes("bg-[#ffff00]")) {
    statusColorCode = "#ffd84d"; // Warning
  }
  // Priority 5: Standby
  else if (sensor.status === "standby") {
    statusColorCode = "#f8f8f8"; // Standby - Very Light Gray
  }

  // Determine background style for top 60% (matches status color)
  const topSectionStyle: React.CSSProperties = {
    backgroundColor: statusColorCode,
  };

  // Calculate axis colors for tooltip
  const hColor = getVibrationColorFromVelocity(
    veloRmsH,
    sensorConfig,
    "detail",
    sensor.connectivity === "offline"
  );
  const vColor = getVibrationColorFromVelocity(
    veloRmsV,
    sensorConfig,
    "detail",
    sensor.connectivity === "offline"
  );
  const aColor = getVibrationColorFromVelocity(
    veloRmsA,
    sensorConfig,
    "detail",
    sensor.connectivity === "offline"
  );

  // Override axis colors if status is 'lost'
  const finalHColor =
    sensor.status === "lost" ? "bg-[#404040] text-white" : hColor;
  const finalVColor =
    sensor.status === "lost" ? "bg-[#404040] text-white" : vColor;
  const finalAColor =
    sensor.status === "lost" ? "bg-[#404040] text-white" : aColor;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`${sizeClass} cursor-pointer hover:opacity-80 transition-all duration-500 relative flex flex-col items-center group`}
          onClick={() => handleSensorClick(sensor.id)}
        >
          {isMaster ? (
            // Master: Bread Loaf shape (Hexagon-ish/Helmet)
            <div
              className={`w-full h-full flex flex-col items-center justify-center overflow-visible drop-shadow-sm`}
            >
              <svg
                viewBox="0 0 100 110"
                className="w-full h-full overflow-visible drop-shadow-sm"
                preserveAspectRatio="xMidYMid meet"
              >
                <path
                  d="M 50 2 C 20 2 2 20 2 50 L 10 108 L 90 108 L 98 50 C 98 20 80 2 50 2 Z"
                  fill={statusColorCode}
                />
                <path d="M 8 52 L 92 52 L 85 102 L 15 102 Z" fill="white" />
                <text
                  x="50"
                  y="82"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={sensor.status === "lost" ? "#404040" : "#000"}
                  fontSize="35"
                  fontWeight="bold"
                  fontFamily="'Inter', sans-serif"
                  className="select-none"
                >
                  {sensor.status === "lost"
                    ? "-"
                    : `${Math.round(temperature)}°`}
                </text>
              </svg>
            </div>
          ) : (
            // Satellite: Circle Shape
            <div
              className="w-full h-full rounded-full flex flex-col items-center justify-center overflow-hidden relative shadow-sm"
              style={{
                backgroundColor: "white",
                border: `3px solid ${statusColorCode}`,
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[50%]"
                style={topSectionStyle}
              ></div>
              <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-white"></div>
              <div className="absolute bottom-0 left-0 right-0 h-[50%] z-10 flex items-center justify-center pb-1">
                <span
                  className={`font-bold leading-none ${sensor.status === "lost" ? "text-[#404040]" : "text-gray-900"}`}
                  style={{
                    fontSize: circleFontSizeMap[dotSize] || "18px",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {sensor.status === "lost"
                    ? "-"
                    : `${Math.round(temperature)}°`}
                </span>
              </div>
            </div>
          )}

          {/* Global Fault Badge floating on top of the dot */}
          {diagnosticFault && (
            <div className="absolute -top-3 -right-3 sm:-right-6 bg-red-600 border border-red-400 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-md z-20 whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              {diagnosticFault}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-[#0B1121] border-[1.35px] border-[#374151] text-white p-4 min-w-[200px]"
      >
        <div className="space-y-3 text-base">
          <div>
            <div className="font-bold text-lg leading-tight flex items-center gap-2">
              {sensor.name || sensor.sensor_name || "Unknown Sensor"}
              {diagnosticFault && (
                <span className="text-[10px] uppercase bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                  {diagnosticFault}
                </span>
              )}
            </div>
            <div className="text-gray-300 text-sm mt-0.5">
              {sensor.machineName || "Unknown Machine"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Temp:</span>
              <span className="font-mono">{temperature.toFixed(0)}°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Battery:</span>
              <span className="font-mono">
                {displayBattery.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-700">
            <span className="text-gray-400">Vibration:</span>
            <div className="flex space-x-2">
              <div
                className={`w-4 h-4 rounded-full ${finalHColor.split(" ")[0]}`}
                title="Horizontal (H)"
              />
              <div
                className={`w-4 h-4 rounded-full ${finalVColor.split(" ")[0]}`}
                title="Vertical (V)"
              />
              <div
                className={`w-4 h-4 rounded-full ${finalAColor.split(" ")[0]}`}
                title="Axial (A)"
              />
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
