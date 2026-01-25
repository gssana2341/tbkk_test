"use client";

import { useEffect, useState, useMemo } from "react";
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
}

// Thresholds
const THRESHOLDS = {
  GREEN_LIMIT: 1.4,
  YELLOW_LIMIT: 2.8,
  RED_START: 4.5,
};

export default function SensorHistoryPage() {
  const router = useRouter();
  const params = useParams() as { id: string };
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sensorName, setSensorName] = useState("");
  const [error, setError] = useState<string | null>(null);

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

        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Body:", errorText);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
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

        const mappedHistory: HistoryItem[] = historyData.map(
          (item: HistoryItem) => ({
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
          })
        );

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
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to fetch sensor history");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [params.id, dateStart, dateEnd]);

  const chartOption = useMemo(() => {
    if (!history.length) return null;

    const labels = history.map((h) => {
      // Fix: Treat server time as Local by removing Z if present
      const rawString = h.datetime.endsWith("Z")
        ? h.datetime.slice(0, -1)
        : h.datetime;
      const d = new Date(rawString);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    });

    // Helper to get value
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
          : item.velo_rms_a; // Velocity
    };

    const series = [];

    if (selectedAxis === "all" || selectedAxis === "h") {
      series.push({
        name: "H-axis",
        type: "line",
        data: history.map((h) => getVal(h, "h").toFixed(2)),
        color: "#00E5FF",
        smooth: false,
        symbol: "none", // No point
        showSymbol: false,
        sampling: "lttb", // Downsampling optimization
        lineStyle: { width: 3 },
      });
    }

    if (selectedAxis === "all" || selectedAxis === "v") {
      series.push({
        name: "V-axis",
        type: "line",
        data: history.map((h) => getVal(h, "v").toFixed(2)),
        color: "#4C6FFF",
        smooth: false,
        symbol: "none",
        showSymbol: false,
        sampling: "lttb", // Downsampling optimization
        lineStyle: { width: 3 },
      });
    }

    if (selectedAxis === "all" || selectedAxis === "a") {
      series.push({
        name: "A-axis",
        type: "line",
        data: history.map((h) => getVal(h, "a").toFixed(2)),
        color: "#C77DFF",
        smooth: false,
        symbol: "none",
        showSymbol: false,
        sampling: "lttb", // Downsampling optimization
        lineStyle: { width: 3 },
      });
    }

    // Calculate max value from data to set dynamic Y-axis max
    const maxDataValue = Math.max(
      ...series.flatMap((s) => s.data.map((d: any) => parseFloat(d) || 0)),
      0
    );

    // Auto scale: exactly 10% above max data value
    const yAxisMax =
      maxDataValue > 0
        ? parseFloat((maxDataValue * 1.1).toFixed(2))
        : THRESHOLDS.RED_START + 1; // Fallback if no data

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
        // Extend red zone to cover the full range
        [
          { yAxis: THRESHOLDS.RED_START, itemStyle: { color: "#FF4D4D" } },
          { yAxis: yAxisMax },
        ],
      ],
    };

    if (series.length > 0) {
      series[0] = { ...series[0], markArea };
    }

    return {
      title: {
        text: `Sensor Name : ${sensorName}`,
        left: "center",
        textStyle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0,0,0,0.8)",
        borderColor: "#777",
        textStyle: { color: "#fff" },
      },
      legend: { show: false }, // Hide default legend
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: "none",
          },
          restore: {},
          saveAsImage: {},
        },
        iconStyle: {
          borderColor: "#fff",
        },
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
      ],
      grid: { left: "3%", right: "4%", bottom: "15%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLabel: {
          color: "#ccc",
          rotate: 45,
        },
        axisLine: { lineStyle: { color: "#555" } },
        name: "Timestamp",
      },
      yAxis: {
        type: "value",
        name: selectedUnit,
        nameTextStyle: { color: "#aaa", padding: [0, 0, 0, 20] },
        axisLabel: { color: "#ccc" },
        splitLine: { show: false },
        min: 0,
        max: yAxisMax, // Use dynamic max
      },
      series: series,
      backgroundColor: "transparent",
    };
  }, [history, selectedAxis, selectedUnit, sensorName]);

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
                  className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedAxis === axis
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
              <div className="relative bg-[#0B1121] border-[1.35px] border-[#374151] rounded px-3 py-1.5 flex items-center gap-2 w-[150px] cursor-pointer hover:border-blue-500">
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
              <div className="relative bg-[#0B1121] border-[1.35px] border-[#374151] rounded px-3 py-1.5 flex items-center gap-2 w-[150px] cursor-pointer hover:border-blue-500">
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
              <div className="space-y-4">
                <ReactECharts
                  option={chartOption}
                  style={{ height: "400px", width: "100%" }}
                  theme="dark"
                  notMerge={true}
                />

                {/* Custom Legend UI */}
                <div className="flex justify-center gap-12 mt-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-48 h-1 bg-[#00E5FF] rounded-full"></div>
                    <span className="text-lg font-bold text-white uppercase tracking-wider">
                      H-axis
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-48 h-1 bg-[#4C6FFF] rounded-full"></div>
                    <span className="text-lg font-bold text-white uppercase tracking-wider">
                      V-axis
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-48 h-1 bg-[#C77DFF] rounded-full"></div>
                    <span className="text-lg font-bold text-white uppercase tracking-wider">
                      A-axis
                    </span>
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
                            <>
                              <td className="py-4 font-mono">
                                {getVal(item, "h").toFixed(2)}
                              </td>
                            </>
                          )}
                          {(selectedAxis === "all" || selectedAxis === "v") && (
                            <>
                              <td className="py-4 font-mono">
                                {getVal(item, "v").toFixed(2)}
                              </td>
                            </>
                          )}
                          {(selectedAxis === "all" || selectedAxis === "a") && (
                            <>
                              <td className="py-4 font-mono">
                                {getVal(item, "a").toFixed(2)}
                              </td>
                            </>
                          )}
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
