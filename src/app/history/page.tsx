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
  // State for data and pagination
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uiPage, setUiPage] = useState(1); // UI Current Page (Items per page = 20)
  const [loadedApiPages, setLoadedApiPages] = useState(0); // How many API pages (Limit 100) we have fetched
  const [totalApiPages, setTotalApiPages] = useState(1); // Total available API pages
  const [serverTotalItems, setServerTotalItems] = useState(0); // For correct pagination calculation

  const transformLogs = (logs: NotificationLog[]): NotificationEntry[] => {
    return logs.map((log: NotificationLog) => {
      const apiStatus = log.status?.toLowerCase() || "normal";
      const statusMap: Record<string, NotificationEntry["status"]> = {
        critical: "Critical",
        concern: "Concern",
        warning: "Warning",
        normal: "Normal",
        standby: "Standby",
        lost: "Lost",
      };
      const finalStatus = statusMap[apiStatus] || "Normal";

      const dateObj = new Date(log.created_at);
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
        temperature: log.temperature ? `${log.temperature.toFixed(0)}°C` : null,
        battery: log.battery ? `${Math.round(log.battery)}%` : null,
        config: {
          thresholdMin: log.threshold_min ?? 2.0,
          thresholdMedium: log.threshold_medium ?? 2.5,
          thresholdMax: log.threshold_max ?? 3.0,
        },
      };
    });
  };

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const INITIAL_BATCH_SIZE = 1; // Fetch first 1 API page (100 items)
      let allLogs: NotificationLog[] = [];
      let maxPages = 1;

      // 1. Fetch first batch
      for (let i = 1; i <= INITIAL_BATCH_SIZE; i++) {
        const response = await getNotificationLogs({
          limit: 100,
          page: i,
        });

        if (response.data && response.data.length > 0) {
          allLogs = [...allLogs, ...response.data];
        } else {
          // If no data returned, stop fetching
          break;
        }

        if (i === 1) {
          maxPages = response.total_pages || 1;
        }

        // Output early break if we reached max pages
        if (i >= maxPages) break;
      }

      setLoadedApiPages(Math.min(INITIAL_BATCH_SIZE, maxPages));
      setTotalApiPages(maxPages);
      // Estimate total items based on total pages (API might not return total_count, so we estimate)
      // If API returns total_pages, assume ~100 per page
      setServerTotalItems(maxPages * 100);

      // 2. Transform and Set
      const newEntries = transformLogs(allLogs);
      // Sort (Latest First) - Client side sort for loaded data
      newEntries.sort((a, b) => b.timestamp - a.timestamp);

      setEntries(newEntries);
    } catch (error) {
      console.error("Error fetching initial history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePageChange = async (newPage: number) => {
    setUiPage(newPage);

    // Check if we need more data
    // UI Page 1-5 (Items 0-100) -> API Page 1
    // UI Page 26 (Items 500-520) -> API Page 6
    const itemsNeededIndex = newPage * 20;
    const currentItemsCount = entries.length;

    if (
      itemsNeededIndex > currentItemsCount &&
      loadedApiPages < totalApiPages
    ) {
      // We need to fetch next API page
      const nextApiPage = loadedApiPages + 1;

      try {
        // Show mini loading? Or just fetch in background.
        // For UX, maybe keep old data visibly but disable interaction?
        // For now, allow async append.

        const response = await getNotificationLogs({
          limit: 100,
          page: nextApiPage,
        });

        if (response.data) {
          const newLogs = transformLogs(response.data);
          setEntries((prev) => {
            const updated = [...prev, ...newLogs];
            updated.sort((a, b) => b.timestamp - a.timestamp);
            return updated;
          });
          setLoadedApiPages(nextApiPage);
        }
      } catch (error) {
        console.error("Error fetching more data:", error);
      }
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
        <NotificationHistoryTable
          entries={entries}
          currentPage={uiPage}
          onPageChange={handlePageChange}
          totalServerItems={serverTotalItems}
        />
      )}
    </div>
  );
}
