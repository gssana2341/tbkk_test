"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { exportToCSV, exportToExcel } from "@/lib/exportUtils";
import { MoreHorizontal, ArrowLeft, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSignalStrengthLabel, getSignalStrength, cn } from "@/lib/utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface HistoryItem {
  datetime: string;
  // Acceleration G
  g_rms_h: number;
  g_rms_v: number;
  g_rms_a: number;
  // Acceleration mm/s^2
  a_rms_h: number;
  a_rms_v: number;
  a_rms_a: number;
  // Velocity mm/s
  velo_rms_h: number;
  velo_rms_v: number;
  velo_rms_a: number;
  // New fields
  rssi?: number;
  battery?: number;
  temperature?: number;
  status?: string;
}

// Thresholds
const THRESHOLDS = {
  GREEN_LIMIT: 1.4,
  YELLOW_LIMIT: 2.8,
  RED_START: 4.5,
};

// Global inflight promise for deduplication
const historyInflight = new Map<string, Promise<any>>();

export default function SensorHistoryPage() {
  const router = useRouter();
  const params = useParams() as { id: string };
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sensorName, setSensorName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<any>(null);
  const [selectedDataIndex, setSelectedDataIndex] = useState<number | null>(
    null
  );
  const [isChartReady, setIsChartReady] = useState(false);

  // Filters
  const [selectedAxis, setSelectedAxis] = useState<"all" | "h" | "v" | "a">(
    "all"
  );
  // Helper to get local date string YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedUnit, setSelectedUnit] = useState("Velocity (mm/s)");
  const [dateStart, setDateStart] = useState(getTodayString());
  const [dateEnd, setDateEnd] = useState(getTodayString());

  useEffect(() => {
    setSelectedDataIndex(null);
  }, [dateStart, dateEnd, selectedAxis, selectedUnit, params.id]);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("auth_token");
        let url = `/api/sensors/${params.id}/history`;
        // Optimization: Reduce limit from 1,000,000 to 5,000 points.
        // ECharts can handle 5k points smoothly, and more points than pixels (approx 2000px width)
        // adds little value without server-side aggregation.
        const queryParams = [`limit=5000`];

        if (dateStart && dateEnd) {
          const dStart = new Date(dateStart);
          // Convert to Seconds (Unix Timestamp) to fit Backend i32/Target Type
          queryParams.push(`start_date=${Math.floor(dStart.getTime() / 1000)}`);

          // Adjust end_date to be inclusive by fetching until the next day.
          const dEnd = new Date(dateEnd);
          dEnd.setDate(dEnd.getDate() + 1);
          queryParams.push(`end_date=${Math.floor(dEnd.getTime() / 1000)}`);
        }
        if (queryParams.length > 0) {
          url += `?${queryParams.join("&")}`;
        }

        console.log("Fetching History from:", url);

        // Deduplicate simultaneous requests
        if (historyInflight.has(url)) {
          const data = await historyInflight.get(url);
          processHistoryData(data);
          return;
        }

        const fetchPromise = (async () => {
          const response = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error Body:", errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
          }

          return await response.json();
        })();

        historyInflight.set(url, fetchPromise);
        try {
          const data = await fetchPromise;
          processHistoryData(data);
        } finally {
          // Clear after small delay to catch simultaneous bursts
          setTimeout(() => {
            historyInflight.delete(url);
          }, 500);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to fetch sensor history");
      } finally {
        setLoading(false);
      }
    }

    function processHistoryData(data: any) {
      console.log("History API Full Response:", data);

      // Fetch sensor name if available
      const sensorDataRoot = data.data || data;
      if (sensorDataRoot.name || sensorDataRoot.sensor_name) {
        setSensorName(sensorDataRoot.sensor_name || sensorDataRoot.name);
      }

      let historyData = [];

      // 1. Check if the response itself is an array
      if (Array.isArray(data)) {
        historyData = data;
      }
      // 2. Check for 'history' property (based on Step 0 example)
      else if (data && Array.isArray(data.history)) {
        historyData = data.history;
      }
      // 3. Check for 'data' wrap
      else if (data && data.data) {
        if (Array.isArray(data.data)) {
          historyData = data.data;
        } else if (Array.isArray(data.data.history)) {
          historyData = data.data.history;
        }
      }

      const mappedHistory: HistoryItem[] = historyData.map((item: any) => ({
        datetime: item.datetime,
        g_rms_h: item.g_rms_h || 0,
        g_rms_v: item.g_rms_v || 0,
        g_rms_a: item.g_rms_a || 0,
        a_rms_h: item.a_rms_h || 0,
        a_rms_v: item.a_rms_v || 0,
        a_rms_a: item.a_rms_a || 0,
        velo_rms_h: item.velo_rms_h || 0,
        velo_rms_v: item.velo_rms_v || 0,
        velo_rms_a: item.velo_rms_a || 0,
        rssi: item.rssi || 0,
        battery: item.battery || 0,
        temperature: item.temperature || 0,
        status: item.status || "",
      }));

      // Client-side filtering as safety net to ensure only selected date range is shown
      // This handles cases where API might return slightly wider range or fallback
      const filteredHistory = mappedHistory.filter((item) => {
        // Parse item date
        const rawString = item.datetime.endsWith("Z")
          ? item.datetime.slice(0, -1)
          : item.datetime;
        const itemDate = new Date(rawString);

        const year = itemDate.getFullYear();
        const month = String(itemDate.getMonth() + 1).padStart(2, "0");
        const day = String(itemDate.getDate()).padStart(2, "0");
        const itemDateStr = `${year}-${month}-${day}`;

        let isValid = true;
        if (dateStart && itemDateStr < dateStart) isValid = false;
        if (dateEnd && itemDateStr > dateEnd) isValid = false;

        return isValid;
      });

      // Sort Data (Oldest to Latest usually preferred for charts, but existing code had logic)
      // Ensure consistent time-based sort
      setHistory(
        filteredHistory.sort((a, b) => {
          const timeA = new Date(a.datetime).getTime();
          const timeB = new Date(b.datetime).getTime();
          return timeA - timeB;
        })
      );
    }
    fetchHistory();
  }, [params.id, dateStart, dateEnd]);

  useEffect(() => {
    const chartInstance = chartRef.current;
    if (!chartInstance) return;

    const handleZrClick = (params: any) => {
      const pointInPixel = [params.offsetX, params.offsetY];

      try {
        // Multi-grid robust conversion: try all 4 grids (indices 0-3)
        let xIndex = -1;
        for (let i = 0; i < 4; i++) {
          const result = chartInstance.convertFromPixel(
            { xAxisIndex: i },
            pointInPixel
          );
          if (result && result[0] !== undefined && !isNaN(result[0])) {
            const tempIndex = Math.round(result[0]);
            if (tempIndex >= 0 && tempIndex < history.length) {
              xIndex = tempIndex;
              break;
            }
          }
        }

        if (xIndex !== -1) {
          setSelectedDataIndex(xIndex);
        }
      } catch (e) {
        console.error("Coordinate conversion failed:", e);
      }
    };

    const zr = chartInstance.getZr();
    zr.on("click", handleZrClick);

    return () => {
      zr.off("click", handleZrClick);
    };
  }, [history, isChartReady]);

  const chartOption = useMemo(() => {
    if (!history.length) return null;

    const labels = history.map((h) => {
      const rawString = h.datetime.endsWith("Z")
        ? h.datetime.slice(0, -1)
        : h.datetime;
      const d = new Date(rawString);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    });

    const getVal = (item: HistoryItem, axis: "h" | "v" | "a") => {
      if (selectedUnit === "Acceleration RMS (G)")
        return axis === "h"
          ? item.g_rms_h
          : axis === "v"
            ? item.g_rms_v
            : item.g_rms_a;
      if (selectedUnit === "Acceleration(mm/s²)")
        return axis === "h"
          ? item.a_rms_h
          : axis === "v"
            ? item.a_rms_v
            : item.a_rms_a;
      return axis === "h"
        ? item.velo_rms_h
        : axis === "v"
          ? item.velo_rms_v
          : item.velo_rms_a;
    };

    const series: any[] = [];
    const isSatellite = sensorName.toLowerCase().includes("satellite");
    const signalName = isSatellite
      ? "Bluetooth Signal Strength"
      : "Wifi Signal Strength";

    // --- Sub-Graph 0: WIFI (RSSI) ---
    series.push({
      name: `${signalName} (Levels)`,
      type: "line",
      xAxisIndex: 0,
      yAxisIndex: 0,
      // Change back to simple array of levels to match categories
      data: history.map((h) =>
        h.status === "lost" ? null : getSignalStrength(h.rssi || 0)
      ),
      color: "#00E5FF",
      symbol: "circle",
      symbolSize: 4,
      showSymbol: true,
      sampling: "lttb",
      lineStyle: { width: 3 },
      tooltip: {
        formatter: (params: any) => {
          const item = history[params.dataIndex];
          if (!item) return "";
          if (item.status === "lost") {
            return `<div style="color: #fff; padding: 4px;">
              <span style="font-weight: bold; color: #00E5FF;">${params.seriesName}</span><br/>
              <span style="color: #ff4d4d; font-weight: bold;">Sensor Lost</span>
            </div>`;
          }
          const levelLabel = getSignalStrengthLabel(params.value);
          const rawRssi = item.rssi || 0;
          return `<div style="color: #fff; padding: 4px;">
            <span style="font-weight: bold; color: #00E5FF;">${params.seriesName}</span><br/>
            Raw Data: <span style="font-weight: bold;">${rawRssi} dBm</span><br/>
            Level: ${levelLabel}
          </div>`;
        },
      },
    });

    // --- Sub-Graph 1: Battery ---
    series.push({
      name: "Battery",
      type: "line",
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: history.map((h) => (h.status === "lost" ? null : h.battery)),
      color: "#4C6FFF",
      symbol: "circle",
      symbolSize: 4,
      showSymbol: true,
      sampling: "lttb",
      lineStyle: { width: 3 },
      tooltip: {
        formatter: (params: any) => {
          const item = history[params.dataIndex];
          if (!item) return "";
          if (item.status === "lost") {
            return `<div style="color: #fff; padding: 4px;">
              <span style="font-weight: bold; color: #4C6FFF;">${params.seriesName}</span><br/>
              <span style="color: #ff4d4d; font-weight: bold;">Sensor Lost</span>
            </div>`;
          }
          return `<div style="color: #fff; padding: 4px;">
            <span style="font-weight: bold; color: #4C6FFF;">${params.seriesName}</span><br/>
            Value: <span style="font-weight: bold;">${params.value}%</span>
          </div>`;
        },
      },
    });

    // --- Sub-Graph 2: Temperature ---
    series.push({
      name: "Temperature",
      type: "line",
      xAxisIndex: 2,
      yAxisIndex: 2,
      data: history.map((h) => (h.status === "lost" ? null : h.temperature)),
      color: "#C77DFF",
      symbol: "circle",
      symbolSize: 4,
      showSymbol: true,
      sampling: "lttb",
      lineStyle: { width: 3 },
      tooltip: {
        formatter: (params: any) => {
          const item = history[params.dataIndex];
          if (!item) return "";
          if (item.status === "lost") {
            return `<div style="color: #fff; padding: 4px;">
              <span style="font-weight: bold; color: #C77DFF;">${params.seriesName}</span><br/>
              <span style="color: #ff4d4d; font-weight: bold;">Sensor Lost</span>
            </div>`;
          }
          return `<div style="color: #fff; padding: 4px;">
            <span style="font-weight: bold; color: #C77DFF;">${params.seriesName}</span><br/>
            Value: <span style="font-weight: bold;">${params.value}°C</span>
          </div>`;
        },
      },
    });

    // --- Sub-Graph 3: RMS Vibration ---
    if (selectedAxis === "all" || selectedAxis === "h") {
      series.push({
        name: "H-axis",
        type: "line",
        xAxisIndex: 3,
        yAxisIndex: 3,
        data: history.map((h) =>
          h.status === "lost" ? null : getVal(h, "h").toFixed(2)
        ),
        color: "#00E5FF",
        symbol: "circle",
        symbolSize: 4,
        showSymbol: true,
        sampling: "lttb",
        lineStyle: { width: 3 },
        tooltip: {
          formatter: (params: any) => {
            const item = history[params.dataIndex];
            if (!item) return "";
            if (item.status === "lost") {
              return `<div style="color: #fff; padding: 4px;">
                <span style="font-weight: bold; color: #00E5FF;">${params.seriesName}</span><br/>
                <span style="color: #ff4d4d; font-weight: bold;">Sensor Lost</span>
              </div>`;
            }
            return `<div style="color: #fff; padding: 4px;">
              <span style="font-weight: bold; color: #00E5FF;">${params.seriesName}</span><br/>
              Value: <span style="font-weight: bold;">${params.value} ${selectedUnit}</span>
            </div>`;
          },
        },
      });
    }
    if (selectedAxis === "all" || selectedAxis === "v") {
      series.push({
        name: "V-axis",
        type: "line",
        xAxisIndex: 3,
        yAxisIndex: 3,
        data: history.map((h) =>
          h.status === "lost" ? null : getVal(h, "v").toFixed(2)
        ),
        color: "#4C6FFF",
        symbol: "circle",
        symbolSize: 4,
        showSymbol: true,
        sampling: "lttb",
        lineStyle: { width: 3 },
        tooltip: {
          formatter: (params: any) => {
            const item = history[params.dataIndex];
            if (!item) return "";
            if (item.status === "lost") {
              return `<div style="color: #fff; padding: 4px;">
                <span style="font-weight: bold; color: #4C6FFF;">${params.seriesName}</span><br/>
                <span style="color: #ff4d4d; font-weight: bold;">Sensor Lost</span>
              </div>`;
            }
            return `<div style="color: #fff; padding: 4px;">
              <span style="font-weight: bold; color: #4C6FFF;">${params.seriesName}</span><br/>
              Value: <span style="font-weight: bold;">${params.value} ${selectedUnit}</span>
            </div>`;
          },
        },
      });
    }
    if (selectedAxis === "all" || selectedAxis === "a") {
      series.push({
        name: "A-axis",
        type: "line",
        xAxisIndex: 3,
        yAxisIndex: 3,
        data: history.map((h) =>
          h.status === "lost" ? null : getVal(h, "a").toFixed(2)
        ),
        color: "#C77DFF",
        symbol: "circle",
        symbolSize: 4,
        showSymbol: true,
        sampling: "lttb",
        lineStyle: { width: 3 },
        tooltip: {
          formatter: (params: any) => {
            const item = history[params.dataIndex];
            if (!item) return "";
            if (item.status === "lost") {
              return `<div style="color: #fff; padding: 4px;">
                <span style="font-weight: bold; color: #C77DFF;">${params.seriesName}</span><br/>
                <span style="color: #ff4d4d; font-weight: bold;">Sensor Lost</span>
              </div>`;
            }
            return `<div style="color: #fff; padding: 4px;">
              <span style="font-weight: bold; color: #C77DFF;">${params.seriesName}</span><br/>
              Value: <span style="font-weight: bold;">${params.value} ${selectedUnit}</span>
            </div>`;
          },
        },
      });
    }

    // --- Invisible Hit-Area Scatter (ขยาย click zone ให้กว้างขึ้น) ---
    // Series เหล่านี้โปร่งใสสมบูรณ์ แต่มี symbolSize=20 ทำให้คลิกง่ายขึ้น
    const hitAreaBase = {
      type: "scatter" as const,
      symbolSize: 20,
      itemStyle: { opacity: 0 },
      emphasis: { itemStyle: { opacity: 0 } },
      tooltip: { show: false },
      silent: false,
      z: 5,
    };
    series.push({
      ...hitAreaBase,
      name: "_hit_wifi",
      xAxisIndex: 0,
      yAxisIndex: 0,
      data: history.map((h, i) => [i, getSignalStrength(h.rssi || 0)]),
    });
    series.push({
      ...hitAreaBase,
      name: "_hit_battery",
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: history.map((h, i) => [i, h.battery ?? 0]),
    });
    series.push({
      ...hitAreaBase,
      name: "_hit_temp",
      xAxisIndex: 2,
      yAxisIndex: 2,
      data: history.map((h, i) => [i, h.temperature ?? 0]),
    });
    series.push({
      ...hitAreaBase,
      name: "_hit_rms",
      xAxisIndex: 3,
      yAxisIndex: 3,
      data: history.map((h, i) => [i, getVal(h, selectedAxis === "all" ? "h" : (selectedAxis as any))]),
    });

    // --- Highlighting Scatter Series (Red Dots) ---
    if (selectedDataIndex !== null) {
      const hItem = history[selectedDataIndex];
      // Grid 0: WiFi
      series.push({
        name: "Highlight WiFi",
        type: "scatter",
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: [[selectedDataIndex, getSignalStrength(hItem.rssi || 0)]],
        symbolSize: 12,
        itemStyle: { color: "#FF4D4D", borderColor: "#fff", borderWidth: 2 },
        tooltip: { show: false },
        z: 10,
      });
      // Grid 1: Battery
      series.push({
        name: "Highlight Battery",
        type: "scatter",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: [[selectedDataIndex, hItem.battery]],
        symbolSize: 12,
        itemStyle: { color: "#FF4D4D", borderColor: "#fff", borderWidth: 2 },
        tooltip: { show: false },
        z: 10,
      });
      // Grid 2: Temperature
      series.push({
        name: "Highlight Temp",
        type: "scatter",
        xAxisIndex: 2,
        yAxisIndex: 2,
        data: [[selectedDataIndex, hItem.temperature]],
        symbolSize: 12,
        itemStyle: { color: "#FF4D4D", borderColor: "#fff", borderWidth: 2 },
        tooltip: { show: false },
        z: 10,
      });
      // Grid 3: RMS (Highest level of current axes to stay on top)
      let rmsVal = 0;
      if (selectedAxis === "all") {
        rmsVal = Math.max(
          getVal(hItem, "h"),
          getVal(hItem, "v"),
          getVal(hItem, "a")
        );
      } else {
        rmsVal = getVal(hItem, selectedAxis as any);
      }
      series.push({
        name: "Highlight RMS",
        type: "scatter",
        xAxisIndex: 3,
        yAxisIndex: 3,
        data: [[selectedDataIndex, rmsVal.toFixed(2)]],
        symbolSize: 12,
        itemStyle: { color: "#FF4D4D", borderColor: "#fff", borderWidth: 2 },
        tooltip: { show: false },
        z: 10,
      });
    }

    const maxRmsValue = Math.max(
      ...series
        .filter((s) => s.yAxisIndex === 3)
        .flatMap((s) => s.data.map((d: any) => parseFloat(d) || 0)),
      0
    );
    const yAxisMaxRms =
      maxRmsValue > 0
        ? parseFloat((maxRmsValue * 1.1).toFixed(2))
        : THRESHOLDS.RED_START + 1;

    // Background Threshold Areas for RMS only
    const markArea = {
      silent: true,
      data: [
        [
          { yAxis: 0, itemStyle: { color: "#72FF82" } },
          { yAxis: THRESHOLDS.GREEN_LIMIT },
        ],
        [
          { yAxis: THRESHOLDS.GREEN_LIMIT, itemStyle: { color: "#FFE666" } },
          { yAxis: THRESHOLDS.YELLOW_LIMIT },
        ],
        [
          { yAxis: THRESHOLDS.YELLOW_LIMIT, itemStyle: { color: "#FFB347" } },
          { yAxis: THRESHOLDS.RED_START },
        ],
        [
          { yAxis: THRESHOLDS.RED_START, itemStyle: { color: "#FF4D4D" } },
          { yAxis: yAxisMaxRms },
        ],
      ],
    };
    const rmsSeriesIndex = series.findIndex((s) => s.yAxisIndex === 3);
    if (rmsSeriesIndex !== -1) {
      series[rmsSeriesIndex] = { ...series[rmsSeriesIndex], markArea };
    }

    return {
      title: {
        text: `Sensor Name : ${sensorName}`,
        left: "center",
        textStyle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", label: { backgroundColor: "#6a7985" } },
        backgroundColor: "rgba(0,0,0,0.8)",
        textStyle: { color: "#fff" },
      },
      grid: [
        { left: "5%", right: "4%", top: "8%", height: "14%" }, // WiFi
        { left: "5%", right: "4%", top: "28%", height: "14%" }, // Battery
        { left: "5%", right: "4%", top: "48%", height: "14%" }, // Temp
        { left: "5%", right: "4%", top: "68%", height: "24%" }, // RMS
      ],
      xAxis: [
        {
          gridIndex: 0,
          type: "category",
          boundaryGap: false,
          data: labels,
          axisLabel: { show: false },
          axisLine: { lineStyle: { color: "#555" } },
        },
        {
          gridIndex: 1,
          type: "category",
          boundaryGap: false,
          data: labels,
          axisLabel: { show: false },
          axisLine: { lineStyle: { color: "#555" } },
        },
        {
          gridIndex: 2,
          type: "category",
          boundaryGap: false,
          data: labels,
          axisLabel: { show: false },
          axisLine: { lineStyle: { color: "#555" } },
        },
        {
          gridIndex: 3,
          type: "category",
          boundaryGap: false,
          data: labels,
          axisLabel: { color: "#ccc", rotate: 45 },
          axisLine: { lineStyle: { color: "#555" } },
          name: "Timestamp",
          nameLocation: "middle",
          nameGap: 60,
        },
      ],
      yAxis: [
        {
          gridIndex: 0,
          type: "value",
          name: `${signalName.toLowerCase()} (levels)`,
          min: 0,
          max: 4,
          interval: 1,
          nameTextStyle: { color: "#aaa" },
          axisLabel: {
            color: "#ccc",
            formatter: (value: number) => {
              const labels = ["None", "Poor", "Fair", "Good", "Excellent"];
              return labels[value] || value;
            },
          },
          splitLine: {
            show: true,
            lineStyle: { color: "#333", type: "dashed" },
          },
        },
        {
          gridIndex: 1,
          type: "value",
          name: "Battery (%)",
          min: 0,
          max: 100,
          nameTextStyle: { color: "#aaa" },
          axisLabel: { color: "#ccc" },
          splitLine: { show: false },
        },
        {
          gridIndex: 2,
          type: "value",
          name: "Temp (°C)",
          nameTextStyle: { color: "#aaa" },
          axisLabel: { color: "#ccc" },
          splitLine: { show: false },
        },
        {
          gridIndex: 3,
          type: "value",
          name: selectedUnit,
          max: yAxisMaxRms,
          nameTextStyle: { color: "#aaa" },
          axisLabel: { color: "#ccc" },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: [0, 1, 2, 3], start: 0, end: 100 },
      ],
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: "none" },
          restore: {},
          saveAsImage: {},
        },
        iconStyle: { borderColor: "#fff" },
      },
      series: series,
      backgroundColor: "#0B1121",
      animationDurationUpdate: 0,
    };
  }, [history, selectedAxis, selectedUnit, sensorName, selectedDataIndex]);

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const exportData = prepareExportData();
    exportToCSV(
      exportData,
      `sensor_history_${params.id}_${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  const handleExportExcel = () => {
    if (history.length === 0) return;
    const exportData = prepareExportData();
    exportToExcel(
      exportData,
      `sensor_history_${params.id}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const prepareExportData = () => {
    return history.map((item) => {
      const row: any = {
        DateTime: item.datetime,
        RSSI: item.rssi,
        Battery: item.battery,
        Temperature: item.temperature,
      };

      if (selectedAxis === "all" || selectedAxis === "h") {
        row[`H-axis (${selectedUnit})`] = getAxisVal(item, "h").toFixed(2);
      }
      if (selectedAxis === "all" || selectedAxis === "v") {
        row[`V-axis (${selectedUnit})`] = getAxisVal(item, "v").toFixed(2);
      }
      if (selectedAxis === "all" || selectedAxis === "a") {
        row[`A-axis (${selectedUnit})`] = getAxisVal(item, "a").toFixed(2);
      }

      return row;
    });
  };

  const getAxisVal = (item: HistoryItem, axis: "h" | "v" | "a") => {
    if (selectedUnit === "Acceleration RMS (G)")
      return axis === "h"
        ? item.g_rms_h
        : axis === "v"
          ? item.g_rms_v
          : item.g_rms_a;
    if (selectedUnit === "Acceleration(mm/s²)")
      return axis === "h"
        ? item.a_rms_h
        : axis === "v"
          ? item.a_rms_v
          : item.a_rms_a;
    return axis === "h"
      ? item.velo_rms_h
      : axis === "v"
        ? item.velo_rms_v
        : item.velo_rms_a;
  };

  return (
    <div className="min-h-screen bg-[#0B1121] text-white">
      <div className="bg-[#0B1121] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-transparent text-white border-gray-600 hover:bg-gray-800 hover:text-white transition-colors"
            onClick={() => router.push(`/sensors/${params.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sensor
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Card className="bg-[#0B1121] border-[1.35px] border-[#374151]">
          <CardContent className="p-4 flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Axis:</span>
              {(["h", "v", "a", "all"] as const).map((axis) => (
                <button
                  key={axis}
                  onClick={() => setSelectedAxis(axis)}
                  className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${selectedAxis === axis
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-[#0B1121] border-[1.35px] border-[#374151] text-gray-300 hover:bg-[#374151]/50"
                    }`}
                >
                  {axis === "all" ? "All" : `${axis.toUpperCase()}-axis`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Unit:</span>
              <select
                className="bg-[#0B1121] border-[1.35px] border-[#374151] text-white text-sm rounded px-3 py-1.5 focus:outline-none"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
              >
                <option>Velocity RMS (mm/s)</option>
                <option>Acceleration RMS (G)</option>
                <option>Acceleration(mm/s²)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Date:</span>

              {/* Start Date Custom Input */}
              <div
                className="relative bg-[#0B1121] border-[1.35px] border-[#374151] rounded px-3 py-1.5 flex items-center gap-2 w-[150px] cursor-pointer hover:border-blue-500"
                onClick={(e) => {
                  const input = e.currentTarget.querySelector(
                    'input[type="date"]'
                  ) as HTMLInputElement;
                  if (input) input.showPicker();
                }}
              >
                <span className="text-white text-sm flex-1">
                  {dateStart
                    ? dateStart.split("-").reverse().join("/")
                    : "dd/mm/yyyy"}
                </span>
                <Calendar className="h-4 w-4 text-white" />
                <input
                  type="date"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>

              <span className="text-gray-400">-</span>

              {/* End Date Custom Input */}
              <div
                className="relative bg-[#0B1121] border-[1.35px] border-[#374151] rounded px-3 py-1.5 flex items-center gap-2 w-[150px] cursor-pointer hover:border-blue-500"
                onClick={(e) => {
                  const input = e.currentTarget.querySelector(
                    'input[type="date"]'
                  ) as HTMLInputElement;
                  if (input) input.showPicker();
                }}
              >
                <span className="text-white text-sm flex-1">
                  {dateEnd
                    ? dateEnd.split("-").reverse().join("/")
                    : "dd/mm/yyyy"}
                </span>
                <Calendar className="h-4 w-4 text-white" />
                <input
                  type="date"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 text-white hover:bg-[#374151]"
                    disabled={history.length === 0}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#0B1121] border-[#374151] text-white"
                >
                  <DropdownMenuItem
                    onClick={handleExportCSV}
                    className="hover:bg-[#374151] cursor-pointer"
                  >
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportExcel}
                    className="hover:bg-[#374151] cursor-pointer"
                  >
                    Export Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
          <div className="w-full h-[1px] bg-[#374151]" />
          <CardContent className="p-6">
            {loading && (
              <div className="text-center h-[400px] flex items-center justify-center">
                Loading...
              </div>
            )}
            {!loading && !history.length && (
              <div className="text-center h-[400px] flex items-center justify-center text-gray-400">
                No History Data Available
              </div>
            )}
            {!loading && history.length > 0 && chartOption && (
              <div className="space-y-8">
                {/* Single Combined Multi-Grid Graph */}
                <div className="pt-4">
                  <ReactECharts
                    option={chartOption}
                    style={{ height: "950px", width: "100%" }}
                    theme="dark"
                    onChartReady={(instance) => {
                      chartRef.current = instance;
                      setIsChartReady(true);
                    }}
                    onEvents={{
                      click: (params: any) => {
                        if (params.dataIndex !== undefined) {
                          setSelectedDataIndex(params.dataIndex);
                        }
                      },
                    }}
                  />

                  {/* Custom Legend UI for RMS Vibration */}
                  <div className="flex justify-center gap-12 mt-4 pb-8">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 h-1 bg-[#00E5FF] rounded-full"></div>
                      <span className="text-sm font-bold text-white uppercase tracking-wider">
                        H-axis
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 h-1 bg-[#4C6FFF] rounded-full"></div>
                      <span className="text-sm font-bold text-white uppercase tracking-wider">
                        V-axis
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 h-1 bg-[#C77DFF] rounded-full"></div>
                      <span className="text-sm font-bold text-white uppercase tracking-wider">
                        A-axis
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0B1121] border-[1.35px] border-[#374151]">
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="border-b-[1.35px] border-[#374151] text-gray-400">
                    <th className="py-3 font-medium">Date</th>
                    <th className="py-3 font-medium">Time</th>
                    {(selectedAxis === "all" || selectedAxis === "h") && (
                      <th className="py-3 font-medium text-[#00E5FF]">
                        H ({selectedUnit})
                      </th>
                    )}
                    {(selectedAxis === "all" || selectedAxis === "v") && (
                      <th className="py-3 font-medium text-[#4C6FFF]">
                        V ({selectedUnit})
                      </th>
                    )}
                    {(selectedAxis === "all" || selectedAxis === "a") && (
                      <th className="py-3 font-medium text-[#C77DFF]">
                        A ({selectedUnit})
                      </th>
                    )}
                    <th className="py-3 font-medium text-[#00E5FF]">
                      WIFI (RSSI)
                    </th>
                    <th className="py-3 font-medium text-[#4C6FFF]">Battery</th>
                    <th className="py-3 font-medium text-[#C77DFF]">Temp</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {[...history]
                    .sort((a, b) => {
                      const rawStringA = a.datetime.endsWith("Z")
                        ? a.datetime.slice(0, -1)
                        : a.datetime;
                      const rawStringB = b.datetime.endsWith("Z")
                        ? b.datetime.slice(0, -1)
                        : b.datetime;
                      return (
                        new Date(rawStringB).getTime() -
                        new Date(rawStringA).getTime()
                      );
                    }) // Latest to Oldest
                    .map((item, i) => {
                      const getVal = (
                        item: HistoryItem,
                        axis: "h" | "v" | "a"
                      ) => {
                        if (selectedUnit === "Acceleration RMS (G)")
                          return axis === "h"
                            ? item.g_rms_h
                            : axis === "v"
                              ? item.g_rms_v
                              : item.g_rms_a;
                        if (selectedUnit === "Acceleration(mm/s²)")
                          return axis === "h"
                            ? item.a_rms_h
                            : axis === "v"
                              ? item.a_rms_v
                              : item.a_rms_a;
                        return axis === "h"
                          ? item.velo_rms_h
                          : axis === "v"
                            ? item.velo_rms_v
                            : item.velo_rms_a;
                      };
                      // Fix: Treat server time as Local by removing Z if present
                      const rawString = item.datetime.endsWith("Z")
                        ? item.datetime.slice(0, -1)
                        : item.datetime;
                      const d = new Date(rawString);
                      const dateStr = d.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                      const timeStr = `${d.getHours()}.${String(d.getMinutes()).padStart(2, "0")}`;

                      return (
                        <tr
                          key={i}
                          className="border-b border-gray-800 hover:bg-[#2b394b]"
                        >
                          <td className="py-4 font-mono">{dateStr}</td>
                          <td className="py-4 font-mono">{timeStr}</td>
                          {(selectedAxis === "all" || selectedAxis === "h") && (
                            <td className="py-4 font-mono">
                              {item.status === "lost"
                                ? "0.00"
                                : getVal(item, "h").toFixed(2)}
                            </td>
                          )}
                          {(selectedAxis === "all" || selectedAxis === "v") && (
                            <td className="py-4 font-mono">
                              {item.status === "lost"
                                ? "0.00"
                                : getVal(item, "v").toFixed(2)}
                            </td>
                          )}
                          {(selectedAxis === "all" || selectedAxis === "a") && (
                            <td className="py-4 font-mono">
                              {item.status === "lost"
                                ? "0.00"
                                : getVal(item, "a").toFixed(2)}
                            </td>
                          )}
                          <td className="py-4 font-mono">
                            <div className="flex flex-col">
                              <span
                                className={cn(
                                  "font-bold",
                                  item.status === "lost"
                                    ? "text-red-500"
                                    : "text-[#00E5FF]"
                                )}
                              >
                                {item.status === "lost"
                                  ? "Sensor Lost"
                                  : getSignalStrengthLabel(item.rssi || 0)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {item.status === "lost"
                                  ? "-"
                                  : `${item.rssi} dBm`}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 font-mono">
                            {item.status === "lost" ? "0" : item.battery || 0}%
                          </td>
                          <td className="py-4 font-mono">
                            {item.status === "lost"
                              ? "0"
                              : item.temperature || 0}
                            °C
                          </td>
                        </tr>
                      );
                    })}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-gray-500">
                        No Data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
