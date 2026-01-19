import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SensorPageConfig, AxisStats } from "@/lib/types/sensor-data";
import { getCardBackgroundColor } from "@/lib/utils/vibrationUtils";

interface SensorStatsCardsProps {
  safeTemp: number;
  configData: SensorPageConfig;
  xStats: AxisStats;
  yStats: AxisStats;
  zStats: AxisStats;
}

export const SensorStatsCards: React.FC<SensorStatsCardsProps> = ({
  safeTemp,
  configData,
  xStats,
  yStats,
  zStats,
}) => {
  // Helper to determine text color based on background
  const shouldTextBeWhite = (colorClass: string) => {
    const lower = colorClass.toLowerCase();
    return lower.includes("bg-[#626262]"); // Lost (Dark Gray) - Keep White
  };

  // Helper to call getCardBackgroundColor with 'detail' scheme
  const getDetailCardColor = (val: number) =>
    getCardBackgroundColor(
      val,
      {
        thresholdMin: configData.thresholdMin,
        thresholdMedium: configData.thresholdMedium,
        thresholdMax: configData.thresholdMax,
      },
      "detail"
    );

  const tempThresholdMin = configData?.temperature_threshold_min || 35;
  const tempThresholdMax = configData?.temperature_threshold_max || 45;
  const isTempWarning = safeTemp > tempThresholdMin;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-4 2xl:gap-8">
      {/* Temperature Card */}
      <Card
        className="border-[1.35px] border-[#374151] overflow-hidden"
        style={{
          backgroundColor: isTempWarning
            ? "#fae739" // custom yellow
            : "#14532d", // green-900
        }}
      >
        <CardContent className="p-4 2xl:p-6">
          <div className="flex flex-col w-full h-full">
            <h3
              className={`mb-1 font-extrabold text-xl md:text-2xl 2xl:text-4xl ${
                isTempWarning ? "text-gray-900" : "text-white"
              }`}
            >
              Temperature
            </h3>

            <div className="flex justify-between items-center mb-1">
              <div
                className={`text-2xl md:text-4xl 2xl:text-6xl font-extrabold ${
                  isTempWarning ? "text-gray-900" : "text-white"
                }`}
              >
                {safeTemp.toFixed(0)}°C
              </div>
              <div
                className={`text-xl 2xl:text-4xl font-bold ${
                  isTempWarning ? "text-gray-900" : "text-white"
                }`}
              >
                {isTempWarning ? "Warning" : "Normal"}
              </div>
            </div>

            <div
              className={`mt-auto text-sm 2xl:text-xl font-medium ${
                isTempWarning ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Threshold max: {tempThresholdMax.toFixed(0)} °C
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Axis Cards */}
      {[
        {
          id: "h",
          label: "Horizontal (H)",
          stats: xStats,
          enabled: configData.hAxisEnabled,
        },
        {
          id: "v",
          label: "Vertical (V)",
          stats: yStats,
          enabled: configData.vAxisEnabled,
        },
        {
          id: "a",
          label: "Axial (A)",
          stats: zStats,
          enabled: configData.aAxisEnabled,
        },
      ].map((axis) =>
        axis.enabled ? (
          <Card
            key={axis.id}
            className={`border-[1.35px] border-[#374151] ${getDetailCardColor(parseFloat(axis.stats.velocityTopPeak))}`}
          >
            <CardContent className="p-4 2xl:p-6">
              <h3
                className={`mb-1 font-extrabold text-xl md:text-2xl 2xl:text-4xl ${
                  shouldTextBeWhite(
                    getDetailCardColor(parseFloat(axis.stats.velocityTopPeak))
                  )
                    ? "!text-white"
                    : "!text-black"
                }`}
              >
                {axis.label}
              </h3>
              <div className="grid grid-cols-[1fr_auto] 2xl:grid-cols-[1.2fr_1fr] gap-x-2 2xl:gap-x-4 items-baseline mt-2">
                <span
                  className={`font-bold text-lg md:text-xl 2xl:text-3xl ${
                    shouldTextBeWhite(
                      getDetailCardColor(parseFloat(axis.stats.velocityTopPeak))
                    )
                      ? "!text-white"
                      : "!text-black"
                  }`}
                >
                  Acceleration
                </span>
                <span
                  className={`font-bold text-lg md:text-xl 2xl:text-3xl ${
                    shouldTextBeWhite(
                      getDetailCardColor(parseFloat(axis.stats.velocityTopPeak))
                    )
                      ? "!text-white"
                      : "!text-black"
                  }`}
                >
                  {axis.stats.accelTopPeak}{" "}
                  <span className="text-sm md:text-base 2xl:text-2xl opacity-80 ml-1">
                    G
                  </span>
                </span>

                <span
                  className={`font-bold text-lg md:text-xl 2xl:text-3xl ${
                    shouldTextBeWhite(
                      getDetailCardColor(parseFloat(axis.stats.velocityTopPeak))
                    )
                      ? "!text-white"
                      : "!text-black"
                  }`}
                >
                  Velocity
                </span>
                <span
                  className={`font-bold text-lg md:text-xl 2xl:text-3xl ${
                    shouldTextBeWhite(
                      getDetailCardColor(parseFloat(axis.stats.velocityTopPeak))
                    )
                      ? "!text-white"
                      : "!text-black"
                  }`}
                >
                  {axis.stats.velocityTopPeak}{" "}
                  <span className="text-sm md:text-base 2xl:text-2xl opacity-80 ml-1">
                    mm/s
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null
      )}
    </div>
  );
};
