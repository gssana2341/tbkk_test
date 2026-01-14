"use client";

import type React from "react";
import { useState, useMemo } from "react";
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
  const itemsPerPage = 510; // Number of sensors per page

  // Map dotSize to CSS size classes
  const dotSizeClasses: Record<number, string> = {
    1: "w-12 h-12",
    2: "w-14 h-14",
    3: "w-16 h-16",
    4: "w-20 h-20",
  };

  const textSizeClasses: Record<number, string> = {
    1: "text-sm",
    2: "text-base",
    3: "text-lg",
    4: "text-xl",
  };

  const sizeClass = dotSizeClasses[dotSize] || "w-12 h-12";
  const textSizeClass = textSizeClasses[dotSize] || "text-[10px]";

  // Flatten sensorGroups to a single array of sensors
  const sensors: Sensor[] = propsSensorGroups ? propsSensorGroups.flat() : [];

  // Calculate pagination
  const totalPages = Math.ceil(sensors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSensors = sensors.slice(startIndex, endIndex);

  // Determine status color code for sorting/display if needed, but mainly we just iterate.

  const handleSensorClick = (sensorId: string) => {
    router.push(`/sensors/${sensorId}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (sensors.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <p>No sensors available</p>
      </div>
    );
  }

  // Helper to render a single sensor node
  const renderSensorNode = (sensor: Sensor) => {
    const role = (sensor.sensor_type || "Satellite").toLowerCase();
    const isMaster = role === "master";

    // Get temperature value
    const temperature = sensor.last_data?.temperature || 0;

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

    // Map dotSize to pixel values for Circle font size
    const circleFontSizeMap: Record<number, string> = {
      1: "16px",
      2: "19px",
      3: "23px",
      4: "28px",
    };

    return (
      <Tooltip key={sensor.id}>
        <TooltipTrigger asChild>
          <div
            className={`${sizeClass} cursor-pointer hover:opacity-80 transition-all duration-500 relative`}
            onClick={() => handleSensorClick(sensor.id)}
          >
            {isMaster ? (
              // Master: Bread Loaf shape (Hexagon-ish/Helmet)
              <div
                className={`${sizeClass} flex flex-col items-center justify-center overflow-hidden`}
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
                    fill="#000"
                    fontSize="35"
                    fontWeight="bold"
                    fontFamily="'Inter', sans-serif"
                    className="select-none"
                  >
                    {Math.round(temperature)}°
                  </text>
                </svg>
              </div>
            ) : (
              // Satellite: Circle Shape
              <div
                className="w-full h-full rounded-full flex flex-col items-center justify-center overflow-hidden relative"
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
                    className="font-bold text-gray-900 leading-none"
                    style={{ fontSize: circleFontSizeMap[dotSize] || "18px" }}
                  >
                    {Math.round(temperature)}°
                  </span>
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-[#0B1121] border-[1.35px] border-[#374151] text-white"
        >
          <div className="space-y-1 text-xs">
            <div className="font-semibold">
              {sensor.name || sensor.sensor_name || "Unknown Sensor"}
            </div>
            <div className="text-gray-400">
              {sensor.model || `Model-${sensor.id.substring(0, 8)}`}
            </div>
            <div className="text-gray-400">
              {sensor.machineName || "Unknown Machine"}:{" "}
              {isMaster ? "Master" : "Satellite"}
            </div>
            <div className="flex items-center space-x-2">
              <span>Temp: {temperature.toFixed(0)}°C</span>
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
                  className={`w-1 h-1 rounded-full ${parseFloat(sensor.h_stats?.velocityTopPeak || "0") > 0
                      ? "bg-green-500"
                      : "bg-gray-500"
                    }`}
                />
                <div
                  className={`w-1 h-1 rounded-full ${parseFloat(sensor.v_stats?.velocityTopPeak || "0") > 0
                      ? "bg-green-500"
                      : "bg-gray-500"
                    }`}
                />
                <div
                  className={`w-1 h-1 rounded-full ${parseFloat(sensor.a_stats?.velocityTopPeak || "0") > 0
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
  };

  return (
    <div className="w-full transition-all duration-300">
      <TooltipProvider>
        {/* Simple Flex Layout (Removed grouping and frames) */}
        <div className="flex flex-wrap gap-2">
          {currentSensors.map((sensor) => renderSensorNode(sensor))}
        </div>

        {/* Pagination */}
        <div className="mt-8">
          <SensorPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
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
