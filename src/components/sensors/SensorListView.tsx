"use client";

import type React from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Sensor } from "@/lib/types";

interface SensorListViewProps {
  sensorGroups?: Sensor[][];
}

export default function SensorListView({
  sensorGroups: propsSensorGroups,
}: SensorListViewProps) {
  const router = useRouter();

  // Use sensorGroups from props, or empty array if not provided
  const sensorGroups: Sensor[][] = Array.isArray(propsSensorGroups)
    ? propsSensorGroups
    : [];

  // Calculate number of columns based on number of groups
  // 1 group = 1 column (full width), 2 groups = 2 columns, 3+ groups = 3 columns (max)
  const gridCols = useMemo(() => {
    const groupCount = sensorGroups.length;
    if (groupCount === 0) return 1;
    if (groupCount === 1) return 1;
    if (groupCount === 2) return 2;
    return 3; // Max 3 columns
  }, [sensorGroups.length]);

  const handleSensorClick = (sensorId: string) => {
    router.push(`/sensors/${sensorId}`);
  };

  if (sensorGroups.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <p>No sensors available</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div
        className={`grid gap-4 ${gridCols === 1 ? "grid-cols-1" : gridCols === 2 ? "grid-cols-2" : "grid-cols-3"}`}
      >
        {sensorGroups.map((group, idx) => {
          // Get machine_class from first sensor in group (all sensors in group should have same machine_class)
          const machineClass = group[0]?.machine_class || "Unknown";
          const machineClassLabel =
            machineClass.charAt(0).toUpperCase() + machineClass.slice(1);

          return (
            <div key={idx} className="space-y-0">
              <div className="flex items-center px-2 py-0.5 bg-gray-800 rounded text-xs font-semibold text-gray-300">
                <div className="flex-1">
                  <span className="text-gray-400">Machine Class: </span>
                  <span className="text-white">{machineClassLabel}</span>
                </div>
              </div>
              <div className="flex items-center px-2 py-0.5 bg-gray-800 rounded text-xs font-semibold text-gray-300 mt-1">
                <div className="flex-1">Sensor Name</div>
                <div className="w-12 text-center">Status</div>
                <div className="w-16 text-center">H</div>
                <div className="w-16 text-center">V</div>
                <div className="w-16 text-center">A</div>
                <div className="w-20 text-center">Temp</div>
              </div>
              <div className="space-y-0">
                {group.map((sensor) => {
                  const currentTemp = sensor.last_data?.temperature || 0;
                  const hVelocity = sensor.h_stats?.velocityTopPeak || "0.000";
                  const vVelocity = sensor.v_stats?.velocityTopPeak || "0.000";
                  const aVelocity = sensor.a_stats?.velocityTopPeak || "0.000";

                  // Get status color based on velocity values
                  const getStatusColor = (velocity: string) => {
                    if (sensor.status === "lost") return "bg-[#404040]";
                    const vel = parseFloat(velocity);
                    if (vel === 0) return "bg-gray-600";
                    // Use sensor thresholds if available
                    const thresholdMin = sensor.threshold_min || 0.1;
                    const thresholdMedium = sensor.threshold_medium || 0.125;
                    const thresholdMax = sensor.threshold_max || 0.15;

                    if (vel >= thresholdMax) return "bg-red-600";
                    if (vel >= thresholdMedium) return "bg-yellow-600";
                    if (vel >= thresholdMin) return "bg-orange-600";
                    return "bg-green-600";
                  };

                  const sensorName =
                    sensor.name || sensor.sensor_name || "Unknown";

                  return (
                    <div
                      key={sensor.id}
                      className="flex items-center px-2 py-1 hover:bg-gray-800 cursor-pointer border-b border-gray-700"
                      onClick={() => handleSensorClick(sensor.id)}
                    >
                      <div
                        className={`flex-1 text-sm ${sensor.status === "lost" ? "text-[#404040]" : ""}`}
                      >
                        {sensorName.length > 11
                          ? sensorName.slice(0, 11) + "..."
                          : sensorName}
                      </div>
                      <div className="w-12 flex justify-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${sensor.status === "lost" ? "bg-[#404040]" : sensor.status === "standby" ? "bg-[#f8f8f8] text-black" : "bg-gray-600"} text-white`}
                        >
                          {sensor.status ||
                            sensor.operationalStatus ||
                            "standby"}
                        </span>
                      </div>
                      <div className="w-16 flex justify-center">
                        <div
                          className={`w-1 h-2 ${getStatusColor(hVelocity)} rounded-full border border-gray-600 flex items-center justify-center`}
                          title={`H: ${hVelocity} mm/s`}
                        >
                          {sensor.status === "lost" && (
                            <span className="text-[6px] text-white">-</span>
                          )}
                        </div>
                      </div>
                      <div className="w-16 flex justify-center">
                        <div
                          className={`w-1 h-2 ${getStatusColor(vVelocity)} rounded-full border border-gray-600 flex items-center justify-center`}
                          title={`V: ${vVelocity} mm/s`}
                        >
                          {sensor.status === "lost" && (
                            <span className="text-[6px] text-white">-</span>
                          )}
                        </div>
                      </div>
                      <div className="w-16 flex justify-center">
                        <div
                          className={`w-1 h-2 ${getStatusColor(aVelocity)} rounded-full border border-gray-600 flex items-center justify-center`}
                          title={`A: ${aVelocity} mm/s`}
                        >
                          {sensor.status === "lost" && (
                            <span className="text-[6px] text-white">-</span>
                          )}
                        </div>
                      </div>
                      <div className="w-20 flex justify-center">
                        <span
                          className={`font-semibold text-xs ${sensor.status === "lost" ? "text-[#404040]" : "text-gray-300"}`}
                        >
                          {sensor.status === "lost"
                            ? "-"
                            : currentTemp > 0
                              ? currentTemp.toFixed(0)
                              : "0"}{" "}
                          {sensor.status !== "lost" && "°C"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    refreshSensorData?: () => void;
  }
}
