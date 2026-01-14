"use client";

import { useState, useEffect, useCallback } from "react";
import {
  NotificationHistoryTable,
  NotificationEntry,
} from "@/components/history/NotificationHistoryTable";
import { getNotificationLogs } from "@/lib/data/notifications";
import type { NotificationLog } from "@/lib/types";
import {
  getVibrationLevelFromConfig,
  VibrationLevel,
} from "@/lib/utils/vibrationUtils";

export default function NotificationHistoryPage() {
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from /notification-logs API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch data from the new endpoint
      const response = await getNotificationLogs({ limit: 10000 });

      // Transform NotificationLog to NotificationEntry format
      const notificationEntries: NotificationEntry[] = response.data.map(
        (log: NotificationLog) => {
          // 1. Recalculate true status using thresholds and axis values
          const hVal = log.h_vrms || 0;
          const vVal = log.v_vrms || 0;
          const aVal = log.a_vrms || 0;

          // Prepare config for threshold utility
          const config = {
            thresholdMin: log.threshold_min ?? 2.0,
            thresholdMedium: log.threshold_medium ?? 2.5,
            thresholdMax: log.threshold_max ?? 3.0,
          };

          const hStatus = getVibrationLevelFromConfig(hVal, config);
          const vStatus = getVibrationLevelFromConfig(vVal, config);
          const aStatus = getVibrationLevelFromConfig(aVal, config);

          // Determine worst status among axes
          let calculatedLevel: VibrationLevel = "normal";
          const levels = [hStatus, vStatus, aStatus];

          if (levels.includes("critical")) {
            calculatedLevel = "critical";
          } else if (levels.includes("concern")) {
            calculatedLevel = "concern";
          } else if (levels.includes("warning")) {
            calculatedLevel = "warning";
          }

          // Status mapping (Component expects Title Case)
          const statusMap: Record<VibrationLevel, NotificationEntry["status"]> =
            {
              critical: "Critical",
              concern: "Concern",
              warning: "Warning",
              normal: "Normal",
            };

          const finalStatus = statusMap[calculatedLevel];

          // Format datetime from log
          const dateObj = new Date(log.datetime);
          const datetime = dateObj
            .toLocaleString("en-GB", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
            .replace(",", " |");

          return {
            id: log.id,
            sensorName: log.sensor_name || "-",
            area: log.area || "-",
            machine: log.machine || "-",
            status: finalStatus,
            datetime,
            timestamp: dateObj.getTime(),
            hVrms: log.h_vrms,
            vVrms: log.v_vrms,
            aVrms: log.a_vrms,
            hColor: log.h_vrms_color,
            vColor: log.v_vrms_color,
            aColor: log.a_vrms_color,
            temperature: log.temperature
              ? `${log.temperature.toFixed(0)}°C`
              : null,
            battery: log.battery ? `${Math.round(log.battery)}%` : null,
            config: {
              thresholdMin: config.thresholdMin,
              thresholdMedium: config.thresholdMedium,
              thresholdMax: config.thresholdMax,
            },
          };
        }
      );

      // Sort by timestamp descending (Latest First) as requested
      const sortedEntries = notificationEntries.sort(
        (a, b) => b.timestamp - a.timestamp
      );

      setEntries(sortedEntries);
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

  return (
    <div className="p-6 space-y-6 bg-[#0B1121] min-h-screen">
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
