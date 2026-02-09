import React from "react";
import Image from "next/image";
import {
  Settings,
  Wifi,
  WifiOff,
  WifiHigh,
  WifiLow,
  WifiZero,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  cn,
  formatThaiDate,
  formatDate,
  getSignalStrength,
  getSignalStrengthLabel,
} from "@/lib/utils";
import {
  SensorConfig,
  getVibrationLevelFromConfig,
} from "@/lib/utils/vibrationUtils";
import { formatDateTimeDayFirst } from "@/lib/utils/sensor-charts";
import { getMachineClassName } from "@/lib/iso10816-3";
import {
  SensorLastData,
  SensorPageConfig,
  Sensor,
} from "@/lib/types/sensor-data";

interface SensorInfoSectionProps {
  sensor: Sensor | null;
  configData: SensorPageConfig;
  sensorImage: string | null;
  user: any;
  router: any;
  params: { id: string };
  currentData: any;
  safeBattery: number;
  sensorLastData: SensorLastData | null;
  sortedDatetimes: string[];
  selectedDatetime: string | null;
  setSelectedDatetime: (datetime: string) => void;
  fetchSensorLastData: (sensorId: string, datetime?: string) => Promise<any>;
  setSensorLastData: (data: any) => void;
  setError: (error: string | null) => void;
  history: any[];
  selectedAxis: string;
  selectedUnit: string;
}

function parseCustomDate(dateStr: string): Date {
  try {
    // Expected format: "18-Dec-2025,09:30:00"
    if (dateStr.includes(",")) {
      const [datePart, timePart] = dateStr.split(",");
      const [day, monthStr, year] = datePart.split("-");
      const [hour, minute, second] = timePart.split(":");

      const months: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      return new Date(
        parseInt(year),
        months[monthStr] || 0,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
    }
    return new Date(dateStr);
  } catch (e) {
    console.error("Error parsing date:", dateStr, e);
    return new Date();
  }
}

export const SensorInfoSection: React.FC<SensorInfoSectionProps> = ({
  sensor,
  configData,
  sensorImage,
  user,
  router,
  params,
  currentData,
  safeBattery,
  sensorLastData,
  sortedDatetimes,
  selectedDatetime,
  setSelectedDatetime,
  fetchSensorLastData,
  setSensorLastData,
  setError,
  history,
  selectedAxis,
  selectedUnit,
}) => {
  const [visibleCount, setVisibleCount] = React.useState(20);
  const visibleDatetimes = sortedDatetimes.slice(0, visibleCount);

  // Map dates to RMS values for quick lookup
  const rmsLookup = React.useMemo(() => {
    const lookup: Record<string, string> = {};
    const axisKey =
      selectedAxis === "H-axis" ? "h" : selectedAxis === "V-axis" ? "v" : "a";

    history.forEach((item) => {
      let valString = "";
      if (selectedUnit === "Acceleration (G)") {
        valString = (item[`g_rms_${axisKey}`] || 0).toFixed(2) + " G";
      } else if (selectedUnit === "Acceleration (mm/s²)") {
        valString = (item[`a_rms_${axisKey}`] || 0).toFixed(2) + " mm/s²";
      } else {
        valString = (item[`velo_rms_${axisKey}`] || 0).toFixed(2) + " mm/s";
      }
      lookup[item.datetime] = valString;
    });
    return lookup;
  }, [history, selectedAxis, selectedUnit]);

  // Reset visible count when sensor changes
  React.useEffect(() => {
    setVisibleCount(20);
  }, [sensor?.id]);

  return (
    <Card className="bg-[#0B1121] border-[1.35px] border-[#374151]">
      <CardContent className="p-4">
        <div className="flex flex-col xl:flex-row gap-6 items-stretch">
          {/* Column 1: Image */}
          <div className="flex-1 flex justify-center">
            <div className="w-48 h-full min-h-[280px] bg-[#0B1121] border-[1.35px] border-[#374151] rounded-md flex items-center justify-center overflow-hidden relative">
              {sensorImage || configData.image_url ? (
                <Image
                  src={sensorImage || configData.image_url || ""}
                  alt="Sensor"
                  fill
                  className="object-cover"
                  unoptimized={!!sensorImage}
                />
              ) : (
                <span className="text-gray-400 text-xs">No Image</span>
              )}
            </div>
          </div>

          <div className="hidden xl:block w-[1px] bg-[#374151] my-4 opacity-50"></div>

          {/* Column 2: Machine Information */}
          <div className="flex-1 rounded-xl p-3 2xl:p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center mb-4 gap-2">
              <h2 className="text-xl 2xl:text-2xl font-semibold text-white">
                Machine Information
              </h2>
              {(user?.role?.toLowerCase() === "admin" ||
                user?.role?.toLowerCase() === "editor") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-[1.35px] border-[#374151] hover:bg-[#374151]/50 text-white w-fit 2xl:text-base 2xl:px-3 2xl:py-1"
                  onClick={() => router.push(`/register?id=${params.id}`)}
                >
                  <Settings className="mr-2 h-4 w-4 2xl:h-5 2xl:w-5" />
                  Edit
                </Button>
              )}
            </div>

            <div className="grid grid-cols-[140px_1fr] 2xl:grid-cols-[160px_1fr] gap-x-2 gap-y-1 text-base 2xl:text-lg">
              <span className="text-gray-400">Area Operation</span>
              <span className="text-lg 2xl:text-xl text-white">
                {sensorLastData?.area ||
                  sensor?.area ||
                  sensor?.location ||
                  "Not Set"}
              </span>

              <span className="text-gray-400">Machine Name</span>
              <span className="text-lg 2xl:text-xl text-white">
                {sensorLastData?.machine ||
                  sensor?.machine ||
                  sensor?.machineName ||
                  "Not Set"}
              </span>

              <span className="text-gray-400">Machine Number</span>
              <span
                className={cn(
                  "text-lg 2xl:text-xl",
                  configData.machineNumber ? "text-white" : "text-gray-500"
                )}
              >
                {configData.machineNumber || "Not Set"}
              </span>

              <span className="text-gray-400">Installation Point</span>
              <span
                className={cn(
                  "text-lg 2xl:text-xl",
                  configData.installationPoint ? "text-white" : "text-gray-500"
                )}
              >
                {configData.installationPoint || "Not Set"}
              </span>

              <span className="text-gray-400">Machine Class</span>
              <span
                className={cn(
                  "text-lg 2xl:text-xl",
                  configData.machineClass ? "text-white" : "text-gray-500"
                )}
              >
                {getMachineClassName(configData.machineClass)}
              </span>

              <span className="text-gray-400">Machine Installation Date</span>
              <span className="text-lg 2xl:text-xl text-white">
                {(() => {
                  const dateVal =
                    sensor?.motor_start_time || sensor?.installationDate;
                  if (!dateVal) return "Not Set";
                  try {
                    const dateObj =
                      typeof dateVal === "string"
                        ? parseCustomDate(dateVal)
                        : new Date(dateVal);
                    return formatDate(dateObj.toISOString());
                  } catch (e) {
                    return "Not Set";
                  }
                })()}
              </span>

              <span className="text-gray-400">Machine Age</span>
              <span className="text-lg 2xl:text-xl text-white">
                {(() => {
                  const dateVal =
                    sensor?.motor_start_time || sensor?.installationDate;
                  if (!dateVal) return "Unknown";
                  try {
                    const start =
                      typeof dateVal === "string"
                        ? parseCustomDate(dateVal)
                        : new Date(dateVal);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - start.getTime());
                    const diffDays = Math.floor(
                      diffTime / (1000 * 60 * 60 * 24)
                    );
                    const diffHours = Math.floor(
                      (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                    );
                    return `${diffDays} Day${diffDays > 1 ? "s" : ""} ${diffHours} Hour${diffHours > 1 ? "s" : ""}`;
                  } catch (e) {
                    return "Unknown";
                  }
                })()}
              </span>
            </div>
          </div>

          <div className="hidden xl:block w-[1px] bg-[#374151] my-4 opacity-50"></div>

          {/* Column 3: Sensor Status */}
          <div className="flex-1 rounded-xl p-3 2xl:p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center mb-4 gap-2">
              <h2 className="text-xl 2xl:text-2xl font-semibold text-white">
                Sensor Status
              </h2>
              <div className="flex items-center">
                {(() => {
                  const maxRms = Math.max(
                    sensorLastData?.data?.velo_rms_h || 0,
                    sensorLastData?.data?.velo_rms_v || 0,
                    sensorLastData?.data?.velo_rms_a || 0
                  );

                  const sensorConfigForVibration: SensorConfig = {
                    threshold_min: Number(configData.thresholdMin),
                    threshold_medium: Number(configData.thresholdMedium),
                    threshold_max: Number(configData.thresholdMax),
                  };

                  let statusLevel:
                    | "normal"
                    | "warning"
                    | "concern"
                    | "critical"
                    | "standby"
                    | "lost" = "lost";

                  if (sensor?.connectivity === "offline") {
                    statusLevel = "lost";
                  } else if (sensor?.operationalStatus === "standby") {
                    statusLevel = "standby";
                  } else {
                    statusLevel = getVibrationLevelFromConfig(
                      maxRms,
                      sensorConfigForVibration
                    );
                  }

                  const getStatusStyles = (level: string) => {
                    switch (level) {
                      case "normal":
                        return "bg-[#00E200] text-black";
                      case "warning":
                        return "bg-[#FFFF00] text-black";
                      case "concern":
                        return "bg-[#FF9900] text-black";
                      case "critical":
                        return "bg-[#EB2502] text-white";
                      case "standby":
                        return "bg-[#D9D9D9] text-black";
                      case "lost":
                      default:
                        return "bg-[#626262] text-white";
                    }
                  };

                  const getStatusLabel = (level: string) => {
                    switch (level) {
                      case "normal":
                        return "Normal";
                      case "warning":
                        return "Warning";
                      case "concern":
                        return "Concern";
                      case "critical":
                        return "Critical";
                      case "standby":
                        return "Standby";
                      case "lost":
                        return "Lost";
                      default:
                        return "Unknown";
                    }
                  };

                  return (
                    <span
                      className={cn(
                        "px-3 py-1 2xl:px-4 2xl:py-1.5 text-sm md:text-base 2xl:text-xl rounded-full",
                        getStatusStyles(statusLevel)
                      )}
                    >
                      {getStatusLabel(statusLevel)}
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="grid grid-cols-[135px_1fr] 2xl:grid-cols-[150px_1fr] gap-x-2 gap-y-1 text-base 2xl:text-lg">
              <span className="text-gray-400">Signal Strength</span>
              <span className="flex items-center gap-2 text-white">
                {(() => {
                  const level = getSignalStrength(currentData.rssi || 0);
                  const iconProps = { className: "h-5 w-5" };
                  switch (level) {
                    case 0:
                      return (
                        <WifiOff
                          {...iconProps}
                          className={cn(iconProps.className, "text-gray-400")}
                        />
                      );
                    case 1:
                      return (
                        <WifiZero
                          {...iconProps}
                          className={cn(iconProps.className, "text-yellow-400")}
                        />
                      );
                    case 2:
                      return (
                        <WifiLow
                          {...iconProps}
                          className={cn(iconProps.className, "text-yellow-400")}
                        />
                      );
                    case 3:
                      return (
                        <WifiHigh
                          {...iconProps}
                          className={cn(iconProps.className, "text-[#00E200]")}
                        />
                      );
                    case 4:
                      return (
                        <Wifi
                          {...iconProps}
                          className={cn(iconProps.className, "text-[#00E200]")}
                        />
                      );
                    default:
                      return (
                        <WifiOff
                          {...iconProps}
                          className={cn(iconProps.className, "text-gray-400")}
                        />
                      );
                  }
                })()}
                <span className="text-sm 2xl:text-lg text-gray-500">
                  ({getSignalStrengthLabel(currentData.rssi || 0)})
                </span>
              </span>

              <span className="text-gray-400">Battery</span>
              <span className="text-lg 2xl:text-xl text-white">
                {safeBattery.toFixed(0)}%
              </span>

              <span className="text-gray-400">Sensor Installation Date</span>
              <span className="text-lg 2xl:text-xl text-white">
                {sensor?.installationDate
                  ? formatDate(new Date(sensor.installationDate).toISOString())
                  : formatDate("2025-04-26")}
              </span>

              <span className="text-gray-400">Last Updated</span>
              <span className="text-lg 2xl:text-xl text-white">
                {formatThaiDate(String(currentData.datetime))}
              </span>

              <span className="text-gray-400">Note</span>
              <span
                className={cn(
                  "max-w-[200px] 2xl:max-w-xs truncate text-lg 2xl:text-xl",
                  configData.notes ? "text-white" : "text-gray-500"
                )}
                title={configData.notes || "No notes"}
              >
                {configData.notes || "No notes"}
              </span>
            </div>
          </div>

          <div className="hidden xl:block w-[1px] bg-[#374151] my-4 opacity-50"></div>

          {/* Column 4: Select Date */}
          <div className="flex-[2] py-3 2xl:py-4 pl-0">
            <div className="flex justify-between items-end mb-4 pr-1">
              <h2 className="text-xl 2xl:text-2xl font-semibold text-white pl-0">
                Select Date
              </h2>
              <span className="text-sm 2xl:text-lg font-semibold text-white">
                RMS Overall
              </span>
            </div>
            <div
              className="bg-[#0B1121] rounded-md overflow-y-auto custom-scrollbar"
              style={{ maxHeight: "280px" }}
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } =
                  e.currentTarget;
                // If scrolled to bottom (w/ small threshold)
                if (scrollHeight - scrollTop <= clientHeight + 10) {
                  // Load next 20 items
                  setVisibleCount((prev) =>
                    Math.min(prev + 20, sortedDatetimes.length)
                  );
                }
              }}
            >
              {sortedDatetimes.length > 0 ? (
                <ul className="space-y-1 text-base 2xl:text-xl pl-0">
                  {visibleDatetimes.map((datetime, index) => (
                    <li key={`${datetime}-${index}`}>
                      <button
                        className={cn(
                          "w-full flex items-center justify-between gap-3 text-left py-1 rounded hover:bg-[#374151]/50 text-white pl-0",
                          selectedDatetime === datetime ? "bg-blue-600" : ""
                        )}
                        onClick={async () => {
                          setSelectedDatetime(datetime);
                          try {
                            const data = await fetchSensorLastData(
                              params.id,
                              datetime
                            );
                            if (data) {
                              setSensorLastData(data);
                              setError(null);
                            } else {
                              setError("Failed to fetch sensor data");
                            }
                          } catch {
                            setError("Failed to fetch sensor data");
                          }
                        }}
                      >
                        <span className="shrink-0">
                          {formatDateTimeDayFirst(datetime)}
                        </span>
                        <span className="text-white mr-1 text-right truncate">
                          {rmsLookup[datetime] || ""}
                        </span>
                      </button>
                    </li>
                  ))}
                  {visibleCount < sortedDatetimes.length && (
                    <li className="text-center py-2 text-gray-500 text-sm">
                      Loading more...
                    </li>
                  )}
                </ul>
              ) : (
                <div className="text-gray-400 text-sm 2xl:text-lg py-1 pl-0">
                  No history available
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
