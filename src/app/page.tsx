"use client";

import {
  Suspense,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import SensorGrid from "@/components/sensors/SensorGrid";
import SensorPagination from "@/components/sensors/SensorPagination";
import SensorListView from "@/components/sensors/SensorListView";
import SensorDotView from "@/components/sensors/SensorDotView";
import { ViewMode } from "@/components/sensors/ViewSelector";
import SensorFilters from "@/components/sensors/SensorFilters";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { getSensors } from "@/lib/data/sensors";
import SensorStatusSummary, {
  type SensorStatusType,
} from "@/components/Dashboard/SensorStatusSummary";
import {
  getCardBackgroundColor,
  SensorConfig,
} from "@/lib/utils/vibrationUtils";
import DeviceToolbar from "@/components/sensors/DeviceToolbar";
import type { Sensor } from "@/lib/types";
import { useFolderTreeFilter } from "@/components/auth/AuthWrapper";

export default function SensorsPage() {
  const { selectedIds, selectedSensors } = useFolderTreeFilter();
  // Pagination state for card view
  const [cardPage, setCardPage] = useState(1);
  const [currentView, setCurrentView] = useState<ViewMode>("grid");
  const [dotSize, setDotSize] = useState<number>(1); // Add dotSize state
  const [searchQuery, setSearchQuery] = useState(""); // Add search state
  const [selectedStatuses, setSelectedStatuses] = useState<SensorStatusType[]>(
    []
  );
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitiallyLoaded = useRef(false);
  const router = useRouter();
  const [sensorStatusData, setSensorStatusData] = useState<{
    total: number;
    lastUpdate: string;
    status: {
      normal: number;
      warning: number;
      concern: number;
      critical: number;
      standby: number;
      lost: number;
    };
  }>({
    total: 0,
    lastUpdate: new Date().toISOString(),
    status: {
      normal: 0,
      warning: 0,
      concern: 0,
      critical: 0,
      standby: 0,
      lost: 0,
    },
  });

  const updateSensorStatusData = useCallback((sensorList: Sensor[]) => {
    // Count sensors by status - each sensor counted in ONE status only
    // Priority: Lost > Critical > Warning > Standby > Normal
    const statusCounts = {
      normal: 0,
      warning: 0,
      concern: 0, // Same as warning (kept for compatibility)
      critical: 0,
      standby: 0,
      lost: 0,
    };

    sensorList.forEach((sensor) => {
      // Determine single status per sensor based on priority
      // Logic matches SensorCard.tsx

      // 1. Check connectivity/operational status first
      if (
        sensor.connectivity === "offline" &&
        sensor.operationalStatus !== "standby"
      ) {
        statusCounts.lost++;
        return;
      }

      if (sensor.operationalStatus === "standby") {
        statusCounts.standby++;
        return;
      }

      // 2. Calculate Max RMS and determine status color
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
        thresholdMax: sensor.threshold_max
          ? Number(sensor.threshold_max)
          : 0.15,
        machineClass: sensor.machine_class || undefined,
      };

      const colorClass = getCardBackgroundColor(maxRms, sensorConfig);

      // 3. Map color class to status
      if (colorClass.includes("bg-[#ff0000]")) {
        statusCounts.critical++;
      } else if (colorClass.includes("bg-[#ff6600]")) {
        statusCounts.concern++;
        // statusCounts.warning++; // Optional: if you want concern to also count as warning
      } else if (colorClass.includes("bg-[#fae739]")) {
        statusCounts.warning++;
      } else {
        statusCounts.normal++;
      }
    });

    setSensorStatusData({
      total: sensorList.length,
      lastUpdate: new Date().toISOString(),
      status: statusCounts,
    });
  }, []);

  const fetchSensors = useCallback(async () => {
    try {
      setLoading(true);
      const { sensors: fetchedSensors } = await getSensors({ limit: 10000 });
      // Use only real sensors from API
      setSensors(fetchedSensors);
      updateSensorStatusData(fetchedSensors);
    } catch (error) {
      console.error("Error fetching sensors:", error);
    } finally {
      setLoading(false);
    }
  }, [updateSensorStatusData]);

  const updateSensorData = useCallback(async () => {
    try {
      await fetchSensors();
      if (window.refreshSensorData) {
        await window.refreshSensorData();
      }
    } finally {
    }
  }, [fetchSensors]);

  const handleViewChange = useCallback((view: ViewMode) => {
    setCurrentView(view);
  }, []);

  useEffect(() => {
    if (!hasInitiallyLoaded.current) {
      fetchSensors();
      hasInitiallyLoaded.current = true;
    }
  }, [fetchSensors]);

  // Refresh data immediately when folder selection changes
  useEffect(() => {
    if (hasInitiallyLoaded.current) {
      fetchSensors();
    }
  }, [selectedIds, fetchSensors]);

  useEffect(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }
    if (hasInitiallyLoaded.current) {
      autoRefreshIntervalRef.current = setInterval(() => {
        updateSensorData();
      }, 60000);
    }
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [updateSensorData]);

  // Filter sensors based on selected statuses and search query
  const filteredSensors = useMemo(() => {
    let result: Sensor[] = [];

    if (selectedIds && selectedIds.length > 0) {
      const selectedSensorIds = new Set(selectedSensors.map((s) => s.id));
      result = sensors.filter((s) => selectedSensorIds.has(s.id));
    }

    // Filter by search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          (s.serialNumber &&
            s.serialNumber.toLowerCase().includes(lowerQuery)) ||
          (s.name && s.name.toLowerCase().includes(lowerQuery)) ||
          (s.machineName && s.machineName.toLowerCase().includes(lowerQuery)) ||
          (s.sensor_name && s.sensor_name.toLowerCase().includes(lowerQuery))
      );
    }

    // Filter by status
    if (selectedStatuses.length > 0) {
      result = result.filter((sensor) => {
        // Calculate status dynamically to match SensorCard and Summary
        let calculatedStatus = "normal";

        if (
          sensor.connectivity === "offline" &&
          sensor.operationalStatus !== "standby"
        ) {
          calculatedStatus = "lost";
        } else if (sensor.operationalStatus === "standby") {
          calculatedStatus = "standby";
        } else {
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

          if (colorClass.includes("bg-[#ff0000]"))
            calculatedStatus = "critical";
          else if (colorClass.includes("bg-[#ff6600]"))
            calculatedStatus = "concern";
          else if (colorClass.includes("bg-[#fae739]"))
            calculatedStatus = "warning";
          else calculatedStatus = "normal";
        }

        // Check if calculated status is in selected statuses
        if (
          selectedStatuses.includes("normal") &&
          calculatedStatus === "normal"
        )
          return true;
        if (
          selectedStatuses.includes("warning") &&
          calculatedStatus === "warning"
        )
          return true;
        if (
          selectedStatuses.includes("concern") &&
          calculatedStatus === "concern"
        )
          return true;
        if (
          selectedStatuses.includes("critical") &&
          calculatedStatus === "critical"
        )
          return true;
        if (
          selectedStatuses.includes("standby") &&
          calculatedStatus === "standby"
        )
          return true;
        if (selectedStatuses.includes("lost") && calculatedStatus === "lost")
          return true;

        return false;
      });
    }

    return result;
  }, [sensors, selectedStatuses, searchQuery, selectedIds, selectedSensors]);

  // Group sensors for different views
  const sensorGroups = useMemo(() => {
    if (currentView === "grid") {
      // For grid view: 5 sensors per group (for 5 columns)
      const groupSize = 5;
      const groups: Sensor[][] = [];
      for (let i = 0; i < filteredSensors.length; i += groupSize) {
        groups.push(filteredSensors.slice(i, i + groupSize));
      }
      // Pagination for card view: 8 rows per page (40 cards)
      const start = (cardPage - 1) * 8;
      const pagedGroups = groups.slice(start, start + 8); // 8 rows per page
      return pagedGroups;
    } else if (currentView === "list") {
      const maxColumns = 3;
      if (filteredSensors.length === 0) return [];
      const groupedByMachineClass = new Map<string, Sensor[]>();
      filteredSensors.forEach((sensor) => {
        const machineClass = sensor.machine_class || "Unknown";
        if (!groupedByMachineClass.has(machineClass)) {
          groupedByMachineClass.set(machineClass, []);
        }
        groupedByMachineClass.get(machineClass)!.push(sensor);
      });
      const groups: Sensor[][] = Array.from(
        groupedByMachineClass.values()
      ).slice(0, maxColumns);
      return groups;
    } else {
      return filteredSensors.length > 0 ? [filteredSensors] : [];
    }
  }, [filteredSensors, currentView, cardPage]);

  // Total pages for card view
  const totalCardPages = useMemo(() => {
    if (currentView !== "grid") return 1;
    const groupSize = 5;
    const totalRows = Math.ceil(filteredSensors.length / groupSize);
    return Math.max(1, Math.ceil(totalRows / 8)); // 8 rows (40 cards) per page
  }, [filteredSensors, currentView]);

  const renderCurrentView = () => {
    if (loading) {
      return <LoadingSkeleton />;
    }
    switch (currentView) {
      case "grid":
        return (
          <div className="bg-[#1F2937] text-white rounded-2xl shadow border border-gray-700 p-4 mx-auto w-full transition-all duration-300">
            <SensorGrid sensorGroups={sensorGroups} />
            {/* Pagination for card view */}
            <SensorPagination
              currentPage={cardPage}
              totalPages={totalCardPages}
              onPageChange={(page) => {
                setCardPage(page);
                // Scroll to top of card view on page change
                const cardView = document.querySelector(
                  ".bg-white.rounded-2xl.shadow.border.border-gray-200"
                );
                if (cardView) {
                  cardView.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
            />
          </div>
        );
      case "list":
        return <SensorListView sensorGroups={sensorGroups} />;
      case "dot":
        return (
          <div className="bg-[#1F2937] text-white rounded-2xl shadow border border-gray-700 p-4 mx-auto w-full transition-all duration-300">
            <SensorDotView sensorGroups={sensorGroups} dotSize={dotSize} />
          </div>
        );
      default:
        return <SensorGrid sensorGroups={sensorGroups} />;
    }
  };

  return (
    <div className="space-y-3 bg-gray-900 min-h-screen">
      {/* Sensor Status Summary with Quick Filter */}
      <div className="bg-[#1F2937] text-white rounded-2xl shadow border border-gray-700 p-4 mx-auto w-full transition-all duration-300">
        <SensorStatusSummary
          data={sensorStatusData}
          selectedStatuses={selectedStatuses}
          onStatusFilterChange={setSelectedStatuses}
        />
      </div>

      {/* Device Toolbar */}
      <div className="bg-[#1F2937] text-white rounded-2xl shadow border border-gray-700 p-4 mx-auto w-full transition-all duration-300">
        <DeviceToolbar
          currentView={currentView}
          onViewChange={handleViewChange}
          onRegisterClick={() => router.push("/register")}
          onDotSizeChange={setDotSize}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Only show Filters and Grid if any item is selected */}
      {selectedIds && selectedIds.length > 0 && (
        <>
          {/* Filters */}
          <SensorFilters />

          {/* Sensor Views */}
          <Suspense fallback={<LoadingSkeleton />}>
            {renderCurrentView()}
          </Suspense>
        </>
      )}
    </div>
  );
}
