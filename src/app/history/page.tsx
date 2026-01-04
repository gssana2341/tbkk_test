"use client";

import { useState, useEffect, useCallback } from "react";
import {
  NotificationHistoryTable,
  NotificationEntry,
} from "@/components/history/NotificationHistoryTable";
import { getSensors } from "@/lib/data/sensors";
import type { Sensor } from "@/lib/types";
import {
  getVibrationLevelFromConfig,
  SensorConfig,
} from "@/lib/utils/vibrationUtils";

export default function NotificationHistoryPage() {
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch sensors from API and filter for warning/concern/critical status
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { sensors } = await getSensors({ limit: 10000 });

      // Transform Sensor data to NotificationEntry format AND filter simultaneously
      const notificationEntries: NotificationEntry[] = [];

      sensors.forEach((sensor: Sensor) => {
        // Recalculate status using standard utility logic (handles 0 thresholds correctly)
        // We check all axes
        const hVal = sensor.last_data?.velo_rms_h || 0;
        const vVal = sensor.last_data?.velo_rms_v || 0;
        const aVal = sensor.last_data?.velo_rms_a || 0;

        // Cast to SensorConfig to ensure compatibility
        const config = sensor as unknown as SensorConfig;

        const hStatus = getVibrationLevelFromConfig(hVal, config);
        const vStatus = getVibrationLevelFromConfig(vVal, config);
        const aStatus = getVibrationLevelFromConfig(aVal, config);

        // Determine worst status
        let finalStatus: NotificationEntry["status"] = "Normal";
        const statuses = [hStatus, vStatus, aStatus];

        if (statuses.includes("critical")) {
          finalStatus = "Critical"; // Red
        } else if (statuses.includes("concern")) {
          finalStatus = "Concern"; // Orange
        } else if (statuses.includes("warning")) {
          finalStatus = "Warning"; // Yellow
        }

        // Filter: Only add if status is NOT Normal
        if (finalStatus !== "Normal") {
          // Format datetime from last_data
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
              .replace(",", " |")
            : "-";

          notificationEntries.push({
            id: sensor.id,
            sensorName: sensor.serialNumber || sensor.name,
            area: sensor.installation_point || "-",
            machine: sensor.machine_number || "-",
            status: finalStatus,
            datetime,
            timestamp: sensor.last_data?.datetime ? new Date(sensor.last_data.datetime).getTime() : 0,
            hVrms: sensor.last_data?.velo_rms_h ?? null,
            vVrms: sensor.last_data?.velo_rms_v ?? null,
            aVrms: sensor.last_data?.velo_rms_a ?? null,
            temperature: sensor.last_data?.temperature
              ? `${sensor.last_data.temperature.toFixed(0)}°C`
              : null,
            battery: sensor.last_data?.battery
              ? `${Math.round(sensor.last_data.battery)}%`
              : null,
            config: {
              thresholdMin: Number(config.thresholdMin ?? config.threshold_min ?? 2.0),
              thresholdMedium: Number(config.thresholdMedium ?? config.threshold_medium ?? 2.5),
              thresholdMax: Number(config.thresholdMax ?? config.threshold_max ?? 3.0),
            },
          });
        }
      });

      setEntries(notificationEntries);
    } catch (error) {
      console.error("Error fetching notification history:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ...existing code...

  return (
    <div className="p-6 space-y-6 bg-[#030616] min-h-screen">
      <div className="flex items-center justify-between">
        <div></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-gray-500">
          Loading notifications...
        </div>
      ) : (
        <NotificationHistoryTable entries={entries} />
      )}
    </div>
  );
}
