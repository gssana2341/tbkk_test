import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDateTimeDayFirst } from "@/lib/utils/sensor-charts";
import { SensorPageConfig } from "@/lib/types/sensor-data";
import dynamic from "next/dynamic";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface VibrationAnalysisSectionProps {
  configData: SensorPageConfig;
  selectedAxis: string;
  setSelectedAxis: (axis: string) => void;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  vibrationData: any;
  history: any[];
}

export const VibrationAnalysisSection: React.FC<
  VibrationAnalysisSectionProps
> = ({
  configData,
  selectedAxis,
  setSelectedAxis,
  selectedUnit,
  setSelectedUnit,
  vibrationData,
  history,
}) => {
    const hasData = vibrationData.hasData;

    return (
      <Card className="bg-[#0B1121] border-[1.35px] border-[#374151]">
        <CardContent className="p-6">
          <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold mb-4 text-white">
            Vibration Frequency Analysis
          </h2>

          {/* Axis and Unit Selection with Checkboxes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Axis Selection */}
            <div className="flex items-center gap-6">
              {configData.hAxisEnabled && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAxis === "H-axis"}
                    onChange={() => setSelectedAxis("H-axis")}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xl font-bold text-white">H</span>
                </label>
              )}
              {configData.vAxisEnabled && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAxis === "V-axis"}
                    onChange={() => setSelectedAxis("V-axis")}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xl font-bold text-white">V</span>
                </label>
              )}
              {configData.aAxisEnabled && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAxis === "A-axis"}
                    onChange={() => setSelectedAxis("A-axis")}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xl font-bold text-white">A</span>
                </label>
              )}
            </div>

            {/* Unit Selection */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUnit === "Acceleration (G)"}
                  onChange={() => setSelectedUnit("Acceleration (G)")}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-xl font-bold text-white">G</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUnit === "Acceleration (mm/s²)"}
                  onChange={() => setSelectedUnit("Acceleration (mm/s²)")}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-xl font-bold text-white">mm/s²</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUnit === "Velocity (mm/s)"}
                  onChange={() => setSelectedUnit("Velocity (mm/s)")}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-xl font-bold text-white">mm/s</span>
              </label>
            </div>
          </div>

          <div className="space-y-6">
            {/* RMS Overall + Top 5 Peaks & Short Trend Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: RMS Overall + Top 5 Peaks */}
              <div className="bg-[#0B1121] border-[1.35px] border-[#374151] rounded-lg p-6">
                <div className="flex items-center justify-center gap-4 mb-8">
                  <h4 className="text-lg md:text-xl lg:text-2xl font-extrabold text-white">
                    {selectedUnit.split(" ")[0]} RMS Overall :
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-lg md:text-xl lg:text-2xl font-extrabold text-white">
                      {hasData ? vibrationData.rmsValue : "-"}
                    </span>
                    <span className="text-lg md:text-xl lg:text-2xl font-extrabold text-white">
                      {hasData ? selectedUnit.match(/\(([^)]+)\)/)?.[1] : ""}
                    </span>
                  </div>
                </div>

                <h5 className="text-xl font-bold text-white mb-6">
                  Top 5 Peaks
                </h5>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 pb-3 border-b-2 border-[#374151]">
                    <div className="text-base font-bold text-white pl-8">
                      RMS ({selectedUnit.match(/\(([^)]+)\)/)?.[1]}) :
                    </div>
                    <div className="text-base font-bold text-white text-right">
                      Frequency
                    </div>
                  </div>
                  {hasData && vibrationData.topPeaks ? (
                    vibrationData.topPeaks.map((row: any, i: number) => (
                      <div key={i} className="grid grid-cols-2 gap-4">
                        <div className="text-lg font-medium text-white pl-8">
                          {row.rms}{" "}
                          <span className="text-white text-base">
                            {selectedUnit.match(/\(([^)]+)\)/)?.[1]}
                          </span>
                        </div>
                        <div className="text-lg font-medium text-white text-right">
                          {row.frequency} Hz
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-300 text-base">
                      No data available
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Trend Last Up Date Data */}
              <div className="bg-[#0B1121] border-[1.35px] border-[#374151] rounded-lg p-6">
                <h4 className="text-lg md:text-xl lg:text-2xl font-extrabold text-white mb-8 text-center">
                  Trend Last Up Date Data
                </h4>
                <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar">
                  <table className="min-w-full text-base">
                    <thead className="sticky top-0 bg-[#0B1121]">
                      <tr>
                        <th className="text-left px-3 py-3 font-bold text-white">
                          Date & Time
                        </th>
                        <th className="text-right px-3 py-3 font-bold text-white">
                          RMS Overall
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasData && history.length > 0 ? (
                        history.slice(0, 10).map((item, i) => {
                          const axisKey =
                            selectedAxis === "H-axis"
                              ? "h"
                              : selectedAxis === "V-axis"
                                ? "v"
                                : "a";
                          let rmsValue = "-";
                          let unitShort = "";

                          if (selectedUnit === "Acceleration (G)") {
                            rmsValue = (item[`g_rms_${axisKey}`] || 0).toFixed(2);
                            unitShort = "G";
                          } else if (selectedUnit === "Acceleration (mm/s²)") {
                            rmsValue = (item[`a_rms_${axisKey}`] || 0).toFixed(2);
                            unitShort = "mm/s²";
                          } else {
                            rmsValue = (item[`velo_rms_${axisKey}`] || 0).toFixed(
                              2
                            );
                            unitShort = "mm/s";
                          }

                          return (
                            <tr
                              key={i}
                              className="hover:bg-gray-800 transition-colors"
                            >
                              <td className="px-3 py-3 text-lg font-medium text-white">
                                {formatDateTimeDayFirst(item.datetime)}
                              </td>
                              <td className="px-3 py-3 text-lg font-medium text-right text-white">
                                {rmsValue} {unitShort}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-8 text-center text-gray-500 text-base"
                          >
                            No history data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Time Domain Section */}
            <div>
              <h3 className="text-base font-semibold mb-3 text-white">
                <span className="text-lg md:text-xl lg:text-2xl font-extrabold text-white">
                  Time Domain :{" "}
                  {selectedAxis === "H-axis"
                    ? "Horizontal (H)"
                    : selectedAxis === "V-axis"
                      ? "Vertical (V)"
                      : "Axial (A)"}
                </span>
              </h3>
              <div className="h-80 bg-[#0B1121] border-[1.35px] border-[#374151] rounded-lg p-4">
                {hasData && vibrationData.timeData ? (
                  <ReactECharts
                    option={{
                      backgroundColor: "#0B1121",
                      grid: { left: 60, right: 30, top: 30, bottom: 60 },
                      tooltip: {
                        trigger: "axis",
                        axisPointer: { type: "line" },
                        formatter: (params: any) => {
                          if (params && params.length > 0) {
                            const time = params[0].axisValue;
                            const value = params[0].value;
                            return `F(ts) ${time} s<br/>${params[0].marker} ${params[0].seriesName}: ${Number(value).toFixed(2)}`;
                          }
                          return "";
                        },
                      },
                      xAxis: {
                        type: "category",
                        data: vibrationData.timeData.labels,
                        axisLabel: { color: "#fff", fontWeight: 500 },
                        axisLine: { lineStyle: { color: "#fff" } },
                        splitLine: {
                          show: true,
                          lineStyle: {
                            color: "rgba(255,255,255,0.1)",
                            width: 1,
                            type: "solid",
                          },
                        },
                      },
                      graphic: [
                        {
                          type: "text",
                          right: 10,
                          bottom: 20,
                          z: 10,
                          style: {
                            text: "Time (s)",
                            fill: "#fff",
                            fontWeight: 500,
                            fontSize: 12,
                          },
                        },
                      ],
                      yAxis: {
                        type: "value",
                        name: (vibrationData.yAxisLabel || selectedUnit)
                          .replace("Acceleration ", "")
                          .replace("Velocity ", "")
                          .replace("(", "")
                          .replace(")", ""),
                        nameTextStyle: { color: "#fff", fontWeight: 500 },
                        axisLabel: { color: "#fff", fontWeight: 500 },
                        axisLine: { lineStyle: { color: "#fff" } },
                        splitLine: {
                          show: true,
                          lineStyle: {
                            color: "rgba(255,255,255,0.1)",
                            width: 1,
                            type: "solid",
                          },
                        },
                      },
                      dataZoom: [
                        { type: "inside", xAxisIndex: 0, filterMode: "none" },
                      ],
                      toolbox: {
                        show: true,
                        feature: {
                          restore: { show: true },
                          dataZoom: {
                            show: true,
                            title: { zoom: "Zoom", back: "Reset" },
                          },
                        },
                        right: 20,
                      },
                      series: [
                        {
                          name: (vibrationData.yAxisLabel || selectedUnit)
                            .replace("Acceleration ", "")
                            .replace("Velocity ", "")
                            .replace("(", "")
                            .replace(")", ""),
                          type: "line",
                          data: vibrationData.timeData.datasets[0].data,
                          smooth: true,
                          symbol: "none",
                          lineStyle: { width: 2, color: "#2563eb" },
                          areaStyle: { color: "rgba(37,99,235,0.08)" },
                        },
                      ],
                      legend: { show: false },
                    }}
                    style={{ height: "100%", width: "100%" }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-300">No data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Frequency Domain Section */}
            <div>
              <div className="space-y-4">
                {/* Frequency Domain Chart */}
                <div>
                  <h3 className="text-base font-semibold mb-3 text-white">
                    <span className="text-lg md:text-xl lg:text-2xl font-extrabold text-white">
                      Frequency Domain :{" "}
                      {selectedAxis === "H-axis"
                        ? "Horizontal (H)"
                        : selectedAxis === "V-axis"
                          ? "Vertical (V)"
                          : "Axial (A)"}
                    </span>
                  </h3>
                  <div className="h-[300px] w-full bg-[#030616] border-[1.35px] border-[#374151] rounded-lg p-4 relative">
                    {vibrationData.hasData &&
                      vibrationData.freqData?.labels?.length > 0 ? (
                      <ReactECharts
                        option={{
                          backgroundColor: "transparent",
                          grid: { left: 60, right: 80, top: 40, bottom: 50 },
                          tooltip: {
                            trigger: "axis",
                            axisPointer: { type: "shadow" },
                            backgroundColor: "rgba(11, 17, 33, 0.9)",
                            borderColor: "#374151",
                            textStyle: { color: "#fff" },
                            formatter: (params: any) => {
                              if (params && params.length > 0) {
                                const freq = params[0].axisValue;
                                const value = params[0].value;
                                return `F(Hz): ${freq} Hz<br/>Magnitude: ${Number(value).toFixed(2)}`;
                              }
                              return "";
                            },
                          },
                          xAxis: {
                            type: "category",
                            data: vibrationData.freqData.labels || [],
                            name: "Frequency (Hz)",
                            nameLocation: "end",
                            nameGap: 10,
                            nameTextStyle: { color: "#ffffff", fontSize: 11 },
                            axisLabel: {
                              color: "#ffffff",
                              fontSize: 10,
                              formatter: (value: string) =>
                                parseFloat(value).toFixed(2),
                            },
                            axisLine: {
                              lineStyle: { color: "#ffffff", width: 1.5 },
                            },
                            axisTick: {
                              show: true,
                              lineStyle: { color: "#ffffff" },
                            },
                            splitLine: {
                              show: true,
                              lineStyle: {
                                color: "rgba(255,255,255,0.03)",
                                width: 1,
                              },
                            },
                          },
                          yAxis: {
                            type: "value",
                            name:
                              selectedUnit === "Acceleration (G)"
                                ? "G"
                                : selectedUnit.includes("mm/s²")
                                  ? "mm/s²"
                                  : "mm/s",
                            nameLocation: "end",
                            nameTextStyle: {
                              color: "#ffffff",
                              fontSize: 11,
                              align: "right",
                              padding: [0, 10, 0, 0],
                            },
                            axisLabel: { color: "#ffffff", fontSize: 10 },
                            axisLine: { show: false },
                            axisTick: { show: false },
                            splitLine: {
                              show: true,
                              lineStyle: {
                                color: "rgba(255,255,255,0.05)",
                                width: 1,
                                type: "dashed",
                              },
                            },
                          },
                          dataZoom: [
                            {
                              type: "inside",
                              xAxisIndex: 0,
                            },
                          ],
                          toolbox: {
                            show: true,
                            feature: {
                              restore: {
                                show: true,
                                iconStyle: { borderColor: "#9ca3af" },
                              },
                              dataZoom: {
                                show: true,
                                iconStyle: { borderColor: "#9ca3af" },
                              },
                            },
                            right: 10,
                            top: 0,
                          },
                          series: [
                            {
                              name: "FFT Magnitude",
                              type: "line",
                              data:
                                vibrationData.freqData.datasets[0]?.data || [],
                              smooth: true,
                              symbol: "none",
                              lineStyle: { width: 1.5, color: "#eab308" },
                              areaStyle: {
                                color: {
                                  type: "linear",
                                  x: 0,
                                  y: 0,
                                  x2: 0,
                                  y2: 1,
                                  colorStops: [
                                    { offset: 0, color: "rgba(234,179,8,0.3)" },
                                    { offset: 1, color: "rgba(234,179,8,0)" },
                                  ],
                                },
                              },
                            },
                          ],
                        }}
                        style={{ height: "100%", width: "100%" }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-gray-300">No data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
