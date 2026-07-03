import React from "react";
import Image from "next/image";
import {
  Settings,
  Wifi,
  WifiOff,
  WifiHigh,
  WifiLow,
  Calendar,
  AlertOctagon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  cn,
  formatThaiDate,
  formatDate,
  getSignalStrength,
  getSignalStrengthLabel,
  parseThailandTime,
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
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<string>("");
  const [showOnlyAlarm, setShowOnlyAlarm] = React.useState<boolean>(false);
  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";

  const [dominantFault, setDominantFault] = React.useState<any>(null);
  const [showPopup, setShowPopup] = React.useState(false);
  const [diagnosticRules, setDiagnosticRules] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!isSuperAdmin) return;
    import("@/lib/api/diagnostics").then(({ diagnosticsApi }) => {
      diagnosticsApi.getDiagnosticRules()
        .then((res) => {
          if (res) {
            setDiagnosticRules(res);
          }
        })
        .catch(() => {});
    });
  }, [isSuperAdmin]);

  React.useEffect(() => {
    if (!isSuperAdmin) {
      setDominantFault(null);
      return;
    }
    if (sensor?.id) {
      import("@/lib/api/diagnostics").then(({ diagnosticsApi }) => {
        const targetDate = selectedDatetime || (sensorLastData?.data?.datetime || new Date().toISOString());
        diagnosticsApi.getDiagnosticHistory(sensor.id, targetDate)
          .then((res) => {
            if (res) {
              setDominantFault(res.dominant_fault);
            } else {
              setDominantFault(null);
            }
          })
          .catch(() => {
            setDominantFault(null);
          });
      });
    }
  }, [sensor?.id, selectedDatetime, sensorLastData, isSuperAdmin]);

  const alarmDatetimes = React.useMemo(() => {
    return new Set(
      history
        .filter((item) => item.data_type === "ALARM" || item.data_type === "alarm" || item.level_vibration === "critical" || item.level_vibration === "concern")
        .map((item) => item.datetime)
    );
  }, [history]);

  // Safely filter datetimes based on calendar selection and ALARM toggle
  const filteredDatetimes = React.useMemo(() => {
    let result = sortedDatetimes;
    
    if (showOnlyAlarm) {
      result = result.filter((dt) => alarmDatetimes.has(dt));
    }

    if (!selectedCalendarDate) return result;

    return result.filter((dt) => {
      let dtObj;
      if (dt.includes(",")) {
        dtObj = parseCustomDate(dt);
      } else {
        dtObj = new Date(parseThailandTime(dt));
      }

      if (isNaN(dtObj.getTime())) return true;

      const y = dtObj.getFullYear();
      const m = String(dtObj.getMonth() + 1).padStart(2, "0");
      const d = String(dtObj.getDate()).padStart(2, "0");
      const dtStr = `${y}-${m}-${d}`;

      return dtStr === selectedCalendarDate;
    });
  }, [sortedDatetimes, selectedCalendarDate, showOnlyAlarm, alarmDatetimes]);

  const visibleDatetimes = filteredDatetimes.slice(0, visibleCount);

  // Map dates to RMS and RSSI values for quick lookup
  const rssiLookup = React.useMemo(() => {
    const lookup: Record<string, string> = {};
    history.forEach((item) => {
      lookup[item.datetime] = item.rssi !== undefined && item.rssi !== null 
        ? `${item.rssi} dBm` 
        : "-";
    });
    return lookup;
  }, [history]);

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
            <div className="w-full max-w-[200px] md:w-48 h-full min-h-[160px] md:min-h-[280px] bg-[#0B1121] border-[1.35px] border-[#374151] rounded-md flex items-center justify-center overflow-hidden relative">
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
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {(user?.role?.toLowerCase() === "admin" ||
                  user?.role?.toLowerCase() === "superadmin" ||
                  user?.role?.toLowerCase() === "editor") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent border-[1.35px] border-[#374151] hover:bg-[#374151]/50 text-white w-fit 2xl:text-base 2xl:px-3 2xl:py-1"
                      onClick={() => router.push(`/register?id=${params.id}`)}
                    >
                      <Settings className="mr-1.5 h-4 w-4 2xl:h-5 2xl:w-5" />
                      Edit
                    </Button>
                  )}
              </div>
            </div>

            <div className="grid grid-cols-[110px_1fr] md:grid-cols-[140px_1fr] 2xl:grid-cols-[160px_1fr] gap-x-2 gap-y-2 text-xs sm:text-sm md:text-base 2xl:text-lg">
              <span className="text-gray-400 flex items-center">Area Operation</span>
              <span className="text-sm md:text-lg 2xl:text-xl text-white truncate break-words whitespace-normal">
                {sensorLastData?.area ||
                  sensor?.area ||
                  sensor?.location ||
                  "Not Set"}
              </span>

              <span className="text-gray-400">Machine Name</span>
              <span className="text-sm md:text-lg 2xl:text-xl text-white truncate break-words whitespace-normal">
                {sensorLastData?.machine ||
                  sensor?.machine ||
                  sensor?.machineName ||
                  "Not Set"}
              </span>

              <span className="text-gray-400">Machine Number</span>
              <span
                className={cn(
                  "text-sm md:text-lg 2xl:text-xl truncate break-words whitespace-normal",
                  configData.machineNumber ? "text-white" : "text-gray-500"
                )}
              >
                {configData.machineNumber || "Not Set"}
              </span>

              <span className="text-gray-400">Installation Point</span>
              <span
                className={cn(
                  "text-sm md:text-lg 2xl:text-xl truncate break-words whitespace-normal",
                  configData.installationPoint ? "text-white" : "text-gray-500"
                )}
              >
                {configData.installationPoint || "Not Set"}
              </span>

              <span className="text-gray-400">Machine Class</span>
              <span
                className={cn(
                  "text-sm md:text-lg 2xl:text-xl truncate break-words whitespace-normal",
                  configData.machineClass ? "text-white" : "text-gray-500"
                )}
              >
                {getMachineClassName(configData.machineClass)}
              </span>

              <span className="text-gray-400">Machine Installation Date</span>
              <span className="text-sm md:text-lg 2xl:text-xl text-white truncate break-words whitespace-normal">
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
              <span className="text-sm md:text-lg 2xl:text-xl text-white truncate break-words whitespace-normal">
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
            <div className="grid grid-cols-[110px_1fr] md:grid-cols-[135px_1fr] 2xl:grid-cols-[150px_1fr] gap-x-2 gap-y-2 text-xs sm:text-sm md:text-base 2xl:text-lg">
              <span className="text-gray-400 flex items-center">Signal Strength</span>
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
              <span className="text-sm md:text-lg 2xl:text-xl text-white truncate break-words whitespace-normal">
                {safeBattery.toFixed(0)}%
              </span>

              <span className="text-gray-400">Sensor Installation Date</span>
              <span className="text-sm md:text-lg 2xl:text-xl text-white truncate break-words whitespace-normal">
                {sensor?.installationDate
                  ? formatDate(new Date(sensor.installationDate).toISOString())
                  : formatDate("2025-04-26")}
              </span>

              <span className="text-gray-400">Last Updated</span>
              <span className="text-sm md:text-lg 2xl:text-xl text-white truncate break-words whitespace-normal">
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

            {dominantFault && (
              <>
                <div className="mt-4 p-3 rounded-xl bg-red-950/20 border border-red-800/40 text-red-100 flex flex-col gap-2">
                  <div className="text-xs uppercase tracking-wider font-bold opacity-80 flex items-center gap-1.5 text-red-400">
                    <AlertOctagon className="h-4 w-4" />
                    Anomaly Detected
                  </div>
                  <div className="text-sm font-semibold flex items-center justify-between gap-4">
                    <span className="text-white truncate">
                      {(() => {
                        const matchedRule = diagnosticRules.find(
                          (r) => r.fault_id?.toUpperCase() === dominantFault.fault_id?.toUpperCase()
                        );
                        return matchedRule?.name || dominantFault.fault_name;
                      })()}
                    </span>
                    <button
                      onClick={() => setShowPopup(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline font-bold shrink-0 cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                <Dialog open={showPopup} onOpenChange={setShowPopup}>
                  <DialogContent className="bg-[#0B1121] border border-[#374151] text-white max-w-lg rounded-2xl p-6 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-500">
                        <AlertOctagon className="h-6 w-6" />
                        {(() => {
                          const matchedRule = diagnosticRules.find(
                            (r) => r.fault_id?.toUpperCase() === dominantFault.fault_id?.toUpperCase()
                          );
                          return matchedRule?.name || dominantFault.fault_name || "Diagnostic Alert";
                        })()}
                      </DialogTitle>
                    </DialogHeader>

                    {(() => {
                      const matchedRule = diagnosticRules.find(
                        (r) => r.fault_id?.toUpperCase() === dominantFault.fault_id?.toUpperCase()
                      );

                      const details = {
                        cause: matchedRule?.causes?.en ? matchedRule.causes.en.map((c: string) => `• ${c}`).join("\n") : "Potential machine rotation or structural degradation.",
                        reasoning: matchedRule?.reasoning?.en || "Abnormal vibration amplitudes detected in frequency spectra.",
                        fix: matchedRule?.how_to_fix?.en || dominantFault.recommendation_en || "Please inspect the physical machine setup.",
                        measurement: matchedRule?.measurement_method?.en || "Check H, V, A axes vibration levels."
                      };

                      return (
                        <div className="space-y-4 text-sm leading-relaxed mt-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                          <div className="bg-[#161E28]/60 p-3 rounded-xl border border-gray-800/40">
                            <span className="text-xs font-bold text-gray-400 block mb-1">Cause</span>
                            <p className="text-gray-200 whitespace-pre-line leading-relaxed">{details.cause}</p>
                          </div>

                          <div className="bg-[#161E28]/60 p-4 rounded-xl border border-gray-800/40">
                            <span className="text-xs font-bold text-gray-400 block mb-1">Reasoning / Analysis</span>
                            <p className="text-gray-200 leading-relaxed">{details.reasoning}</p>
                          </div>

                          <div className="bg-[#161E28]/60 p-4 rounded-xl border border-gray-800/40">
                            <span className="text-xs font-bold text-gray-400 block mb-1">Recommended Actions / How to Fix</span>
                            <p className="text-gray-200 leading-relaxed">{details.fix}</p>
                          </div>

                          <div className="bg-[#161E28]/60 p-4 rounded-xl border border-gray-800/40">
                            <span className="text-xs font-bold text-gray-400 block mb-1">Measurement Method</span>
                            <p className="text-gray-200 leading-relaxed">{details.measurement}</p>
                          </div>

                          {matchedRule?.references && matchedRule.references.length > 0 && (
                            <div className="bg-[#161E28]/60 p-3 rounded-xl border border-gray-800/40">
                              <span className="text-xs font-bold text-gray-400 block mb-1">References</span>
                              <div className="space-y-2 mt-1">
                                {matchedRule.references.map((ref: any, i: number) => (
                                  <div key={i} className="text-xs border-l-2 border-blue-500 pl-2">
                                    <div className="font-semibold text-white">{ref.source}</div>
                                    {ref.section && <div className="text-[10px] text-blue-400 mt-0.5">{ref.section}</div>}
                                    <div className="text-gray-400 mt-0.5">{ref.details}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          <div className="hidden xl:block w-[1px] bg-[#374151] my-4 opacity-50"></div>

          {/* Column 4: Select Date */}
          <div className="flex-[2] py-3 2xl:py-4 pl-0 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-end mb-4 pr-1 shrink-0 overflow-x-auto custom-scrollbar pb-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl 2xl:text-2xl font-semibold text-white pl-0">
                  Select Date
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "px-2 py-1 h-auto text-xs flex items-center gap-1.5",
                      showOnlyAlarm 
                        ? "bg-red-900/40 border-red-500/50 text-red-400 hover:bg-red-900/60" 
                        : "bg-transparent border-[#374151] text-gray-400 hover:text-white"
                    )}
                    onClick={() => {
                      setShowOnlyAlarm(!showOnlyAlarm);
                      setVisibleCount(20);
                    }}
                  >
                    <AlertOctagon className="h-3.5 w-3.5" />
                    {showOnlyAlarm ? "ALARM Only" : "Show ALARM"}
                  </Button>
                  <div
                    className="relative bg-[#0B1121] border-[1.35px] border-[#374151] rounded px-3 py-1 flex items-center gap-2 min-w-[130px] cursor-pointer hover:border-blue-500"
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector(
                        'input[type="date"]'
                      ) as HTMLInputElement;
                      if (input && typeof input.showPicker === 'function') {
                        input.showPicker();
                      }
                    }}
                  >
                    <span className="text-white text-sm flex-1">
                      {selectedCalendarDate
                        ? selectedCalendarDate.split("-").reverse().join("/")
                        : "dd/mm/yyyy"}
                    </span>
                    <Calendar className="h-4 w-4 text-white shrink-0" />
                    <input
                      type="date"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      value={selectedCalendarDate}
                      onChange={(e) => {
                        setSelectedCalendarDate(e.target.value);
                        setVisibleCount(20);
                      }}
                    />
                  </div>
                  {selectedCalendarDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-400 hover:text-white px-2 py-1 h-auto"
                      onClick={() => {
                        setSelectedCalendarDate("");
                        setVisibleCount(20);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 md:gap-6 2xl:gap-8 shrink-0">
                <span className="text-xs md:text-sm 2xl:text-lg font-semibold text-white min-w-[50px] md:min-w-[70px] text-right">
                  RSSI
                </span>
                <span className="text-xs md:text-sm 2xl:text-lg font-semibold text-white min-w-[70px] md:min-w-[80px] text-right">
                  RMS Overall
                </span>
              </div>
            </div>
            <div
              className="bg-[#0B1121] rounded-md overflow-y-auto custom-scrollbar max-h-[350px]"
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } =
                  e.currentTarget;
                // If scrolled to bottom (w/ small threshold)
                if (scrollHeight - scrollTop <= clientHeight + 10) {
                  // Load next 20 items
                  setVisibleCount((prev) =>
                    Math.min(prev + 20, filteredDatetimes.length)
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
                          "w-full flex items-center justify-between gap-2 md:gap-3 text-left py-1.5 rounded hover:bg-[#374151]/50 text-white pl-0 overflow-hidden",
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
                        <span className="shrink-0 flex items-center gap-1.5 md:gap-2 text-xs md:text-base truncate">
                          {alarmDatetimes.has(datetime) && (
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" title="ALARM status"></span>
                          )}
                          <span className="truncate">{formatDateTimeDayFirst(datetime)}</span>
                        </span>
                        <div className="flex items-center gap-2 md:gap-6 2xl:gap-8 mr-1 shrink-0">
                          <span className="text-gray-400 text-xs md:text-sm 2xl:text-lg min-w-[50px] md:min-w-[70px] text-right">
                            {rssiLookup[datetime] || "-"}
                          </span>
                          <span className="text-white text-right truncate min-w-[70px] md:min-w-[80px] text-xs md:text-base">
                            {rmsLookup[datetime] || ""}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                  {visibleCount < filteredDatetimes.length && (
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
