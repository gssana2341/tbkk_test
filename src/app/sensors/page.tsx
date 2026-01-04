"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MoreVertical, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/FormControls/dropdown-menu";
import {
  formatThaiDate,
  getSignalStrength,
  getSignalStrengthLabel,
} from "@/lib/utils";
import SensorDetailInfoCard from "@/components/sensors/SensorDetailInfoCard";

// Import calculation functions from utility
import {
  adcToAccelerationG,
  accelerationGToMmPerSecSquared,
  accelerationToVelocity,
  calculateFFT,
  handlingWindowFunction,
  findTopPeaks,
} from "@/lib/sensorCalculations";
import {
  getCardBackgroundColor,
  type SensorConfig,
} from "@/lib/vibrationUtils";
import type { Sensor } from "@/lib/types";
import { deleteSensor } from "@/lib/data/sensors";

// First, update the SensorLastData interface to properly handle the vibration data arrays
interface SensorLastData {
  id: string;
  name: string;
  sensor_type: string | null;
  unit: string | null;
  fmax: number;
  lor: number;
  g_scale: number;
  alarm_ths: number;
  time_interval: number;
  data: {
    datetime: string;
    h: number[];
    v: number[];
    a: number[];
    temperature: number;
    battery: number;
    rssi: number;
    flag: string;
  };
}

interface ChartTimeData {
  labels: string[];
  rmsValue: string;
  peakValue: string;
  peakToPeakValue: string;
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    pointRadius: number;
  }>;
}

interface ChartFreqData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    pointRadius: number;
    pointBackgroundColor: string[];
  }>;
}

interface ChartConfigData {
  lor: number;
  fmax: number;
  g_scale: number;
}

// ฟังก์ชันเตรียมข้อมูลสำหรับกราฟ
function prepareChartData(
  rawAxisData: number[],
  selectedUnit: string,
  timeInterval: number,
  configData: ChartConfigData
): {
  timeData: ChartTimeData;
  freqData: ChartFreqData;
  yAxisLabel: string;
  rmsValue?: string;
  peakValue?: string;
  peakToPeakValue?: string;
  topPeaks?: { peak: number; rms: string; frequency: string }[];
} {
  // Check if we have valid data
  if (!rawAxisData || rawAxisData.length === 0) {
    // Return empty chart data with fallback values
    const emptyTimeData = {
      labels: [],
      rmsValue: "0.000",
      peakValue: "0.000",
      peakToPeakValue: "0.000",
      datasets: [
        {
          label: "No Data",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.1)",
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    };

    const emptyFreqData = {
      labels: [],
      datasets: [
        {
          label: "No Data",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.1)",
          tension: 0.1,
          pointRadius: 3,
          pointBackgroundColor: [],
        },
      ],
    };

    return {
      timeData: emptyTimeData,
      freqData: emptyFreqData,
      yAxisLabel: "No Data",
      rmsValue: "0.000",
      peakValue: "0.000",
      peakToPeakValue: "0.000",
      topPeaks: [],
    };
  }

  // สร้างป้ายเวลาสำหรับกราฟ
  const n = rawAxisData.length;
  const totalTime = configData.lor / configData.fmax;
  const timeLabels = Array.from({ length: n }, (_, i) =>
    ((i * totalTime) / (n - 1)).toFixed(4)
  );

  // ประมวลผลข้อมูลตามหน่วยที่เลือก
  let processedData: number[];
  let yAxisLabel: string;
  const gData = rawAxisData.map((adc) =>
    adcToAccelerationG(adc, configData.g_scale)
  );
  const mmPerSecSquaredData = gData.map((g) =>
    accelerationGToMmPerSecSquared(g)
  );
  const actualTimeInterval = totalTime / (n - 1);
  const velocityData = accelerationToVelocity(
    mmPerSecSquaredData,
    actualTimeInterval
  );

  if (selectedUnit === "Acceleration (G)") {
    processedData = gData;
    yAxisLabel = "Acceleration (G)";
  } else if (selectedUnit === "Acceleration (mm/s²)") {
    processedData = mmPerSecSquaredData;
    yAxisLabel = "Acceleration (rms, mm/s²)";
  } else {
    processedData = velocityData;
    yAxisLabel = "Velocity (rms, mm/s)";
  }

  // ===== OVERALL STATISTICS CALCULATION =====
  // Calculate RMS using the same method as getAxisTopPeakStats
  const rms =
    processedData.length > 0
      ? Math.sqrt(
        processedData.reduce((sum, val) => sum + val * val, 0) /
        processedData.length
      )
      : 0;
  const peak = Math.max(...processedData.map(Math.abs));

  // peak * 2
  const peakToPeak = peak * 2;
  const rmsValue = rms.toFixed(2);
  const peakValue = peak.toFixed(2);
  const peakToPeakValue = peakToPeak.toFixed(2);

  // สร้างข้อมูลสำหรับกราฟโดเมนเวลา
  const timeChartData = {
    labels: timeLabels,
    rmsValue,
    peakValue,
    peakToPeakValue,
    datasets: [
      {
        label: yAxisLabel,
        data: processedData,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.1)",
        tension: 0.1,
        pointRadius: 0,
      },
    ],
  };

  // ===== FFT CALCULATIONS =====
  const deltaF = (configData.fmax * 2.56) / (configData.lor * 2.56);
  let magnitude: number[] = [],
    frequency: number[] = [];
  let feqProcessedData: number[] = [];
  if (selectedUnit === "Acceleration (G)") {
    // Use the same method as getAxisTopPeakStats for consistency
    // Don't apply windowing for Acceleration (G) to match Horizontal (H) card
    ({ magnitude, frequency } = calculateFFT(gData, configData.fmax));
  } else if (selectedUnit === "Acceleration (mm/s²)") {
    feqProcessedData = handlingWindowFunction(mmPerSecSquaredData) as number[];
    ({ magnitude, frequency } = calculateFFT(
      feqProcessedData,
      configData.fmax
    ));
  } else {
    const mmWithHanding = handlingWindowFunction(
      mmPerSecSquaredData
    ) as number[];
    ({ magnitude, frequency } = calculateFFT(mmWithHanding, configData.fmax));
    magnitude = magnitude.map(
      (val, idx) => val / (2 * Math.PI * (idx * deltaF))
    );
  }

  // Check if FFT calculation was successful
  if (
    !magnitude ||
    magnitude.length === 0 ||
    !frequency ||
    frequency.length === 0
  ) {
    const emptyFreqData = {
      labels: [],
      datasets: [
        {
          label: `${yAxisLabel}`,
          data: [],
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.1)",
          tension: 0.1,
          pointRadius: 3,
          pointBackgroundColor: [],
        },
      ],
    };

    return {
      timeData: timeChartData,
      freqData: emptyFreqData,
      yAxisLabel,
      rmsValue,
      peakValue,
      peakToPeakValue,
      topPeaks: [],
    };
  }

  // ===== PEAK FINDING USING STRUCTURED FUNCTION =====
  // Remove zero frequency (DC component)
  const freqMagnitude = magnitude.slice(3);
  // Build numeric frequency values aligned with freqMagnitude (starting from index 3 of original)
  const freqValues = Array.from(
    { length: freqMagnitude.length },
    (_, i) => (i + 3) * deltaF
  );
  // String labels for chart display
  const freqLabels = freqValues.map((v) => v.toFixed(4));

  // Use findTopPeaks function for consistent peak detection
  // For Acceleration (G), ensure we're using the same data as Horizontal (H) card
  let topPeaks: { peak: number; rms: string; frequency: string }[] = [];
  let pointBackgroundColor: string[] = [];

  if (selectedUnit === "Acceleration (G)") {
    // For Acceleration (G), use the same FFT magnitude data as getAxisTopPeakStats
    const { topPeaks: fftPeaks, pointBackgroundColor: fftColors } =
      findTopPeaks(freqMagnitude, freqValues, configData.lor, 5);
    topPeaks = fftPeaks;
    pointBackgroundColor = fftColors;
  } else {
    // For other units, use the processed magnitude data
    const { topPeaks: processedPeaks, pointBackgroundColor: processedColors } =
      findTopPeaks(freqMagnitude, freqValues, configData.lor, 5);
    topPeaks = processedPeaks;
    pointBackgroundColor = processedColors;
  }
  //freqLabels not over lor * (deltaF)
  // find index of freqLabels that is over lor  * (deltaF)
  const indexOfMaxFreq = freqValues.findIndex(
    (value) => value > configData.lor * deltaF
  );
  const freqChartData = {
    labels: freqLabels.slice(0, indexOfMaxFreq),
    datasets: [
      {
        label: `${yAxisLabel} Magnitude`,
        data: freqMagnitude,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.1)",
        tension: 0.1,
        pointRadius: 3,
        pointBackgroundColor,
      },
    ],
  };

  return {
    timeData: timeChartData,
    freqData: freqChartData,
    yAxisLabel,
    rmsValue,
    peakValue,
    peakToPeakValue,
    topPeaks,
  };
}

// Add this helper function after the existing formatDate function
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
};

export default function SensorDetailPage() {
  const router = useRouter();
  const params = useParams() as { id: string };

  // Client-side only state to prevent SSR hydration issues
  const [mounted, setMounted] = useState(false);

  // สถานะของคอมโพเนนต์
  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [sensorLastData, setSensorLastData] = useState<SensorLastData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedAxis, setSelectedAxis] = useState("H-axis");
  const [selectedUnit, setSelectedUnit] = useState("Acceleration (G)");
  const [error, setError] = useState<string | null>(null);
  const [datetimes, setDatetimes] = useState<string[]>([]);
  const [selectedDatetime, setSelectedDatetime] = useState<string>("");
  const [configData, setConfigData] = useState({
    serialNumber: "",
    sensorName: "",
    machineNumber: "",
    installationPoint: "",
    machineClass: "",
    fmax: 10000,
    lor: 6400,
    g_scale: 16,
    time_interval: 3,
    alarm_ths: 5.0,
    thresholdMin: "",
    thresholdMedium: "",
    thresholdMax: "",
    notes: "",
    image_url: "",
    // Add axis direction configuration
    hAxisEnabled: true,
    vAxisEnabled: true,
    aAxisEnabled: true,
  });

  // ฟังก์ชันดึงข้อมูลล่าสุดจากเซ็นเซอร์
  const fetchSensorLastData = async (sensorId: string) => {
    try {
      const response = await fetch(
        `${"/api"}/sensors/${sensorId}/last-data`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSensorLastData(data);
      return data;
    } catch {
      // Error fetching sensor last data
      setError("Failed to fetch sensor data from API");
      return null;
    }
  };

  // ฟังก์ชันดึงข้อมูล configuration ของเซ็นเซอร์
  const fetchSensorConfig = async (sensorId: string) => {
    try {
      const response = await fetch(
        `${"/api"}/sensors/${sensorId}/config`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const configData = await response.json();

      // Update configData state with fetched configuration
      setConfigData((prev) => ({
        ...prev,
        serialNumber: configData.serial_number || prev.serialNumber,
        sensorName: configData.sensor_name,
        machineNumber: configData.machine_no,
        installationPoint: configData.installed_point,
        machineClass: configData.machine_class || prev.machineClass,
        fmax: configData.fmax || prev.fmax,
        lor: configData.lor || prev.lor,
        // Use g_scale from config endpoint (API value)
        g_scale: configData.g_scale || prev.g_scale || 16,
        time_interval: configData.time_interval || prev.time_interval,
        alarm_ths: configData.alarm_ths || prev.alarm_ths,
        thresholdMin: configData.threshold_min?.toString() || prev.thresholdMin,
        thresholdMedium:
          configData.threshold_medium?.toString() || prev.thresholdMedium,
        thresholdMax: configData.threshold_max?.toString() || prev.thresholdMax,
        notes: configData.note || prev.notes,
        hAxisEnabled: configData.h_axis_enabled !== false, // Default to true if not specified
        vAxisEnabled: configData.v_axis_enabled !== false, // Default to true if not specified
        aAxisEnabled: configData.a_axis_enabled !== false, // Default to true if not specified
        image_url: configData.image_url || prev.image_url,
      }));

      return configData;
    } catch {
      // Error fetching sensor config - this is not critical, so we don't set error state
      console.log("Failed to fetch sensor config from API, using defaults");
      return null;
    }
  };

  // ฟังก์ชันดึงข้อมูลพื้นฐานของเซ็นเซอร์
  const fetchSensor = async () => {
    // Check if params.id exists
    if (!params?.id) {
      setError("Sensor ID is missing");
      setLoading(false);
      return;
    }

    const sensorId = params.id as string;

    try {
      // ดึงข้อมูลล่าสุดจากเซ็นเซอร์
      const lastData = await fetchSensorLastData(sensorId);
      if (lastData) {
        // สร้างข้อมูลเซ็นเซอร์จาก API ถ้าไม่พบในฐานข้อมูล
        setSensor({
          id: sensorId,
          name: lastData.name,
          serialNumber: `S-${sensorId.substring(0, 4).toUpperCase()}`,
          machineName: lastData.sensor_type || "API Machine",
          sensor_type: lastData.sensor_type || "Master",
          location: "API Location",
          installationDate: new Date("2025-04-26").getTime(),
          lastUpdated: new Date(lastData.data.datetime).getTime(),
          readings: [],
          status: "ok",
          maintenanceHistory: [],
          model: "",
          operationalStatus: "running",
          batteryLevel: lastData.data.battery,
          connectivity: "online",
          signalStrength: 0,
          vibrationH: "normal",
          vibrationV: "normal",
          vibrationA: "normal",
          // Add new API configuration fields
          fmax: lastData.fmax,
          lor: lastData.lor,
          g_scale: lastData.g_scale,
          alarm_ths: lastData.alarm_ths,
          time_interval: lastData.time_interval,
        });
      } else {
        // สร้างข้อมูลเซ็นเซอร์เริ่มต้นถ้าไม่พบข้อมูล
        setSensor({
          id: sensorId,
          name: `Sensor ${sensorId.substring(0, 8)}`,
          serialNumber: `S-${sensorId.substring(0, 4).toUpperCase()}`,
          machineName: "Test Machine",
          sensor_type: "Master",
          location: "Test Location",
          installationDate: new Date("2025-04-26").getTime(),
          lastUpdated: Date.now(),
          readings: [],
          status: "ok",
          maintenanceHistory: [],
          model: "",
          operationalStatus: "running",
          batteryLevel: 80,
          connectivity: "online",
          signalStrength: 0,
          vibrationH: "normal",
          vibrationV: "normal",
          vibrationA: "normal",
        });
      }
    } catch {
      // Error fetching sensor
      setError("Failed to fetch sensor data");
      // สร้างข้อมูลเซ็นเซอร์เริ่มต้นเมื่อเกิดข้อผิดพลาด
      setSensor({
        id: sensorId,
        name: `Sensor ${sensorId.substring(0, 8)}`,
        serialNumber: `S-${sensorId.substring(0, 4).toUpperCase()}`,
        machineName: "Test Machine",
        sensor_type: "Master",
        location: "Test Location",
        installationDate: new Date("2025-04-26").getTime(),
        lastUpdated: Date.now(),
        readings: [],
        status: "ok",
        maintenanceHistory: [],
        model: "",
        operationalStatus: "running",
        batteryLevel: 80,
        connectivity: "online",
        signalStrength: 0,
        vibrationH: "normal",
        vibrationV: "normal",
        vibrationA: "normal",
      });
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันดึงข้อมูลวันที่ของเซ็นเซอร์
  const fetchSensorDatetimes = async (sensorId: string) => {
    try {
      const response = await fetch(
        `${"/api"}/sensors/${sensorId}/datetimes`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDatetimes(data.datetimes);
      return data.datetimes;
    } catch {
      // Error fetching sensor datetimes
      setError("Failed to fetch sensor datetimes");
      return [];
    }
  };
  // Set mounted state to prevent SSR hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // ฟังก์ชันดึงข้อมูลเมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    if (mounted && params?.id) {
      const sensorId = params.id as string;
      // Fetch data in parallel instead of sequentially
      Promise.all([
        fetchSensor(),
        fetchSensorDatetimes(sensorId),
        fetchSensorConfig(sensorId),
      ]).catch((error) => {
        console.error("Error fetching sensor data:", error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, mounted]);

  // Update config data when sensorLastData changes
  useEffect(() => {
    if (sensorLastData) {
      setConfigData((prev) => ({
        ...prev,
        // Keep existing values for user-editable fields (prev instead of configData to avoid dependency warning)
        sensorName: prev.sensorName || "",
        machineNumber: prev.machineNumber || "",
        installationPoint: prev.installationPoint || "",
        machineClass: prev.machineClass || "",
        // Update from sensorLastData
        fmax: sensorLastData.fmax || 10000,
        lor: sensorLastData.lor || 6400,
        // Use g_scale from sensorLastData (should match API config)
        g_scale: sensorLastData.g_scale || prev.g_scale || 16,
        time_interval: sensorLastData.time_interval || 3,
        alarm_ths: sensorLastData.alarm_ths || 5.0,
        thresholdMin: prev.thresholdMin || "",
        thresholdMedium: prev.thresholdMedium || "",
        thresholdMax: prev.thresholdMax || "",
        notes: prev.notes || "", // Keep existing value if available
      }));
    }
  }, [sensorLastData, sensor]);

  // Modal and related handlers removed (routing to /register is used instead)

  // Use utility function for card background color - use configData for threveold values
  const getCardBackgroundColorCallback = useCallback(
    (velocityValue: number) => {
      // Use configData for threshold values since we fetch complete config from API
      // Use the same fallback logic as the main page for consistency

      const sensorConfig: SensorConfig = {
        thresholdMin: configData.thresholdMin
          ? Number(configData.thresholdMin)
          : 0.1,
        thresholdMedium: configData.thresholdMedium
          ? Number(configData.thresholdMedium)
          : 0.125,
        thresholdMax: configData.thresholdMax
          ? Number(configData.thresholdMax)
          : 0.15,
        machineClass: configData.machineClass || undefined,
      };

      return getCardBackgroundColor(velocityValue, sensorConfig);
    },
    [configData]
  );

  // Pre-calculate all chart data for all axes and units
  const allChartData = useMemo(() => {
    if (
      !sensorLastData?.data ||
      !Array.isArray(sensorLastData.data.h) ||
      !Array.isArray(sensorLastData.data.v) ||
      !Array.isArray(sensorLastData.data.a) ||
      sensorLastData.data.h.length === 0
    ) {
      return {
        hasData: false,
        h: {} as { [unit: string]: ReturnType<typeof prepareChartData> },
        v: {} as { [unit: string]: ReturnType<typeof prepareChartData> },
        a: {} as { [unit: string]: ReturnType<typeof prepareChartData> },
      };
    }

    const totalTime = configData.lor / configData.fmax;
    const timeInterval = totalTime / (sensorLastData.data.h.length - 1);

    // Calculate data for all axes
    const axes = {
      h: sensorLastData.data.h,
      v: sensorLastData.data.v,
      a: sensorLastData.data.a,
    };

    const units = [
      "Acceleration (G)",
      "Acceleration (mm/s²)",
      "Velocity (mm/s)",
    ];
    interface VibrationDataResult {
      hasData: boolean;
      h: {
        [unit: string]: ReturnType<typeof prepareChartData>;
      };
      v: {
        [unit: string]: ReturnType<typeof prepareChartData>;
      };
      a: {
        [unit: string]: ReturnType<typeof prepareChartData>;
      };
    }
    const result: VibrationDataResult = {
      hasData: true,
      h: {},
      v: {},
      a: {},
    };

    // Create chart config from configData
    const chartConfig: ChartConfigData = {
      lor: configData.lor,
      fmax: configData.fmax,
      g_scale: configData.g_scale,
    };

    // Pre-calculate for all combinations of axes and units
    Object.entries(axes).forEach(([axisKey, axisData]) => {
      if (axisKey === "h" || axisKey === "v" || axisKey === "a") {
        result[axisKey] = {};
        units.forEach((unit) => {
          result[axisKey][unit] = prepareChartData(
            axisData,
            unit,
            timeInterval,
            chartConfig
          );
        });
      }
    });

    return result;
  }, [sensorLastData?.data, configData]);

  // Get current selected data
  const prepareVibrationData = useCallback((): {
    hasData: boolean;
    timeData: ChartTimeData | null;
    freqData: ChartFreqData | null;
    yAxisLabel?: string;
    rmsValue?: string;
    peakValue?: string;
    peakToPeakValue?: string;
    topPeaks?: { peak: number; rms: string; frequency: string }[];
  } => {
    if (!allChartData.hasData) {
      return {
        hasData: false,
        timeData: null,
        freqData: null,
      };
    }

    // Map axis selection to data key
    const axisKey: "h" | "v" | "a" =
      selectedAxis === "H-axis" ? "h" : selectedAxis === "V-axis" ? "v" : "a";

    if (!allChartData.hasData) {
      return {
        hasData: false,
        timeData: null,
        freqData: null,
      };
    }

    const axisData = allChartData[axisKey];
    if (!axisData || !axisData[selectedUnit]) {
      return {
        hasData: false,
        timeData: null,
        freqData: null,
      };
    }

    const selectedData = axisData[selectedUnit];

    return {
      hasData: true,
      ...selectedData,
    };
  }, [allChartData, selectedAxis, selectedUnit]);

  // Use real data if available, otherwise use sensor data or fallback
  const currentData = sensorLastData?.data || {
    temperature: 0,
    h: [0],
    v: [0],
    a: [0],
    battery: sensor?.batteryLevel || 0,
    datetime: sensor?.lastUpdated
      ? new Date(sensor.lastUpdated).toISOString()
      : new Date().toISOString(),
    rssi: 0,
    flag: "",
  };

  // Ensure all values are numbers
  const safeTemp = Number(currentData.temperature) || 0;

  const vibrationData = useMemo(() => {
    if (loading || !sensorLastData)
      return { hasData: false, timeData: null, freqData: null };
    return prepareVibrationData();
  }, [prepareVibrationData, loading, sensorLastData]);

  // Extract axis stats from pre-calculated data
  const xStats = useMemo(() => {
    if (loading || !allChartData.hasData)
      return {
        accelTopPeak: "0.000",
        velocityTopPeak: "0.000",
        dominantFreq: "0.000",
        topPeaks: { G: [], mmPerS2: [], mmPerS: [] },
      };

    const hData = allChartData.h;
    return {
      accelTopPeak:
        hData["Acceleration (G)"]?.topPeaks?.[0]?.peak?.toFixed(2) || "0.000",
      velocityTopPeak:
        hData["Velocity (mm/s)"]?.topPeaks?.[0]?.peak?.toFixed(2) || "0.000",
      dominantFreq:
        hData["Velocity (mm/s)"]?.topPeaks?.[0]?.frequency || "0.000",
      topPeaks: {
        G: hData["Acceleration (G)"]?.topPeaks || [],
        mmPerS2: hData["Acceleration (mm/s²)"]?.topPeaks || [],
        mmPerS: hData["Velocity (mm/s)"]?.topPeaks || [],
      },
    };
  }, [allChartData, loading]);

  const yStats = useMemo(() => {
    if (loading || !allChartData.hasData)
      return {
        accelTopPeak: "0.000",
        velocityTopPeak: "0.000",
        dominantFreq: "0.000",
        topPeaks: { G: [], mmPerS2: [], mmPerS: [] },
      };

    const vData = allChartData.v;
    return {
      accelTopPeak:
        vData["Acceleration (G)"]?.topPeaks?.[0]?.peak?.toFixed(2) || "0.000",
      velocityTopPeak:
        vData["Velocity (mm/s)"]?.topPeaks?.[0]?.peak?.toFixed(2) || "0.000",
      dominantFreq:
        vData["Velocity (mm/s)"]?.topPeaks?.[0]?.frequency || "0.000",
      topPeaks: {
        G: vData["Acceleration (G)"]?.topPeaks || [],
        mmPerS2: vData["Acceleration (mm/s²)"]?.topPeaks || [],
        mmPerS: vData["Velocity (mm/s)"]?.topPeaks || [],
      },
    };
  }, [allChartData, loading]);

  const zStats = useMemo(() => {
    if (loading || !allChartData.hasData)
      return {
        accelTopPeak: "0.000",
        velocityTopPeak: "0.000",
        dominantFreq: "0.000",
        topPeaks: { G: [], mmPerS2: [], mmPerS: [] },
      };

    const aData = allChartData.a;
    return {
      accelTopPeak:
        aData["Acceleration (G)"]?.topPeaks?.[0]?.peak?.toFixed(2) || "0.000",
      velocityTopPeak:
        aData["Velocity (mm/s)"]?.topPeaks?.[0]?.peak?.toFixed(2) || "0.000",
      dominantFreq:
        aData["Velocity (mm/s)"]?.topPeaks?.[0]?.frequency || "0.000",
      topPeaks: {
        G: aData["Acceleration (G)"]?.topPeaks || [],
        mmPerS2: aData["Acceleration (mm/s²)"]?.topPeaks || [],
        mmPerS: aData["Velocity (mm/s)"]?.topPeaks || [],
      },
    };
  }, [allChartData, loading]);

  // Summary log for all axes when data changes
  useEffect(() => {
    if (sensorLastData?.name && !loading) {
      // console.log(`[SENSOR DETAIL ${sensorLastData.name}] PEAK VELOCITIES - H: ${xStats.velocityTopPeak} mm/s | V: ${yStats.velocityTopPeak} mm/s | A: ${zStats.velocityTopPeak} mm/s`);
    }
  }, [
    xStats.velocityTopPeak,
    yStats.velocityTopPeak,
    zStats.velocityTopPeak,
    sensorLastData?.name,
    loading,
  ]);

  // Early returns after all hooks
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030616]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!sensor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030616] px-4 py-8">
        <h2 className="text-2xl font-bold">Sensor not found</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/")}
        >
          Back to Sensors
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            className="mr-4 bg-transparent border-gray-700 hover:bg-gray-800"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sensor
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Sensor: {sensorLastData?.name || sensor.name}
            </h1>
            <p className="text-gray-400">
              {sensor.machineName || "Monitoring Test Machine"} •{" "}
              {sensor.location || "Test Location"}
              {sensorLastData && (
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-300">
                  Live Data
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500">
              Last updated: {formatThaiDate(String(currentData.datetime))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-transparent border-gray-700 hover:bg-gray-800"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDatetime
                  ? formatDateTime(selectedDatetime)
                  : "Select Date"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-gray-900 border-gray-800 max-h-[300px] overflow-y-auto"
            >
              {datetimes.length > 0 ? (
                datetimes.map((datetime) => (
                  <DropdownMenuItem
                    key={datetime}
                    className="text-white hover:bg-gray-800"
                    onClick={async () => {
                      setSelectedDatetime(datetime);
                      try {
                        if (!params?.id) {
                          setError("Sensor ID is missing");
                          return;
                        }
                        const response = await fetch(
                          `${"/api"}/sensors/${params.id}/last-data?datetime=${encodeURIComponent(datetime)}`,
                          {
                            headers: { Accept: "application/json" },
                          }
                        );
                        if (response.ok) {
                          const data = await response.json();
                          setSensorLastData(data);
                        } else {
                          setError(
                            "Failed to fetch sensor data for selected datetime"
                          );
                        }
                      } catch {
                        setError(
                          "Failed to fetch sensor data for selected datetime"
                        );
                      }
                    }}
                  >
                    {formatDateTime(datetime)}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem className="text-gray-500">
                  No dates available
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            className="bg-transparent border-gray-700 hover:bg-gray-800"
            onClick={() => router.push(`/sensors/${sensor.id}/history`)}
          >
            View History
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-transparent border-gray-700 hover:bg-gray-800"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-gray-900 border-gray-800"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push("/register");
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configure Sensor
              </DropdownMenuItem>
              <DropdownMenuItem>Export Data</DropdownMenuItem>
              <DropdownMenuItem>Print Report</DropdownMenuItem>
              <DropdownMenuItem>Share</DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-500 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault(); // Prevent menu from closing immediately
                  console.log("Delete selected for sensor:", sensor.id);

                  // Use setTimeout to allow the menu to close or handle async without blocking
                  setTimeout(async () => {
                    if (
                      confirm(
                        "Are you sure you want to delete this sensor? This action cannot be undone."
                      )
                    ) {
                      console.log("User confirmed delete");
                      const success = await deleteSensor(sensor.id);
                      console.log("Delete result:", success);
                      if (success) {
                        router.push("/"); // Redirect to dashboard after deletion
                      } else {
                        alert("Failed to delete sensor");
                      }
                    } else {
                      console.log("User cancelled delete");
                    }
                  }, 0);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded-md mb-4">
            {error}. Using fallback data.
          </div>
        )}

        {/* Horizontal Sensor Information */}
        <SensorDetailInfoCard
          photoUrl={configData.image_url || null}
          sensorInfo={{
            serialNumber: configData.serialNumber,
            serialName: configData.sensorName,
            machineNumber: configData.machineNumber,
            installationPoint: configData.installationPoint,
            machineClass: configData.machineClass,
            note: configData.notes,
          }}
          status={{
            battery: `${Number(sensorLastData?.data?.battery ?? sensor?.batteryLevel ?? 0) || 0}%`,
            signalStrength: `${getSignalStrength(sensorLastData?.data?.rssi || 0)} (${getSignalStrengthLabel(sensorLastData?.data?.rssi || 0)})`,
            lastUpdated: sensorLastData?.data?.datetime
              ? new Date(sensorLastData.data.datetime).toLocaleDateString()
              : "XX/XX/XXXX",
            installationDate: configData?.installationPoint ? "" : "XX/XX/XXXX",
            motorRunningTime: "8 hr.",
            statusPill: "OK",
          }}
          datetimes={datetimes}
          onEdit={() => router.push("/register")}
          onSelectDatetime={(value) => setSelectedDatetime(value)}
        />

        {/* Statistics and Analysis */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <h3 className="text-gray-400 mb-2">Temperature Statistics</h3>
                <div className="text-2xl font-bold">
                  {safeTemp.toFixed(1)}°C
                </div>
                <div className="text-sm text-gray-500">
                  Status:{" "}
                  {safeTemp > (sensorLastData?.alarm_ths || 35)
                    ? "Critical"
                    : safeTemp > (sensorLastData?.alarm_ths || 35) * 0.7
                      ? "Warning"
                      : "Normal"}
                </div>
                {sensorLastData?.alarm_ths && (
                  <div className="text-xs text-gray-600 mt-1">
                    Threshold: {sensorLastData.alarm_ths}°C
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conditionally show H-axis card */}
            {configData.hAxisEnabled && (
              <Card
                className={`border-gray-800 
              ${getCardBackgroundColorCallback(parseFloat(xStats.velocityTopPeak))}`}
              >
                <CardContent className="p-4">
                  <h3 className=" mb-2">Horizontal (H)</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="">Acceleration</span>
                      <span className="text-right ">
                        {xStats.accelTopPeak}G
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="">Velocity</span>
                      <span className="text-right ">
                        {xStats.velocityTopPeak} mm/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="">Dominant Frequency</span>
                      <span className="text-right ">
                        {xStats.dominantFreq} Hz
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conditionally show V-axis card */}
            {configData.vAxisEnabled && (
              <Card
                className={`border-gray-800
              ${getCardBackgroundColorCallback(parseFloat(yStats.velocityTopPeak))}`}
              >
                {/* {getCardBackgroundColorCallback(parseFloat(yStats.velocityTopPeak))} */}
                <CardContent className="p-4">
                  <h3 className=" mb-2">Vertical (V)</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="">Acceleration</span>
                      <span className="text-right">{yStats.accelTopPeak}G</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="">Velocity</span>
                      <span className="text-right">
                        {yStats.velocityTopPeak} mm/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="">Dominant Frequency</span>
                      <span className="text-right ">
                        {yStats.dominantFreq} Hz
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conditionally show A-axis card */}
            {configData.aAxisEnabled && (
              <Card
                className={`border-gray-800 ${getCardBackgroundColorCallback(parseFloat(zStats.velocityTopPeak))}`}
              >
                <CardContent className="p-4">
                  <h3 className="mb-2">Axial (A)</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="">Acceleration</span>
                      <span className="text-right ">
                        {zStats.accelTopPeak}G
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="">Velocity</span>
                      <span className="text-right ">
                        {zStats.velocityTopPeak} mm/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="">Dominant Frequency</span>
                      <span className="text-right ">
                        {zStats.dominantFreq} Hz
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Vibration Analysis Section */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-4">
                Vibration Frequency Analysis
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Select value={selectedAxis} onValueChange={setSelectedAxis}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select axis" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {configData.hAxisEnabled && (
                      <SelectItem value="H-axis">
                        H-axis (Horizontal)
                      </SelectItem>
                    )}
                    {configData.vAxisEnabled && (
                      <SelectItem value="V-axis">V-axis (Vertical)</SelectItem>
                    )}
                    {configData.aAxisEnabled && (
                      <SelectItem value="A-axis">A-axis (Axial)</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Acceleration (G)">
                      Acceleration (G)
                    </SelectItem>
                    <SelectItem value="Acceleration (mm/s²)">
                      Acceleration (mm/s²)
                    </SelectItem>
                    <SelectItem value="Velocity (mm/s)">
                      Velocity (mm/s)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(() => {
                if (!vibrationData.hasData) {
                  return (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-800 border border-gray-700 rounded-md">
                      <p className="text-gray-400">
                        No vibration data available for this sensor
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-900 border border-gray-800 rounded-md p-4">
                        <h4 className="text-xl font-medium mb-6">
                          Overall Statistics
                        </h4>
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-lg">RMS :</span>
                            <span className="text-lg">
                              {vibrationData.rmsValue}{" "}
                              {vibrationData.yAxisLabel}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-lg">
                              Peak :
                            </span>
                            <span className="text-lg">
                              {vibrationData.peakValue}{" "}
                              {vibrationData.yAxisLabel}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-lg">
                              Peak to Peak :
                            </span>
                            <span className="text-lg">
                              {vibrationData.peakToPeakValue}{" "}
                              {vibrationData.yAxisLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-md p-4">
                        <h4 className="text-xl font-medium mb-6">
                          Top 5 Peaks
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-center table-fixed">
                            <thead>
                              <tr>
                                <th className="w-1/2 px-4 py-2">RMS</th>
                                <th className="w-1/2 px-4 py-2">Frequency</th>
                              </tr>
                            </thead>
                            <tbody>
                              {vibrationData.topPeaks &&
                                vibrationData.topPeaks.map((row, i) => (
                                  <tr key={i}>
                                    <td className="w-1/2 px-4 py-2">
                                      {row.rms}
                                    </td>
                                    <td className="w-1/2 px-4 py-2">
                                      {row.frequency} Hz
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <>
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-4">
                          Time domain
                        </h3>
                        <div className="h-64 bg-gray-800 border border-gray-700 rounded-md p-2">
                          <div className="flex items-center justify-center h-full text-gray-400">
                            Chart display is currently disabled.
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-4">
                          Frequency domain
                        </h3>
                        <div className="h-64 bg-gray-800 border border-gray-700 rounded-md p-2">
                          <div className="flex items-center justify-center h-full text-gray-400">
                            Chart display is currently disabled.
                          </div>
                        </div>
                      </div>
                    </>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Configuration Modal removed */}
    </div>
  );
}
