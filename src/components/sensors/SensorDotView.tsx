"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Sensor } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SensorPagination from "./SensorPagination";
import {
  getCardBackgroundColor,
  SensorConfig,
} from "@/lib/utils/vibrationUtils";

interface SensorDotViewProps {
  sensorGroups?: Sensor[][];
  dotSize?: number;
}

export default function SensorDotView({
  sensorGroups: propsSensorGroups,
  dotSize = 1,
}: SensorDotViewProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 510; // จำนวน sensors ต่อหน้า

  // Map dotSize to CSS size classes
  const dotSizeClasses: Record<number, string> = {
    1: "w-12 h-12",
    2: "w-14 h-14",
    3: "w-16 h-16",
    4: "w-20 h-20",
  };

  // Map dotSize to grid gap
  const gapClasses: Record<number, string> = {
    1: "gap-1",
    2: "gap-2",
    3: "gap-3",
    4: "gap-4",
  };

  // Map dotSize to grid column template (responsive minmax)
  const gridColsClasses: Record<number, string> = {
    1: "grid-cols-[repeat(auto-fill,minmax(48px,1fr))]",
    2: "grid-cols-[repeat(auto-fill,minmax(56px,1fr))]",
    3: "grid-cols-[repeat(auto-fill,minmax(64px,1fr))]",
    4: "grid-cols-[repeat(auto-fill,minmax(80px,1fr))]",
  };

  // Map dotSize to text size classes
  const textSizeClasses: Record<number, string> = {
    1: "text-sm",      // Was text-xs
    2: "text-base",    // Was text-sm
    3: "text-lg",      // Was text-base
    4: "text-xl",      // Was text-lg
  };

  const sizeClass = dotSizeClasses[dotSize] || "w-12 h-12";
  const gapClass = gapClasses[dotSize] || "gap-1";
  const gridColsClass =
    gridColsClasses[dotSize] ||
    "grid-cols-[repeat(auto-fill,minmax(48px,1fr))]";
  const textSizeClass = textSizeClasses[dotSize] || "text-[10px]";

  // Flatten sensorGroups to a single array of sensors (no mock data)
  const sensors: Sensor[] = propsSensorGroups ? propsSensorGroups.flat() : [];

  // Calculate pagination
  const totalPages = Math.ceil(sensors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSensors = sensors.slice(startIndex, endIndex);

  const handleSensorClick = (sensorId: string) => {
    router.push(`/sensors/${sensorId}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (sensors.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <p>No sensors available</p>
      </div>
    );
  }

  return (
    <div className="w-full transition-all duration-300">
      <TooltipProvider>
        <div
          className={`grid ${gridColsClass} ${gapClass} justify-items-center`}
        >
          {currentSensors.map((sensor) => {
            // Get temperature value
            const temperature = sensor.last_data?.temperature || 0;

            // Fixed background color for bottom section as requested
            // const bgColor = "bg-[#E6E9EC]"; // Removed unused variable 'bgColor'
            const textColor = "text-gray-900";

            // Determine device role (Master/Satellite)
            const deviceRole =
              sensor.sensor_type ||
              (sensor as { sensorType?: string | null }).sensorType ||
              (sensor as { role?: string | null }).role ||
              (sensor as { deviceRole?: string | null }).deviceRole ||
              "Master";
            const isMaster = String(deviceRole).toLowerCase() === "master";

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
              thresholdMin: sensor.threshold_min
                ? Number(sensor.threshold_min)
                : 0.1,
              thresholdMedium: sensor.threshold_medium
                ? Number(sensor.threshold_medium)
                : 0.125,
              thresholdMax: sensor.threshold_max
                ? Number(sensor.threshold_max)
                : 0.15,
              machineClass: sensor.machine_class || undefined,
            };

            const colorClass = getCardBackgroundColor(maxRms, sensorConfig);

            // Determine status color code
            let statusColorCode = "#72ff82"; // Default Normal (Green)

            // Priority 1: Lost (offline and not standby)
            if (
              sensor.connectivity === "offline" &&
              sensor.operationalStatus !== "standby"
            ) {
              statusColorCode = "#626262"; // Lost - Dark Gray
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
            else if (sensor.operationalStatus === "standby") {
              statusColorCode = "#c8c8c8"; // Standby - Light Gray
            }

            // Determine background style for top 60% (matches status color)
            const topSectionStyle: React.CSSProperties = {
              backgroundColor: statusColorCode,
            };

            // Hexagon render for Satellite, Circle for Master
            const isSatellite = !isMaster;

            if (isSatellite) {
              return (
                <Tooltip key={sensor.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`${sizeClass} rounded-full flex flex-col cursor-pointer hover:opacity-80 relative items-center justify-center overflow-hidden`}
                      style={{
                        backgroundColor: "white",
                        border: `3px solid ${statusColorCode}`, // Status Border
                        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      onClick={() => handleSensorClick(sensor.id)}
                    >
                      {/* Top 60% - Status Color (Inside) */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[50%]"
                        style={topSectionStyle}
                      ></div>
                      {/* Bottom 40% - White Background */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-[50%] bg-white`}
                      ></div>

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 h-[50%] z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={`font-bold ${textSizeClass} text-gray-900 leading-none`}
                          >
                            {Math.round(temperature)}°
                          </span>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-gray-900 border-gray-700 text-white"
                  >
                    {/* Tooltip Content */}
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold">
                        {sensor.name || sensor.sensor_name || "Unknown Sensor"}
                      </div>
                      <div className="text-gray-400">
                        {sensor.model || `Model-${sensor.id.substring(0, 8)}`}
                      </div>
                      <div className="text-gray-400">
                        {sensor.machineName ||
                          sensor.machine_number ||
                          "Unknown Machine"}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>Temp: {temperature.toFixed(1)}°C</span>
                        <span>
                          Battery:{" "}
                          {sensor.batteryLevel?.toFixed(0) ||
                            sensor.last_data?.battery?.toFixed(0) ||
                            "0"}
                          %
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Status:</span>
                        <div
                          className={`w-2 h-2 rounded-full ${sensor.connectivity === "online"
                            ? "bg-green-500"
                            : "bg-gray-500"
                            }`}
                        />
                        <span className="text-xs">
                          {sensor.connectivity || "offline"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Vibration:</span>
                        <div className="flex space-x-0.5">
                          <div
                            className={`w-1 h-1 rounded-full ${parseFloat(
                              sensor.h_stats?.velocityTopPeak || "0"
                            ) > 0
                              ? "bg-green-500"
                              : "bg-gray-500"
                              }`}
                          />
                          <div
                            className={`w-1 h-1 rounded-full ${parseFloat(
                              sensor.v_stats?.velocityTopPeak || "0"
                            ) > 0
                              ? "bg-green-500"
                              : "bg-gray-500"
                              }`}
                          />
                          <div
                            className={`w-1 h-1 rounded-full ${parseFloat(
                              sensor.a_stats?.velocityTopPeak || "0"
                            ) > 0
                              ? "bg-green-500"
                              : "bg-gray-500"
                              }`}
                          />
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Tooltip key={sensor.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`${sizeClass} flex flex-col cursor-pointer hover:opacity-80 relative overflow-hidden`}
                    style={{
                      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      border: `3px solid ${statusColorCode}`, // Status Border
                      borderRadius: "50% 50% 15% 15%",
                    }}
                    onClick={() => handleSensorClick(sensor.id)}
                  >
                    {/* Top 60% - Status Color */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[50%]"
                      style={topSectionStyle}
                    ></div>

                    {/* Bottom 40% - Temperature based color */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-[50%] bg-white`}
                    ></div>

                    {/* Content - Centered within bottom 40% only */}
                    <div className="absolute bottom-0 left-0 right-0 h-[50%] z-10 flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center">
                        <span
                          className={`font-bold ${textSizeClass} ${textColor} leading-none`}
                        >
                          {Math.round(temperature)}°
                        </span>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-gray-900 border-gray-700 text-white"
                >
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">
                      {sensor.name || sensor.sensor_name || "Unknown Sensor"}
                    </div>
                    <div className="text-gray-400">
                      {sensor.model || `Model-${sensor.id.substring(0, 8)}`}
                    </div>
                    <div className="text-gray-400">
                      {sensor.machineName ||
                        sensor.machine_number ||
                        "Unknown Machine"}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>Temp: {temperature.toFixed(1)}°C</span>
                      <span>
                        Battery:{" "}
                        {sensor.batteryLevel?.toFixed(0) ||
                          sensor.last_data?.battery?.toFixed(0) ||
                          "0"}
                        %
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>Status:</span>
                      <div
                        className={`w-2 h-2 rounded-full ${sensor.connectivity === "online"
                          ? "bg-green-500"
                          : "bg-gray-500"
                          }`}
                      />
                      <span className="text-xs">
                        {sensor.connectivity || "offline"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>Vibration:</span>
                      <div className="flex space-x-0.5">
                        <div
                          className={`w-1 h-1 rounded-full ${parseFloat(sensor.h_stats?.velocityTopPeak || "0") >
                            0
                            ? "bg-green-500"
                            : "bg-gray-500"
                            }`}
                        />
                        <div
                          className={`w-1 h-1 rounded-full ${parseFloat(sensor.v_stats?.velocityTopPeak || "0") >
                            0
                            ? "bg-green-500"
                            : "bg-gray-500"
                            }`}
                        />
                        <div
                          className={`w-1 h-1 rounded-full ${parseFloat(sensor.a_stats?.velocityTopPeak || "0") >
                            0
                            ? "bg-green-500"
                            : "bg-gray-500"
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {/* Pagination */}
        <SensorPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </TooltipProvider>
    </div>
  );
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    refreshSensorData?: () => void;
  }
}
