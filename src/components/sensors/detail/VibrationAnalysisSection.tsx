import React, { useRef, useState } from "react";
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
  allChartData: any;
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
  allChartData,
}) => {
    const hasData = vibrationData.hasData;
    const [freqUnit, setFreqUnit] = useState(selectedUnit);
    const hFreqChartRef = useRef<any>(null);
    const vFreqChartRef = useRef<any>(null);
    const aFreqChartRef = useRef<any>(null);

    const getTop10Peaks = (dataObj: any) => {
      if (!dataObj?.hasData || !dataObj.freqData?.datasets?.[0]?.data) return [];

      const data = dataObj.freqData.datasets[0].data;
      const labels = dataObj.freqData.labels;

      // Find all local maxima
      const peaks: { index: number; value: number }[] = [];
      for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
          peaks.push({ index: i, value: data[i] });
        }
      }

      // Sort by value and take top 10
      return peaks
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map(p => ({
          name: `${labels[p.index]} Hz`,
          coord: [p.index, p.value],
          value: p.value,
          freq: labels[p.index],
          coordIndex: p.index
        }));
    };

    return (
      <Card className="bg-[#0B1121] border-[1.35px] border-[#374151]">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            {/* Axis and Unit Selection within Time Domain Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
              <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold text-white">
                Vibration Frequency Analysis
              </h2>

              <div className="flex flex-wrap items-center gap-6 bg-[#1f2937]/30 p-3 rounded-lg border border-[#374151]">
                {/* Axis Selection */}
                <div className="flex items-center gap-4 pr-4 border-r border-[#374151]">
                  <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Axis:</span>
                  {configData.hAxisEnabled && (
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedAxis === "H-axis"}
                        onChange={() => setSelectedAxis("H-axis")}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className={cn("text-lg font-bold group-hover:text-blue-400 transition-colors", selectedAxis === "H-axis" ? "text-blue-500" : "text-white")}>H</span>
                    </label>
                  )}
                  {configData.vAxisEnabled && (
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedAxis === "V-axis"}
                        onChange={() => setSelectedAxis("V-axis")}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className={cn("text-lg font-bold group-hover:text-blue-400 transition-colors", selectedAxis === "V-axis" ? "text-blue-500" : "text-white")}>V</span>
                    </label>
                  )}
                  {configData.aAxisEnabled && (
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedAxis === "A-axis"}
                        onChange={() => setSelectedAxis("A-axis")}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className={cn("text-lg font-bold group-hover:text-blue-400 transition-colors", selectedAxis === "A-axis" ? "text-blue-500" : "text-white")}>A</span>
                    </label>
                  )}
                </div>

                {/* Unit Selection */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Unit:</span>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedUnit === "Acceleration (G)"}
                      onChange={() => setSelectedUnit("Acceleration (G)")}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className={cn("text-lg font-bold group-hover:text-blue-400 transition-colors", selectedUnit === "Acceleration (G)" ? "text-blue-500" : "text-white")}>G</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedUnit === "Acceleration (mm/s²)"}
                      onChange={() => setSelectedUnit("Acceleration (mm/s²)")}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className={cn("text-lg font-bold group-hover:text-blue-400 transition-colors", selectedUnit === "Acceleration (mm/s²)" ? "text-blue-500" : "text-white")}>mm/s²</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedUnit === "Velocity (mm/s)"}
                      onChange={() => setSelectedUnit("Velocity (mm/s)")}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className={cn("text-lg font-bold group-hover:text-blue-400 transition-colors", selectedUnit === "Velocity (mm/s)" ? "text-blue-500" : "text-white")}>mm/s</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* RMS Overall + Time Domain Section */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Left Column: RMS Overall + Top 5 Peaks (30%) */}
                <div className="w-full lg:w-[30%] bg-[#0B1121] border-[1.35px] border-[#374151] rounded-lg p-6">
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

                  <h5 className="text-xl font-bold text-white mb-6">Top 5 Peaks</h5>
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

                {/* Right Column: Time Domain Graph (70%) */}
                <div className="w-full lg:w-[70%] bg-[#0B1121] border-[1.35px] border-[#374151] rounded-lg p-6">
                  <h4 className="text-lg md:text-xl lg:text-2xl font-extrabold text-white mb-8 text-center">
                    Time Domain :{" "}
                    {selectedAxis === "H-axis"
                      ? "Horizontal (H)"
                      : selectedAxis === "V-axis"
                        ? "Vertical (V)"
                        : "Axial (A)"}
                  </h4>
                  <div className="h-80 w-full">
                    {hasData && vibrationData.timeData ? (
                      <ReactECharts
                        option={{
                          backgroundColor: "transparent",
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
              </div>

              {/* Frequency Domain Section */}
              <div className="mt-8 border-t border-[#374151] pt-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-extrabold text-white">
                    Frequency Domain
                  </h3>

                  {/* Frequency Domain Unit Selection */}
                  <div className="flex items-center gap-4 bg-[#1f2937]/30 p-3 rounded-lg border border-[#374151]">
                    <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Unit:</span>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={freqUnit === "Acceleration (G)"}
                        onChange={() => setFreqUnit("Acceleration (G)")}
                        className="w-4 h-4 accent-yellow-500"
                      />
                      <span className={cn("text-lg font-bold group-hover:text-yellow-400 transition-colors", freqUnit === "Acceleration (G)" ? "text-yellow-500" : "text-white")}>G</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={freqUnit === "Acceleration (mm/s²)"}
                        onChange={() => setFreqUnit("Acceleration (mm/s²)")}
                        className="w-4 h-4 accent-yellow-500"
                      />
                      <span className={cn("text-lg font-bold group-hover:text-yellow-400 transition-colors", freqUnit === "Acceleration (mm/s²)" ? "text-yellow-500" : "text-white")}>mm/s²</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={freqUnit === "Velocity (mm/s)"}
                        onChange={() => setFreqUnit("Velocity (mm/s)")}
                        className="w-4 h-4 accent-yellow-500"
                      />
                      <span className={cn("text-lg font-bold group-hover:text-yellow-400 transition-colors", freqUnit === "Velocity (mm/s)" ? "text-yellow-500" : "text-white")}>mm/s</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Loop through H, V, A axes */}
                  {[
                    { key: 'h', label: 'Horizontal (H)', ref: hFreqChartRef, enabled: configData.hAxisEnabled },
                    { key: 'v', label: 'Vertical (V)', ref: vFreqChartRef, enabled: configData.vAxisEnabled },
                    { key: 'a', label: 'Axial (A)', ref: aFreqChartRef, enabled: configData.aAxisEnabled }
                  ].filter(axis => axis.enabled).map((axis) => {
                    const axisData = allChartData[axis.key]?.[freqUnit];
                    const axisHasData = axisData?.hasData;

                    return (
                      <div key={axis.key}>
                        <h4 className="text-base font-bold mb-3 text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          {axis.label}
                        </h4>
                        <div className="h-[300px] w-full bg-[#030616] border-[1.35px] border-[#374151] rounded-lg p-4 relative">
                          {axisHasData && axisData.freqData?.labels?.length > 0 ? (
                            <ReactECharts
                              onChartReady={(instance) => {
                                axis.ref.current = instance;
                              }}
                              onEvents={{
                                click: (params: any) => {
                                  if (params.componentType === 'markPoint' && axis.ref.current) {
                                    const index = params.data.coordIndex;
                                    const chartInstance = axis.ref.current;
                                    const startValue = Math.max(0, index - 250);
                                    const endValue = index + 250;
                                    chartInstance.dispatchAction({
                                      type: 'dataZoom',
                                      startValue: startValue,
                                      endValue: endValue
                                    });
                                  }
                                }
                              }}
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
                                  data: axisData.freqData.labels || [],
                                  name: "Frequency (Hz)",
                                  nameLocation: "end",
                                  nameGap: 10,
                                  nameTextStyle: { color: "#ffffff", fontSize: 11 },
                                  axisLabel: {
                                    color: "#ffffff",
                                    fontSize: 10,
                                    formatter: (value: string) => parseFloat(value).toFixed(2),
                                  },
                                  axisLine: { lineStyle: { color: "#ffffff", width: 1.5 } },
                                  axisTick: { show: true, lineStyle: { color: "#ffffff" } },
                                  splitLine: {
                                    show: true,
                                    lineStyle: { color: "rgba(255,255,255,0.03)", width: 1 },
                                  },
                                },
                                yAxis: {
                                  type: "value",
                                  name: freqUnit.match(/\(([^)]+)\)/)?.[1] || freqUnit,
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
                                    lineStyle: { color: "rgba(255,255,255,0.05)", width: 1, type: "dashed" },
                                  },
                                },
                                dataZoom: [{ type: "inside", xAxisIndex: 0 }],
                                toolbox: {
                                  show: true,
                                  feature: {
                                    restore: { show: true, iconStyle: { borderColor: "#9ca3af" } },
                                    dataZoom: { show: true, iconStyle: { borderColor: "#9ca3af" } },
                                  },
                                  right: 10,
                                  top: 0,
                                },
                                series: [
                                  {
                                    name: "FFT Magnitude",
                                    type: "line",
                                    data: axisData.freqData.datasets[0]?.data || [],
                                    smooth: true,
                                    symbol: "none",
                                    lineStyle: { width: 1.5, color: "#eab308" },
                                    areaStyle: {
                                      color: {
                                        type: "linear",
                                        x: 0, y: 0, x2: 0, y2: 1,
                                        colorStops: [
                                          { offset: 0, color: "rgba(234,179,8,0.3)" },
                                          { offset: 1, color: "rgba(234,179,8,0)" },
                                        ],
                                      },
                                    },
                                    markPoint: {
                                      symbol: "circle",
                                      symbolSize: 10,
                                      itemStyle: {
                                        color: "#ef4444",
                                        borderColor: "#fff",
                                        borderWidth: 1,
                                        opacity: 0,
                                        shadowBlur: 5,
                                        shadowColor: "rgba(0,0,0,0.5)"
                                      },
                                      label: { show: false },
                                      emphasis: {
                                        itemStyle: { opacity: 1, scale: 1.5, borderWidth: 2 }
                                      },
                                      data: getTop10Peaks(axisData)
                                    }
                                  },
                                ],
                              }}
                              style={{ height: "100%", width: "100%" }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-sm text-gray-300">No data available for {axis.label}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
