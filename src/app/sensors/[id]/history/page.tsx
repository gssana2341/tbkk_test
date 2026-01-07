"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { exportToCSV, exportToExcel } from "@/lib/exportUtils";

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
  const [selectedUnit, setSelectedUnit] = useState("Velocity (mm/s)");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("auth_token");
        let url = `/api/sensors/${params.id}/history?limit=100`; // Increased limit for export/analysis

        if (dateStart) url += `&start_date=${dateStart}`;
        if (dateEnd) url += `&end_date=${dateEnd}`;

        console.log("Fetching History from:", url);

        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
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

        console.log("Extracted History Data:", historyData);
        console.log("History Data Length:", historyData.length);

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

        setHistory(
          mappedHistory.sort(
            (a, b) =>
              new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
          )
        );
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to fetch sensor history");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [params.id]);

  const chartOption = useMemo(() => {
    if (!history.length) return null;

    const labels = history.map((h) => {
      // Fix: Treat server time as Local by removing Z if present
      const rawString = h.datetime.endsWith("Z")
        ? h.datetime.slice(0, -1)
        : h.datetime;
      const d = new Date(rawString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
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
        data: history.map((h) => getVal(h, "h").toFixed(3)),
        color: "#00E5FF",
        smooth: false,
        symbol: "none", // No point
        showSymbol: false,
        lineStyle: { width: 3 },
      });
    }

    if (selectedAxis === "all" || selectedAxis === "v") {
      series.push({
        name: "V-axis",
        type: "line",
        data: history.map((h) => getVal(h, "v").toFixed(3)),
        color: "#4C6FFF",
        smooth: false,
        symbol: "none",
        showSymbol: false,
        lineStyle: { width: 3 },
      });
    }

    if (selectedAxis === "all" || selectedAxis === "a") {
      series.push({
        name: "A-axis",
        type: "line",
        data: history.map((h) => getVal(h, "a").toFixed(3)),
        color: "#C77DFF",
        smooth: false,
        symbol: "none",
        showSymbol: false,
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
        ? parseFloat((maxDataValue * 1.1).toFixed(3))
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
        row[`H-axis (${selectedUnit})`] = getAxisVal(item, "h").toFixed(3);
      }
      if (selectedAxis === "all" || selectedAxis === "v") {
        row[`V-axis (${selectedUnit})`] = getAxisVal(item, "v").toFixed(3);
      }
      if (selectedAxis === "all" || selectedAxis === "a") {
        row[`A-axis (${selectedUnit})`] = getAxisVal(item, "a").toFixed(3);
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
    <div className="min-h-screen bg-[#030616] text-white">
      <div className="bg-[#030616] px-6 py-4 flex items-center justify-between border-b-[1.35px] border-[#374151]">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white"
            onClick={() => router.push(`/sensors/${params.id}`)}
          >
            <Image
              src="/Group (2).png"
              alt="Back"
              width={20}
              height={20}
              className="mr-2 invert"
            />
            Back
          </Button>
          <h1 className="text-lg font-semibold">History Analysis</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Card className="bg-[#030616] border-[1.35px] border-[#374151]">
          <CardContent className="p-4 flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Axis:</span>
              {(["h", "v", "a", "all"] as const).map((axis) => (
                <button
                  key={axis}
                  onClick={() => setSelectedAxis(axis)}
                  className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${selectedAxis === axis
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-[#030616] border-[1.35px] border-[#374151] text-gray-300 hover:bg-[#374151]/50"
                    }`}
                >
                  {axis === "all" ? "All" : `${axis.toUpperCase()}-axis`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Unit:</span>
              <select
                className="bg-[#030616] border-[1.35px] border-[#374151] text-white text-sm rounded px-3 py-1.5 focus:outline-none"
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
              <input
                type="date"
                className="bg-[#030616] border-[1.35px] border-[#374151] text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                className="bg-[#030616] border-[1.35px] border-[#374151] text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>

            <div className="flex gap-2 ml-auto">
              <Button
                className="bg-black text-white border border-gray-600 hover:bg-gray-900"
                onClick={handleExportCSV}
                disabled={history.length === 0}
              >
                Export CSV
              </Button>
              <Button
                className="bg-black text-white border border-gray-600 hover:bg-gray-900"
                onClick={handleExportExcel}
                disabled={history.length === 0}
              >
                Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#030616] border-[1.35px] border-[#374151]">
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

        <Card className="bg-[#030616] border-[1.35px] border-[#374151]">
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
                  {history
                    .sort(
                      (a, b) =>
                        new Date(b.datetime).getTime() -
                        new Date(a.datetime).getTime()
                    ) // Latest to Oldest
                    .slice(0, 10) // Top 10 latest
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
                                {getVal(item, "h").toFixed(3)}
                              </td>
                            </>
                          )}
                          {(selectedAxis === "all" || selectedAxis === "v") && (
                            <>
                              <td className="py-4 font-mono">
                                {getVal(item, "v").toFixed(3)}
                              </td>
                            </>
                          )}
                          {(selectedAxis === "all" || selectedAxis === "a") && (
                            <>
                              <td className="py-4 font-mono">
                                {getVal(item, "a").toFixed(3)}
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
