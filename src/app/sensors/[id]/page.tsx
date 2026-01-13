"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  MoreVertical,
  Settings,
  Wifi,
  WifiOff,
  WifiHigh,
  WifiLow,
  WifiZero,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  cn,
  formatThaiDate,
  formatDate,
  getSignalStrength,
  getSignalStrengthLabel,
} from "@/lib/utils";
import { exportToCSV, exportToExcel } from "@/lib/exportUtils";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import dynamic from "next/dynamic";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
// Import calculation functions from utility
import {
  accelerationGToMmPerSecSquared,
  calculateVelocityFromFrequency,
  findTopPeaks,
  reconstructTimeDomainFromAPI,
  TimeReconstructionRequest,
  calculateFFT,
} from "@/lib/utils/sensorCalculations";
import {
  SensorConfig,
  getVibrationLevelFromConfig,
  getCardBackgroundColor,
} from "@/lib/utils/vibrationUtils";
import type { Sensor } from "@/lib/types";
import { deleteSensor } from "@/lib/data/sensors";
import { useAuth } from "@/components/auth/AuthProvider";

ChartJS.register(
  zoomPlugin,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// First, update the SensorLastData interface to properly handle the vibration data arrays
interface SensorLastData {
  id: string;
  name: string;
  sensor_name?: string | null;
  sensor_type: string | null;
  unit: string | null;
  fmax: number;
  lor: number;
  g_scale: number;
  high_pass: number;
  time_interval: number;
  // Config fields
  machine_no?: string | null;
  machine_class?: string | null;
  installed_point?: string | null;
  note?: string | null;
  threshold_min?: number;
  threshold_medium?: number;
  threshold_max?: number;
  alarm_ths?: number;
  image_url?: string | null;
  data: {
    datetime: string;
    acc_h?: number[];
    freq_h?: number[];
    acc_v?: number[];
    freq_v?: number[];
    acc_a?: number[];
    freq_a?: number[];
    velo_rms_h?: number;
    velo_rms_v?: number;
    velo_rms_a?: number;
    temperature?: number;
    battery?: number;
    rssi?: number;
    level_vibration?: number;
    level_temperature?: number;
    // For /sensors/with-last-data response format
    last_32_h?: number[][];
    last_32_v?: number[][];
    last_32_a?: number[][];
    f_point_h?: number[];
    f_point_v?: number[];
    f_point_a?: number[];
    g_rms_h?: number;
    g_rms_v?: number;
    g_rms_a?: number;
    a_rms_h?: number;
    a_rms_v?: number;
    a_rms_a?: number;
    // New array fields
    a_h_data?: number[];
    a_v_data?: number[];
    a_a_data?: number[];
    v_h_data?: number[];
    v_v_data?: number[];
    v_a_data?: number[];
  };
}

interface WithLastDataSensor {
  id: string;
  name?: string;
  sensor_name?: string | null;
  sensor_type?: string | null;
  unit?: string | null;
  fmax?: number;
  lor?: number;
  g_scale?: number;
  high_pass?: number;
  time_interval?: number;
  machine_no?: string | null;
  machine_class?: string | null;
  installed_point?: string | null;
  note?: string | null;
  threshold_min?: number;
  threshold_medium?: number;
  threshold_max?: number;
  alarm_ths?: number;
  image_url?: string | null;
  last_data?: {
    datetime?: string;
    acc_h?: number[];
    freq_h?: number[];
    acc_v?: number[];
    freq_v?: number[];
    acc_a?: number[];
    freq_a?: number[];
    velo_rms_h?: number;
    velo_rms_v?: number;
    velo_rms_a?: number;
    temperature?: number;
    battery?: number;
    rssi?: number;
    level_vibration?: number;
    level_temperature?: number;
    last_32_h?: number[][];
    last_32_v?: number[][];
    last_32_a?: number[][];
    f_point_h?: number[];
    f_point_v?: number[];
    f_point_a?: number[];
    g_rms_h?: number;
    g_rms_v?: number;
    g_rms_a?: number;
    a_rms_h?: number;
    a_rms_v?: number;
    a_rms_a?: number;
    a_h_data?: number[];
    a_v_data?: number[];
    a_a_data?: number[];
    v_h_data?: number[];
    v_v_data?: number[];
    v_a_data?: number[];
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

// Helper to pair and sort data by frequency (small to large)
function prepareCombinedSortedData(
  freqArray: number[],
  magArray: number[]
): {
  sortedFreq: number[];
  sortedMag: number[];
} {
  if (!freqArray || !magArray || freqArray.length !== magArray.length) {
    return { sortedFreq: [], sortedMag: [] };
  }

  // Create pairs
  const pairs = freqArray.map((f, i) => ({ f, m: magArray[i] }));

  // Sort by frequency (small to large)
  pairs.sort((a, b) => a.f - b.f);

  // Unzip
  return {
    sortedFreq: pairs.map((p) => p.f),
    sortedMag: pairs.map((p) => p.m),
  };
}

// ฟังก์ชันเตรียมข้อมูลสำหรับกราฟ
function prepareChartData(
  accData: number[], // Acceleration data already in G units from API
  freqData: number[], // Frequency data from API
  selectedUnit: string,
  timeInterval: number,
  configData: ChartConfigData,
  fPoints?: number[], // Optional explicit frequency points for X-axis
  rmsOverride?: number // Optional: Use API provided RMS value instead of calculating
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
  let effectiveAccData = accData;

  const isSpectrumData =
    accData && accData.length > 0 && accData.length <= configData.lor * 1.5; // Heuristic: Time data is usually ~2.56x LOR

  // If we have data but it looks like Spectrum (length ~ LOR), or if we explicitly fallback to freqData
  if (
    isSpectrumData ||
    ((!effectiveAccData || effectiveAccData.length === 0) &&
      freqData &&
      freqData.length > 0)
  ) {
    try {
      console.log("Detecting Spectrum Data - Reconstructing Time Domain...");
      // If effectiveAccData is present but 'short' (Spectrum), use it as amplitudes.
      // Otherwise fallback to freqData.
      const amplitudes =
        isSpectrumData && effectiveAccData.length > 0
          ? effectiveAccData
          : freqData;

      // Reconstruct using the user's summation of sines algorithm
      // Ensure we have frequency points (indices)
      let effectiveFPoints = fPoints;
      if (!effectiveFPoints || effectiveFPoints.length !== amplitudes.length) {
        // If no explicit points, assume linear distribution (0, 1, 2...)
        effectiveFPoints = Array.from(
          { length: amplitudes.length },
          (_, i) => i
        );
      }

      const request: TimeReconstructionRequest = {
        LOR: configData.lor,
        Fmax: configData.fmax,
        Acc: amplitudes,
        FreqPoint: effectiveFPoints,
        areFrequenciesInHz: !!(fPoints && fPoints.length === amplitudes.length),
      };

      const { signal } = reconstructTimeDomainFromAPI(request);
      effectiveAccData = signal;
    } catch (e) {
      console.error("Error reconstructing time domain signal:", e);
    }
  }

  if (!effectiveAccData || effectiveAccData.length === 0) {
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

  // เธชเธฃเนเธฒเธเธเนเธฒเธขเน€เธงเธฅเธฒเธชเธณเธซเธฃเธฑเธเธเธฃเธฒเธ
  const n = effectiveAccData.length;
  // Calculate theoretical total time based on config (e.g. 1600/400 = 4.0s)
  const theoreticalTotalTime = configData.lor / configData.fmax;

  const timeLabels = Array.from({ length: n }, (_, i) => {
    // Force the last label to match the theoretical total time exactly
    if (i === n - 1) return theoreticalTotalTime.toFixed(4);
    return ((i * theoreticalTotalTime) / (n - 1)).toFixed(4);
  });

  // เธเธฃเธฐเธกเธงเธฅเธเธฅเธเนเธญเธกเธนเธฅเธ•เธฒเธกเธซเธเนเธงเธขเธ—เธตเนเน€เธฅเธทเธญเธ
  let processedData: number[];
  let yAxisLabel: string;

  // No internal conversion needed as we pass the correct data arrays directly

  if (selectedUnit === "Acceleration (G)") {
    processedData = effectiveAccData;
    yAxisLabel = "Acceleration (G)";
  } else if (selectedUnit === "Acceleration (mm/s²)") {
    processedData = effectiveAccData;
    yAxisLabel = "Acceleration (rms, mm/s²)";
  } else {
    processedData = effectiveAccData;
    yAxisLabel = "Velocity (rms, mm/s)";
  }

  // ===== OVERALL STATISTICS CALCULATION =====
  // Calculate RMS using the same method as getAxisTopPeakStats
  const rms =
    rmsOverride !== undefined
      ? rmsOverride
      : processedData.length > 0
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

  // เธชเธฃเนเธฒเธเธเนเธญเธกเธนเธฅเธชเธณเธซเธฃเธฑเธเธเธฃเธฒเธเนเธ”เน€เธกเธเน€เธงเธฅเธฒ
  const timeChartData = {
    labels: timeLabels,
    rmsValue,
    peakValue,
    peakToPeakValue,
    datasets: [
      {
        label: yAxisLabel,
        data: processedData,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.1,
        pointRadius: 0,
      },
    ],
  };

  // ===== FFT CALCULATIONS =====
  // Calculate FFT from Time Domain Data (effectiveAccData)
  // effectiveAccData is already in the target unit (G, mm/s^2, or mm/s) based on caller logic
  const fftResult = calculateFFT(effectiveAccData, configData.fmax);
  const magnitude = fftResult.magnitude;
  const freqAxis = fftResult.frequency;

  // Check if we have valid frequency data
  if (!magnitude || magnitude.length === 0) {
    const emptyFreqData = {
      labels: [],
      datasets: [
        {
          label: `${yAxisLabel}`, // Keep consistent label
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
  // Use calculated FFT data
  let freqMagnitude = magnitude;
  // Convert numeric frequency to string labels
  let freqLabels = freqAxis.map((f: number) => f.toFixed(2));

  // Limit frequency range if needed (though calculateFFT logic should handle it)
  // current calculating FFT returns full N points (0 to Fs)
  // Usually we only show up to Fmax.
  // Fmax is configData.fmax.
  // Filter out frequencies > Fmax
  const maxDisplayFreq = configData.fmax;
  const cutoffIndex = freqAxis.findIndex((f: number) => f > maxDisplayFreq);
  if (cutoffIndex !== -1) {
    freqMagnitude = freqMagnitude.slice(0, cutoffIndex);
    freqLabels = freqLabels.slice(0, cutoffIndex);
  }

  // Use findTopPeaks function for consistent peak detection
  let topPeaks: { peak: number; rms: string; frequency: string }[] = [];
  let pointBackgroundColor: string[] = [];

  // Use peak finding algorithm on the calculated spectrum
  const { topPeaks: processedPeaks, pointBackgroundColor: processedColors } =
    findTopPeaks(freqMagnitude, freqLabels, configData.lor, 5);
  topPeaks = processedPeaks;
  pointBackgroundColor = processedColors;

  const freqChartData = {
    labels: freqLabels,
    datasets: [
      {
        label: `${yAxisLabel} Magnitude`,
        data: freqMagnitude,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.1,
        pointRadius: 0, // Reduce radius for dense data
        pointBackgroundColor: pointBackgroundColor,
      },
    ],
  };

  // Fix pointBackgroundColor slice if we sliced data
  if (
    pointBackgroundColor.length > 0 &&
    freqMagnitude.length !== pointBackgroundColor.length
  ) {
    freqChartData.datasets[0].pointBackgroundColor = pointBackgroundColor.slice(
      0,
      freqMagnitude.length
    );
  }

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

// Display as: 20 Sep 2025, 19:00:00 (day first)
// Display as: 20 Sep 2025, 19:00:00 (day first)
const formatDateTimeDayFirst = (dateString: string) => {
  if (!dateString) return "-";
  // Fix: Treat server time as Local by removing Z if present
  const rawString = dateString.endsWith("Z")
    ? dateString.slice(0, -1)
    : dateString;
  const date = new Date(rawString);

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit", // Use numeric or short as preferred, user asked for numeric before? keeping short for now matching comment
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

interface SensorPageConfig {
  serialNumber: string;
  sensorName: string;
  machineNumber: string;
  installationPoint: string;
  machineClass: string;
  fmax: number;
  lor: number;
  g_scale: number;
  time_interval: number;
  alarm_ths: number;
  thresholdMin: string | number;
  thresholdMedium: string | number;
  thresholdMax: string | number;
  notes: string;
  image_url: string;
  hAxisEnabled: boolean;
  vAxisEnabled: boolean;
  aAxisEnabled: boolean;
}

export default function SensorDetailPage() {
  const router = useRouter();
  const params = useParams() as { id: string };
  const { toast } = useToast();

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
  const [selectedDatetime, setSelectedDatetime] = useState<string | null>(null);
  const [datetimes, setDatetimes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sensorImage, setSensorImage] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Fetch sensor history
  const fetchSensorHistory = async (sensorId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${sensorId}/history?limit=10`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        let historyData = [];

        if (Array.isArray(data)) {
          historyData = data;
        } else if (data && Array.isArray(data.history)) {
          historyData = data.history;
        } else if (data && data.data) {
          if (Array.isArray(data.data)) {
            historyData = data.data;
          } else if (Array.isArray(data.data.history)) {
            historyData = data.data.history;
          }
        }
        setHistory(historyData);
      }
    } catch (error) {
      console.error("Failed to fetch sensor history:", error);
    }
  };

  // Fetch sensor image directly from API
  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${params.id}/image`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 0) {
            objectUrl = URL.createObjectURL(blob);
            setSensorImage(objectUrl);
          }
        }
      } catch (error) {
        console.error("Failed to fetch sensor image:", error);
      }
    };

    if (params.id) {
      fetchImage();
    }

    // Cleanup
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [params.id]); // Removed sensorImage from deps to prevent infinite loop

  const sortedDatetimes = useMemo(
    () =>
      [...datetimes].sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      ),
    [datetimes]
  );
  const [configData, setConfigData] = useState<SensorPageConfig>({
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

  const getCardBackgroundColorCallback = useCallback(
    (velocity: number) => {
      return getCardBackgroundColor(velocity, configData);
    },
    [configData]
  );

  // Helper to determine text color based on background
  // User Rule:
  // - Red (#ff2b05), Green (#00e200), Orange (#ff9900) -> White Text
  // - Yellow (#ffff00 / #fae739) -> Black Text
  // - Others (Default) -> Black Text
  const shouldTextBeWhite = (colorClass: string) => {
    const lower = colorClass.toLowerCase();
    return (
      // lower.includes("bg-[#ff4d4d]") || // Critical - User requested Black
      // lower.includes("bg-[#72ff82]") || // Normal - User requested Black
      // lower.includes("bg-[#ff8c1a]")    // Concern - User requested Black
      lower.includes("bg-[#626262]") // Lost (Dark Gray) - Keep White
    );
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
  // Function to fetch sensor details from GET /sensors/:id
  const fetchSensorDetails = async (sensorId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${sensorId}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("API Response from /sensors/:id:", data);

        // Update configData with values from this specific endpoint
        // This takes precedence over last-data defaults
        setConfigData((prev) => ({
          ...prev,
          sensorName: data.name || prev.sensorName,
          machineNumber: data.machine_no || prev.machineNumber,
          installationPoint: data.installed_point || prev.installationPoint,
          machineClass: data.machine_class || prev.machineClass,
          // Use values from this API, fallback to existing or defaults
          fmax: data.fmax || 10000,
          lor: data.lor || 6400,
          g_scale: data.g_scale || 16,
          high_pass: data.high_pass || 0,
          time_interval: data.time_interval || 3,
          alarm_ths: data.alarm_ths || 5.0,
          thresholdMin: data.threshold_min || prev.thresholdMin,
          thresholdMedium: data.threshold_medium || prev.thresholdMedium,
          thresholdMax: data.threshold_max || prev.thresholdMax,
          notes: data.note || prev.notes,
          image_url: data.image_url || prev.image_url,
        }));

        return data;
      }
    } catch (error) {
      console.error("Error fetching sensor details:", error);
    }
  };

  // ฟังก์ชันดึงข้อมูลล่าสุดจากเซ็นเซอร์
  // ฟังก์ชันดึงข้อมูลล่าสุดของเซ็นเซอร์
  const fetchSensorLastData = async (sensorId: string, datetime?: string) => {
    try {
      // Try fetching from /sensors/${sensorId}/last-data first
      const url = datetime
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${sensorId}/last-data?datetime=${encodeURIComponent(datetime)}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${sensorId}/last-data`;

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("API Response from /sensors/${sensorId}/last-data:", data);
        console.log(
          "Data has acc_h:",
          Array.isArray(data.acc_h),
          "length:",
          data.acc_h?.length
        );
        console.log("Data has velo_rms_h:", data.velo_rms_h);

        // Transform the response to match SensorLastData interface
        const transformedData: SensorLastData = {
          id: data.id,
          name: data.name,
          sensor_name: data.sensor_name,
          sensor_type: data.sensor_type,
          unit: data.unit,
          // Note: We will rely on fetchSensorDetails for reliable config
          fmax: data.fmax,
          lor: data.lor,
          g_scale: data.g_scale,
          high_pass: data.high_pass || 0,
          time_interval: data.time_interval,
          // ... rest of fields
          machine_no: data.machine_no,
          machine_class: data.machine_class,
          installed_point: data.installed_point,
          note: data.note,
          threshold_min: data.threshold_min,
          threshold_medium: data.threshold_medium,
          threshold_max: data.threshold_max,
          alarm_ths: data.alarm_ths,
          image_url: data.image_url,
          data: {
            datetime: data.datetime || data.data?.datetime || "",
            acc_h: data.acc_h || data.data?.acc_h || [],
            freq_h: data.freq_h || data.data?.freq_h || [],
            acc_v: data.acc_v || data.data?.acc_v || [],
            freq_v: data.freq_v || data.data?.freq_v || [],
            acc_a: data.acc_a || data.data?.acc_a || [],
            freq_a: data.freq_a || data.data?.freq_a || [],
            velo_rms_h: data.velo_rms_h || data.data?.velo_rms_h || 0,
            velo_rms_v: data.velo_rms_v || data.data?.velo_rms_v || 0,
            velo_rms_a: data.velo_rms_a || data.data?.velo_rms_a || 0,
            temperature: data.temperature || data.data?.temperature || 0,
            battery: data.battery || data.data?.battery || 0,
            rssi: data.rssi || data.data?.rssi || 0,
            level_vibration: data.level_vibration || data.data?.level_vibration,
            level_temperature:
              data.level_temperature || data.data?.level_temperature,
            // For /sensors/with-last-data response format
            last_32_h: data.last_32_h || data.data?.last_32_h,
            last_32_v: data.last_32_v || data.data?.last_32_v,
            last_32_a: data.last_32_a || data.data?.last_32_a,
            // New fields mapping
            f_point_h: data.f_point_h || data.data?.f_point_h || [],
            f_point_v: data.f_point_v || data.data?.f_point_v || [],
            f_point_a: data.f_point_a || data.data?.f_point_a || [],
            g_rms_h: data.g_rms_h || data.data?.g_rms_h,
            g_rms_v: data.g_rms_v || data.data?.g_rms_v,
            g_rms_a: data.g_rms_a || data.data?.g_rms_a,
            a_rms_h: data.a_rms_h || data.data?.a_rms_h,
            a_rms_v: data.a_rms_v || data.data?.a_rms_v,
            a_rms_a: data.a_rms_a || data.data?.a_rms_a,
            a_h_data: data.a_h_data || data.data?.a_h_data,
            a_v_data: data.a_v_data || data.data?.a_v_data,
            a_a_data: data.a_a_data || data.data?.a_a_data,
            v_h_data: data.v_h_data || data.data?.v_h_data,
            v_v_data: data.v_v_data || data.data?.v_v_data,
            v_a_data: data.v_a_data || data.data?.v_a_data,
          },
        };

        return transformedData;
      }

      // Fallback: Try fetching from /sensors/with-last-data
      console.log(
        "Failed to fetch from /sensors/${sensorId}/last-data, trying /sensors/with-last-data"
      );
      const withDataResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/with-last-data`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      if (withDataResponse.ok) {
        const allSensors =
          (await withDataResponse.json()) as WithLastDataSensor[];
        console.log("API Response from /sensors/with-last-data:", allSensors);

        // Find the specific sensor by ID
        const sensorData = allSensors.find(
          (sensorItem) => sensorItem.id === sensorId
        );

        if (sensorData) {
          console.log("Found sensor in /sensors/with-last-data:", sensorData);
          console.log("Sensor has last_data:", !!sensorData.last_data);
          console.log(
            "last_data has last_32_h:",
            Array.isArray(sensorData.last_data?.last_32_h),
            "length:",
            sensorData.last_data?.last_32_h?.length
          );
          console.log(
            "last_data velo_rms_h:",
            sensorData.last_data?.velo_rms_h
          );

          // Transform the response to match SensorLastData interface
          const transformedData: SensorLastData = {
            id: sensorData.id,
            name:
              sensorData.name ||
              sensorData.sensor_name ||
              sensorData.id ||
              "Unknown Sensor",
            sensor_name: sensorData.sensor_name ?? null,
            sensor_type: sensorData.sensor_type ?? null,
            unit: sensorData.unit ?? null,
            fmax: sensorData.fmax ?? 0,
            lor: sensorData.lor ?? 0,
            g_scale: sensorData.g_scale ?? 16,
            high_pass: sensorData.high_pass || 0,
            time_interval: sensorData.time_interval ?? 0,
            // Config fields from API
            machine_no: sensorData.machine_no,
            machine_class: sensorData.machine_class,
            installed_point: sensorData.installed_point,
            note: sensorData.note,
            threshold_min: sensorData.threshold_min,
            threshold_medium: sensorData.threshold_medium,
            threshold_max: sensorData.threshold_max,
            alarm_ths: sensorData.alarm_ths,
            image_url: sensorData.image_url,
            data: {
              datetime: sensorData.last_data?.datetime || "",
              acc_h: sensorData.last_data?.acc_h,
              freq_h: sensorData.last_data?.freq_h,
              acc_v: sensorData.last_data?.acc_v,
              freq_v: sensorData.last_data?.freq_v,
              acc_a: sensorData.last_data?.acc_a,
              freq_a: sensorData.last_data?.freq_a,
              velo_rms_h: sensorData.last_data?.velo_rms_h,
              velo_rms_v: sensorData.last_data?.velo_rms_v,
              velo_rms_a: sensorData.last_data?.velo_rms_a,
              temperature: sensorData.last_data?.temperature,
              battery: sensorData.last_data?.battery,
              rssi: sensorData.last_data?.rssi,
              level_vibration: sensorData.last_data?.level_vibration,
              level_temperature: sensorData.last_data?.level_temperature,
              // Include last_32_h/v/a arrays from /sensors/with-last-data
              last_32_h: sensorData.last_data?.last_32_h,

              last_32_v: sensorData.last_data?.last_32_v,
              last_32_a: sensorData.last_data?.last_32_a,
              // New fields mapping
              f_point_h: sensorData.last_data?.f_point_h,
              f_point_v: sensorData.last_data?.f_point_v,
              f_point_a: sensorData.last_data?.f_point_a,
              g_rms_h: sensorData.last_data?.g_rms_h,
              g_rms_v: sensorData.last_data?.g_rms_v,
              g_rms_a: sensorData.last_data?.g_rms_a,
              a_rms_h: sensorData.last_data?.a_rms_h,
              a_rms_v: sensorData.last_data?.a_rms_v,
              a_rms_a: sensorData.last_data?.a_rms_a,
              a_h_data: sensorData.last_data?.a_h_data,
              a_v_data: sensorData.last_data?.a_v_data,
              a_a_data: sensorData.last_data?.a_a_data,
              v_h_data: sensorData.last_data?.v_h_data,
              v_v_data: sensorData.last_data?.v_v_data,
              v_a_data: sensorData.last_data?.v_a_data,
            },
          };

          return transformedData;
        }
      }

      // If both fail, return null
      setError("Sensor not found in API");
      return null;
    } catch (error) {
      // Error fetching sensor last data
      console.error("Error fetching sensor last data:", error);
      setError("Failed to fetch sensor data from API");
      return null;
    }
  };

  // ฟังก์ชันดึงข้อมูล configuration ของเซ็นเซอร์
  const fetchSensorConfig = async (sensorId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${sensorId}/config`,
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
      console.log("API Response from /sensors/${sensorId}/config:", configData);

      // Update configData state with fetched configuration
      setConfigData((prev) => ({
        ...prev,
        serialNumber:
          configData.serial_number || configData.name || prev.serialNumber,
        sensorName:
          configData.sensor_name || configData.name || prev.sensorName,
        machineNumber: configData.machine_no || prev.machineNumber,
        installationPoint: configData.installed_point || prev.installationPoint,
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
    } catch (error) {
      // Error fetching sensor config - this is not critical, so we don't set error state
      console.log("Failed to fetch sensor config from API:", error);
      return null;
    }
  };

  // ฟังก์ชันดึงข้อมูลพื้นฐานของเซ็นเซอร์
  const fetchSensor = async () => {
    try {
      // ดึงข้อมูลล่าสุดจากเซ็นเซอร์
      const lastData = await fetchSensorLastData(params.id);
      if (lastData) {
        // Set sensorLastData state with API response
        setSensorLastData(lastData);

        // ดึง config data จาก /sensors/${id}/config เพิ่มเติม
        let config = await fetchSensorConfig(params.id);

        // ถ้า config endpoint ไม่ได้ผล ให้ลองดึงจาก /sensors/with-last-data
        if (!config || !config.machine_no) {
          console.log(
            "=== Config endpoint failed or missing data, trying /sensors/with-last-data ==="
          );
          try {
            const withDataResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/with-last-data`,
              {
                cache: "no-store",
                headers: {
                  "Cache-Control": "no-cache",
                },
              }
            );
            if (withDataResponse.ok) {
              const allSensors =
                (await withDataResponse.json()) as WithLastDataSensor[];
              const sensorData = allSensors.find(
                (sensorItem) => sensorItem.id === params.id
              );
              if (sensorData) {
                console.log(
                  "Found sensor in /sensors/with-last-data for config:",
                  sensorData
                );
                config = {
                  machine_no: sensorData.machine_no,
                  installed_point: sensorData.installed_point,
                  machine_class: sensorData.machine_class,
                  note: sensorData.note,
                  sensor_name: sensorData.sensor_name,
                  threshold_min: sensorData.threshold_min,
                  threshold_medium: sensorData.threshold_medium,
                  threshold_max: sensorData.threshold_max,
                  alarm_ths: sensorData.alarm_ths,
                  fmax: sensorData.fmax,
                  lor: sensorData.lor,
                  g_scale: sensorData.g_scale,
                  time_interval: sensorData.time_interval,
                  image_url: sensorData.image_url,
                };
              }
            }
          } catch (err) {
            console.error("Failed to fetch from /sensors/with-last-data:", err);
          }
        }

        // Update configData from lastData
        console.log("=== Setting configData from lastData ===");
        console.log("lastData.machine_no:", lastData.machine_no);
        console.log("lastData.installed_point:", lastData.installed_point);
        console.log("lastData.machine_class:", lastData.machine_class);
        console.log("lastData.note:", lastData.note);
        console.log("lastData.sensor_name:", lastData.sensor_name);
        console.log("=== Config from endpoints ===");
        console.log("config:", config);

        setConfigData((prev) => {
          const newConfig = {
            ...prev,
            serialNumber: lastData.name || config?.name || prev.serialNumber,
            sensorName:
              lastData.sensor_name ||
              config?.sensor_name ||
              lastData.name ||
              prev.sensorName,
            machineNumber:
              config?.machine_no || lastData.machine_no || prev.machineNumber,
            installationPoint:
              config?.installed_point ||
              lastData.installed_point ||
              prev.installationPoint,
            machineClass:
              config?.machine_class ||
              lastData.machine_class ||
              prev.machineClass,
            notes: config?.note || lastData.note || prev.notes,
            fmax: lastData.fmax || config?.fmax || prev.fmax,
            lor: lastData.lor || config?.lor || prev.lor,
            g_scale: lastData.g_scale || config?.g_scale || prev.g_scale,
            time_interval:
              lastData.time_interval ||
              config?.time_interval ||
              prev.time_interval,
            alarm_ths:
              lastData.alarm_ths || config?.alarm_ths || prev.alarm_ths,
            thresholdMin:
              (config?.threshold_min || lastData.threshold_min)?.toString() ||
              prev.thresholdMin,
            thresholdMedium:
              (
                config?.threshold_medium || lastData.threshold_medium
              )?.toString() || prev.thresholdMedium,
            thresholdMax:
              (config?.threshold_max || lastData.threshold_max)?.toString() ||
              prev.thresholdMax,
            image_url:
              config?.image_url || lastData.image_url || prev.image_url,
          };
          console.log("New configData (merged):", newConfig);
          return newConfig;
        });

        // สร้างข้อมูลเซ็นเซอร์จาก API ถ้าไม่พบในฐานข้อมูล
        setSensor({
          id: params.id,
          name: lastData.name,
          serialNumber: `S-${params.id.substring(0, 4).toUpperCase()}`,
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
          batteryLevel: lastData.data.battery || 0,
          connectivity: "online",
          signalStrength: lastData.data.rssi || 0,
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
          id: params.id,
          name: `Sensor ${params.id.substring(0, 8)}`,
          serialNumber: `S-${params.id.substring(0, 4).toUpperCase()}`,
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
        id: params.id,
        name: `Sensor ${params.id.substring(0, 8)}`,
        serialNumber: `S-${params.id.substring(0, 4).toUpperCase()}`,
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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${sensorId}/datetimes`,
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
    if (mounted) {
      // Fetch data in parallel instead of sequentially
      Promise.all([
        fetchSensor(),
        fetchSensorDatetimes(params.id),
        fetchSensorDetails(params.id),
        fetchSensorHistory(params.id),
      ]).catch((error) => {
        console.error("Error fetching sensor data:", error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, mounted]);

  // Update config data when sensorLastData changes
  useEffect(() => {
    if (sensorLastData) {
      setConfigData((prev) => {
        // Strategy: Use sensorLastData values ONLY if they are truthy.
        // If they are 0/null/undefined, keep the `prev` value (which might be from fetchSensorDetails).
        // If `prev` is also default/empty, then fall back to 10000/6400 only if absolutely necessary.

        return {
          ...prev,
          // Keep existing values for user-editable fields (prev instead of configData to avoid dependency warning)
          sensorName: prev.sensorName || "",
          machineNumber: prev.machineNumber || "",
          installationPoint: prev.installationPoint || "",
          machineClass: prev.machineClass || "",

          // CRITICAL FIX: Do not overwrite with defaults if we have data from fetchSensorDetails
          // If sensorLastData.fmax is 0 or null, keep prev.fmax.
          // If prev.fmax is the default (10000) but sensorLastData is also bad, we stay at 10000.
          // Ideally, fetchSensorDetails sets it to 9000. sensorLastData has 0.
          // We want to keep 9000.
          fmax: sensorLastData.fmax || prev.fmax || 10000,
          lor: sensorLastData.lor || prev.lor || 6400,

          // Use g_scale from sensorLastData (should match API config)
          g_scale: sensorLastData.g_scale || prev.g_scale || 16,
          time_interval: sensorLastData.time_interval || 3,
          alarm_ths: sensorLastData.alarm_ths || prev.alarm_ths || 5.0,
          thresholdMin:
            sensorLastData.threshold_min && sensorLastData.threshold_min > 0
              ? sensorLastData.threshold_min.toString()
              : prev.thresholdMin || "",
          thresholdMedium:
            sensorLastData.threshold_medium &&
              sensorLastData.threshold_medium > 0
              ? sensorLastData.threshold_medium.toString()
              : prev.thresholdMedium || "",
          thresholdMax:
            sensorLastData.threshold_max && sensorLastData.threshold_max > 0
              ? sensorLastData.threshold_max.toString()
              : prev.thresholdMax || "",
          notes: prev.notes || "", // Keep existing value if available
        };
      });
    }
  }, [sensorLastData, sensor]);

  // Pre-calculate all chart data for all axes and units
  const allChartData = useMemo(() => {
    if (!sensorLastData?.data) {
      return {
        hasData: false,
        h: {},
        v: {},
        a: {},
      };
    }

    // Check if we have acc_h/v/a data (from /sensors/${id}/last-data)
    const hasAccData =
      Array.isArray(sensorLastData.data.acc_h) &&
      Array.isArray(sensorLastData.data.acc_v) &&
      Array.isArray(sensorLastData.data.acc_a) &&
      sensorLastData.data.acc_h.length > 0;

    // Check if we have last_32_h/v/a data (from /sensors/with-last-data)
    const hasLast32Data =
      Array.isArray(sensorLastData.data.last_32_h) &&
      Array.isArray(sensorLastData.data.last_32_v) &&
      Array.isArray(sensorLastData.data.last_32_a) &&
      sensorLastData.data.last_32_h.length > 0;

    // If no data available, return empty
    if (!hasAccData && !hasLast32Data) {
      return {
        hasData: false,
        h: {},
        v: {},
        a: {},
      };
    }

    // Determine which data format to use
    let accHData: number[] = [];
    let accVData: number[] = [];
    let accAData: number[] = [];
    let freqHData: number[] = [];
    let freqVData: number[] = [];
    let freqAData: number[] = [];

    if (hasAccData) {
      // Use acc_h/v/a and freq_h/v/a directly from /sensors/${id}/last-data
      accHData = sensorLastData.data.acc_h || [];
      accVData = sensorLastData.data.acc_v || [];
      accAData = sensorLastData.data.acc_a || [];
      freqHData = sensorLastData.data.freq_h || [];
      freqVData = sensorLastData.data.freq_v || [];
      freqAData = sensorLastData.data.freq_a || [];
      console.log(
        "Using acc_h/v/a data - H length:",
        accHData.length,
        "V length:",
        accVData.length,
        "A length:",
        accAData.length
      );
    } else if (hasLast32Data) {
      // Convert last_32_h/v/a (2D arrays) to 1D arrays by flattening
      accHData = sensorLastData.data.last_32_h?.flat() || [];
      accVData = sensorLastData.data.last_32_v?.flat() || [];
      accAData = sensorLastData.data.last_32_a?.flat() || [];
      // Generate frequency data based on array length
      freqHData = Array.from({ length: accHData.length }, (_, i) => i + 1);
      freqVData = Array.from({ length: accVData.length }, (_, i) => i + 1);
      freqAData = Array.from({ length: accAData.length }, (_, i) => i + 1);
      console.log(
        "Using last_32_h/v/a data (flattened) - H length:",
        accHData.length,
        "V length:",
        accVData.length,
        "A length:",
        accAData.length
      );
    }

    const totalTime = configData.lor / configData.fmax;
    const timeInterval = totalTime / ((accHData.length || 1) - 1);

    // Helper to ensure data availability by calculating from G if missing
    const processAxis = (
      accG: number[],
      accMm: number[],
      velMm: number[],
      freqs: number[]
    ) => {
      let finalAccMm = [...accMm];
      let finalVelMm = [...velMm];

      // 1. Calculate Acc(mm/s^2) from G if missing
      // Formula: Acc(mm/s^2) = Acc(G) * 9806.65
      if (finalAccMm.length === 0 && accG.length > 0) {
        finalAccMm = accG.map((g) => accelerationGToMmPerSecSquared(g));
      }

      // 2. Calculate Velocity(mm/s) from Acc(mm/s^2) if missing
      // Formula: Velocity = Acc(mm/s^2) / (2 * pi * f)
      if (
        finalVelMm.length === 0 &&
        finalAccMm.length > 0 &&
        freqs.length === finalAccMm.length
      ) {
        finalVelMm = finalAccMm.map((a, i) =>
          calculateVelocityFromFrequency(a, freqs[i])
        );
      }

      return { accMm: finalAccMm, velMm: finalVelMm };
    };

    const hData = processAxis(
      sensorLastData.data.acc_h || [],
      sensorLastData.data.a_h_data || [],
      sensorLastData.data.v_h_data || [],
      freqHData
    );

    const vData = processAxis(
      sensorLastData.data.acc_v || [],
      sensorLastData.data.a_v_data || [],
      sensorLastData.data.v_v_data || [],
      freqVData
    );

    const aData = processAxis(
      sensorLastData.data.acc_a || [],
      sensorLastData.data.a_a_data || [],
      sensorLastData.data.v_a_data || [],
      freqAData
    );

    // Calculate data for all axes using new API structure
    const axes = {
      h: {
        acc: accHData,
        // Add new separate arrays for different units
        acc_g: sensorLastData.data.acc_h || [],
        acc_mms2: hData.accMm,
        vel_mms: hData.velMm,
        freq: freqHData,

        fPoints: sensorLastData.data.f_point_h,
        g_rms: sensorLastData.data.g_rms_h,
        a_rms: sensorLastData.data.a_rms_h,
        velo_rms: sensorLastData.data.velo_rms_h,
      },
      v: {
        acc: accVData,
        acc_g: sensorLastData.data.acc_v || [],
        acc_mms2: vData.accMm,
        vel_mms: vData.velMm,
        freq: freqVData,
        fPoints: sensorLastData.data.f_point_v,
        g_rms: sensorLastData.data.g_rms_v,
        a_rms: sensorLastData.data.a_rms_v,
        velo_rms: sensorLastData.data.velo_rms_v,
      },
      a: {
        acc: accAData,
        acc_g: sensorLastData.data.acc_a || [],
        acc_mms2: aData.accMm,
        vel_mms: aData.velMm,
        freq: freqAData,
        fPoints: sensorLastData.data.f_point_a,
        g_rms: sensorLastData.data.g_rms_a,
        a_rms: sensorLastData.data.a_rms_a,
        velo_rms: sensorLastData.data.velo_rms_a,
      },
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

    // Create chart config from configData, explicitly preferring /sensors/:id values over /last-data
    // configData.lor/fmax comes from fetchSensorDetails (GET /sensors/:id)
    // sensorLastData.lor/fmax comes from fetchSensorLastData (GET /sensors/:id/last-data)
    const chartConfig: ChartConfigData = {
      lor: configData.lor || sensorLastData.lor || 6400,
      fmax: configData.fmax || sensorLastData.fmax || 10000,
      g_scale: sensorLastData.g_scale || configData.g_scale || 16,
    };

    console.log("=== chartConfig DEBUG ===");
    console.log(
      "configData.lor:",
      configData.lor,
      "configData.fmax:",
      configData.fmax
    );
    console.log(
      "sensorLastData.lor:",
      sensorLastData.lor,
      "sensorLastData.fmax:",
      sensorLastData.fmax
    );
    console.log("Final chartConfig:", chartConfig);
    console.log("=========================");

    // Pre-calculate for all combinations of axes and units
    Object.entries(axes).forEach(([axisKey, axisData]) => {
      if (axisKey === "h" || axisKey === "v" || axisKey === "a") {
        result[axisKey] = {};
        units.forEach((unit) => {
          // Select correct magnitude and frequency arrays based on unit
          let rawMag: number[] = [];

          let rmsOverride: number | undefined;

          if (unit === "Acceleration (G)") {
            rawMag = axisData.acc_g;
            rmsOverride = axisData.g_rms;
          } else if (unit === "Acceleration (mm/s²)") {
            rawMag = axisData.acc_mms2;
            rmsOverride = axisData.a_rms;
          } else if (unit === "Velocity (mm/s)") {
            rawMag = axisData.vel_mms;
            rmsOverride = axisData.velo_rms;
          }

          // Use fPoints (explicit frequency points) if available, otherwise fallback freq
          // But crucially, we must PAIR and SORT them if fPoints exists
          const freqSrc =
            axisData.fPoints && axisData.fPoints.length > 0
              ? axisData.fPoints
              : axisData.freq;

          // If we have mismatched lengths, we can't sort properly, or we slice
          // Assuming user says "X and Y must fill equal data"

          let finalFreq = freqSrc;
          let finalMag = rawMag;

          if (freqSrc.length === rawMag.length && freqSrc.length > 0) {
            const { sortedFreq, sortedMag } = prepareCombinedSortedData(
              freqSrc,
              rawMag
            );
            finalFreq = sortedFreq;
            finalMag = sortedMag;
          }

          result[axisKey][unit] = prepareChartData(
            finalMag,
            finalMag, // Pass regular magnitude as freqData (Arg 2) for FindTopPeaks frequencyMagnitude usage
            unit,
            timeInterval,
            chartConfig,
            finalFreq, // Also pass as fPoints to indicate precise X-axis values
            rmsOverride // Pass the API value for RMS
          );
        });
      }
    });

    return result;
  }, [
    sensorLastData?.fmax,
    sensorLastData?.g_scale,
    sensorLastData?.lor,
    sensorLastData?.data,
    configData,
  ]);

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
  const safeBattery = Number(currentData.battery) || 0;

  const vibrationData = useMemo(() => {
    if (loading || !sensorLastData)
      return { hasData: false, timeData: null, freqData: null };
    return prepareVibrationData();
  }, [prepareVibrationData, loading, sensorLastData]);

  // Extract axis stats from API data directly (no calculation)
  const xStats = useMemo(() => {
    if (loading || !sensorLastData?.data)
      return {
        accelTopPeak: "0.000",
        velocityTopPeak: "0.000",
        dominantFreq: "0.000",
        topPeaks: { G: [], mmPerS2: [], mmPerS: [] },
      };

    // Use RMS values directly from API
    const hData = allChartData.h;
    console.log("=== xStats (H-axis) ===");
    console.log("velo_rms_h:", sensorLastData.data.velo_rms_h);
    console.log("hData:", hData);

    const data = sensorLastData.data;
    return {
      accelTopPeak: data.g_rms_h?.toFixed(3) || "0.000",
      accelMmPerS2: data.a_rms_h?.toFixed(2) || "0.000",
      velocityTopPeak: data.velo_rms_h?.toFixed(3) || "0.000",
      dominantFreq:
        hData["Velocity (mm/s)"]?.topPeaks?.[0]?.frequency || "0.000",
      topPeaks: {
        G: hData["Acceleration (G)"]?.topPeaks || [],
        mmPerS2: hData["Acceleration (mm/s²)"]?.topPeaks || [],
        mmPerS: hData["Velocity (mm/s)"]?.topPeaks || [],
      },
    };
  }, [allChartData, loading, sensorLastData]);

  const yStats = useMemo(() => {
    if (loading || !sensorLastData?.data)
      return {
        accelTopPeak: "0.000",
        velocityTopPeak: "0.000",
        dominantFreq: "0.000",
        topPeaks: { G: [], mmPerS2: [], mmPerS: [] },
      };

    // Use RMS values directly from API
    const vData = allChartData.v;
    console.log("=== yStats (V-axis) ===");
    console.log("velo_rms_v:", sensorLastData.data.velo_rms_v);

    const data = sensorLastData.data;
    return {
      accelTopPeak: data.g_rms_v?.toFixed(3) || "0.000",
      accelMmPerS2: data.a_rms_v?.toFixed(2) || "0.000",
      velocityTopPeak: data.velo_rms_v?.toFixed(3) || "0.000",
      dominantFreq:
        vData["Velocity (mm/s)"]?.topPeaks?.[0]?.frequency || "0.000",
      topPeaks: {
        G: vData["Acceleration (G)"]?.topPeaks || [],
        mmPerS2: vData["Acceleration (mm/s²)"]?.topPeaks || [],
        mmPerS: vData["Velocity (mm/s)"]?.topPeaks || [],
      },
    };
  }, [allChartData, loading, sensorLastData]);

  const zStats = useMemo(() => {
    if (loading || !sensorLastData?.data)
      return {
        accelTopPeak: "0.000",
        velocityTopPeak: "0.000",
        dominantFreq: "0.000",
        topPeaks: { G: [], mmPerS2: [], mmPerS: [] },
      };

    // Use RMS values directly from API
    const aData = allChartData.a;
    console.log("=== zStats (A-axis) ===");
    console.log("velo_rms_a:", sensorLastData.data.velo_rms_a);

    const data = sensorLastData.data;
    return {
      accelTopPeak: data.g_rms_a?.toFixed(3) || "0.000",
      accelMmPerS2: data.a_rms_a?.toFixed(2) || "0.000",
      velocityTopPeak: data.velo_rms_a?.toFixed(3) || "0.000",
      dominantFreq:
        aData["Velocity (mm/s)"]?.topPeaks?.[0]?.frequency || "0.000",
      topPeaks: {
        G: aData["Acceleration (G)"]?.topPeaks || [],
        mmPerS2: aData["Acceleration (mm/s²)"]?.topPeaks || [],
        mmPerS: aData["Velocity (mm/s)"]?.topPeaks || [],
      },
    };
  }, [allChartData, loading, sensorLastData]);

  // Summary log for all axes when data changes
  useEffect(() => {
    if (sensorLastData?.name && !loading) {
      console.log("======================================");
      console.log("=== SENSOR DETAIL PAGE SUMMARY ===");
      console.log("======================================");
      console.log("Sensor Name:", sensorLastData.name);
      console.log("Sensor ID:", sensorLastData.id);
      console.log("--- Config Data ---");
      console.log("Machine Number:", configData.machineNumber);
      console.log("Installation Point:", configData.installationPoint);
      console.log("Machine Class:", configData.machineClass);
      console.log("Note:", configData.notes);
      console.log("--- Sensor Data ---");
      console.log("Temperature:", sensorLastData.data.temperature, "°C");
      console.log("Battery:", sensorLastData.data.battery);
      console.log("RSSI:", sensorLastData.data.rssi);
      console.log("--- RMS Values (from API) ---");
      console.log("H-axis: velo_rms_h =", sensorLastData.data.velo_rms_h);
      console.log("V-axis: velo_rms_v =", sensorLastData.data.velo_rms_v);
      console.log("A-axis: velo_rms_a =", sensorLastData.data.velo_rms_a);
      console.log("--- Peak Velocities (Displayed) ---");
      console.log("H:", xStats.velocityTopPeak, "mm/s");
      console.log("V:", yStats.velocityTopPeak, "mm/s");
      console.log("A:", zStats.velocityTopPeak, "mm/s");
      console.log("======================================");
    }
  }, [
    xStats.velocityTopPeak,
    yStats.velocityTopPeak,
    zStats.velocityTopPeak,
    sensorLastData?.name,
    sensorLastData?.id,
    sensorLastData?.data,
    configData,
    loading,
  ]);

  // Early returns after all hooks
  const handleShare = async () => {
    const shareData = {
      title: `Sensor ${configData.sensorName || configData.serialNumber}`,
      text: `Check out this sensor: ${configData.sensorName || configData.serialNumber}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Sensor link copied to clipboard.",
        });
      } catch (err) {
        console.error("Failed to copy:", err);
        toast({
          title: "Share Failed",
          description: "Could not copy link to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportCSV = () => {
    const data = vibrationData;
    if (!data.hasData) return;

    const exportData = prepareSensorDetailExport();
    exportToCSV(
      exportData,
      `sensor_data_${params.id}_${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  const handleExportExcel = () => {
    const data = vibrationData;
    if (!data.hasData) return;

    const exportData = prepareSensorDetailExport();
    exportToExcel(
      exportData,
      `sensor_data_${params.id}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const prepareSensorDetailExport = () => {
    const data = vibrationData;
    const exportData: any[] = [];

    // 1. Summary Header
    exportData.push({
      Section: "Summary Information",
      Field: "Sensor Name",
      Value: sensorLastData?.name || "",
    });
    exportData.push({
      Section: "",
      Field: "Datetime",
      Value: currentData.datetime,
    });
    exportData.push({
      Section: "",
      Field: "Selected Axis",
      Value: selectedAxis,
    });
    exportData.push({
      Section: "",
      Field: "Selected Unit",
      Value: selectedUnit,
    });
    exportData.push({
      Section: "",
      Field: "Temperature",
      Value: `${safeTemp.toFixed(0)}°C`,
    });
    exportData.push({
      Section: "",
      Field: "Battery",
      Value: `${safeBattery.toFixed(0)}%`,
    });
    exportData.push({
      Section: "",
      Field: "RMS Value",
      Value: data.rmsValue || "",
    });
    exportData.push({
      Section: "",
      Field: "Peak Value",
      Value: data.peakValue || "",
    });
    exportData.push({});

    // 2. Frequency Domain (Top Peaks)
    if (data.topPeaks && data.topPeaks.length > 0) {
      exportData.push({
        Section: "Top 5 Peaks",
        Field: "Frequency (Hz)",
        Value: "Magnitude",
      });
      data.topPeaks.forEach((p) => {
        exportData.push({ Section: "", Field: p.frequency, Value: p.rms });
      });
      exportData.push({});
    }

    // 3. Raw Data
    // We'll create a side-by-side export for Time and Frequency domains
    const timeLabels = data.timeData?.labels || [];
    const timeValues = data.timeData?.datasets[0].data || [];
    const freqLabels = data.freqData?.labels || [];
    const freqValues = data.freqData?.datasets[0].data || [];

    const maxLen = Math.max(timeLabels.length, freqLabels.length);

    exportData.push({
      Section: "RAW DATA",
      Field: "Time (s)",
      Value: `Magnitude (${selectedUnit})`,
      Frequency_Hz: "Frequency (Hz)",
      Magnitude: `Magnitude (${selectedUnit})`,
    });

    for (let i = 0; i < maxLen; i++) {
      exportData.push({
        Section: "",
        Field: timeLabels[i] || "",
        Value: timeValues[i] != null ? timeValues[i] : "",
        Frequency_Hz: freqLabels[i] || "",
        Magnitude: freqValues[i] != null ? freqValues[i] : "",
      });
    }

    return exportData;
  };

  const handlePrintReport = async () => {
    if (!printRef.current) return;
    setIsPrinting(true);
    toast({
      title: "Generating PDF",
      description: "Please wait while we prepare your report...",
    });

    try {
      // Small delay to ensure all charts are rendered
      await new Promise((resolve) => setTimeout(resolve, 800));

      const dataUrl = await htmlToImage.toPng(printRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#030616",
        style: {
          borderRadius: "0",
        },
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `sensor_report_${params.id}_${new Date().toISOString().split("T")[0]}.pdf`
      );

      toast({
        title: "PDF Generated",
        description: "Your report has been downloaded.",
      });
    } catch (err) {
      console.error("PDF Generation failed:", err);
      toast({
        title: "Report Failed",
        description:
          "Could not generate PDF report. " +
          (err instanceof Error ? err.message : ""),
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#030616]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!sensor) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#030616] text-white">
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
    <div className="min-h-screen bg-[#030616] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            className="mr-4 bg-transparent border-[1.35px] border-[#374151] hover:bg-[#374151]/50"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sensor
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Sensor:{" "}
              {sensorLastData?.name ||
                sensor.name ||
                configData.serialNumber ||
                "Unnamed Sensor"}
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
          <Button
            variant="outline"
            className="bg-transparent border-[1.35px] border-[#374151] hover:bg-[#374151]/50"
            onClick={() => router.push(`/sensors/${sensor.id}/history`)}
          >
            View History
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-transparent border-[1.35px] border-[#374151] hover:bg-[#374151]/50"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#030616] border-[1.35px] border-[#374151]"
            >
              {(user?.role?.toLowerCase() === "admin" ||
                user?.role?.toLowerCase() === "editor") && (
                  <DropdownMenuItem
                    className="text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push("/register");
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Sensor
                  </DropdownMenuItem>
                )}
              <DropdownMenuItem
                className="text-white cursor-pointer"
                onClick={handleExportCSV}
              >
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white cursor-pointer"
                onClick={handleExportExcel}
              >
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white cursor-pointer"
                onClick={handlePrintReport}
                disabled={isPrinting}
              >
                {isPrinting ? "Generating..." : "Print Report"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white cursor-pointer"
                onClick={handleShare}
              >
                Share
              </DropdownMenuItem>
              {(user?.role?.toLowerCase() === "admin" ||
                user?.role?.toLowerCase() === "editor") && (
                  <DropdownMenuItem
                    className="text-red-500 cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      console.log("Delete selected for sensor:", params.id);

                      setTimeout(async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this sensor? This action cannot be undone."
                          )
                        ) {
                          console.log("User confirmed delete");
                          const success = await deleteSensor(params.id);
                          console.log("Delete result:", success);
                          if (success) {
                            router.push("/");
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
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 space-y-4" ref={printRef}>
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded-md mb-4">
            {error}. Using fallback data.
          </div>
        )}
        {/* Horizontal Sensor Information */}
        <Card className="bg-[#030616] border-[1.35px] border-[#374151]">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="shrink-0 flex justify-center">
                <div className="w-60 h-full min-h-[320px] bg-[#030616] border-[1.35px] border-[#374151] rounded-md flex items-center justify-center overflow-hidden relative">
                  {sensorImage || configData.image_url ? (
                    <Image
                      src={sensorImage || configData.image_url || ""}
                      alt="Sensor"
                      fill
                      className="object-cover"
                      unoptimized={!!sensorImage} // Needed for blob URLs sometimes
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">No Image</span>
                  )}
                </div>
              </div>

              <div className="grow flex flex-wrap gap-4 items-stretch">
                <div className="flex-1 rounded-xl p-3 2xl:p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] 2xl:grid-cols-[250px_1fr] items-center mb-4">
                    <h2 className="text-2xl 2xl:text-4xl font-semibold text-white">
                      Machine Information
                    </h2>
                    {(user?.role?.toLowerCase() === "admin" ||
                      user?.role?.toLowerCase() === "editor") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent border-[1.35px] border-[#374151] hover:bg-[#374151]/50 text-white w-fit 2xl:text-lg 2xl:px-4 2xl:py-2"
                          onClick={() => router.push(`/register?id=${params.id}`)}
                        >
                          <Settings className="mr-2 h-4 w-4 2xl:h-5 2xl:w-5" />
                          Edit
                        </Button>
                      )}
                  </div>

                  <div className="grid grid-cols-[200px_1fr] 2xl:grid-cols-[250px_1fr] gap-x-8 gap-y-1 text-base 2xl:text-xl">
                    {/* Area Operation */}
                    <span className="text-gray-400">Area Operation</span>
                    <span className="text-lg 2xl:text-2xl text-white whitespace-nowrap">
                      {sensor?.location || "Not Set"}
                    </span>

                    {/* Machine Name */}
                    <span className="text-gray-400">Machine Name</span>
                    <span className="text-lg 2xl:text-2xl text-white whitespace-nowrap">
                      {sensor?.machineName || "Not Set"}
                    </span>

                    {/* Machine Number */}
                    <span className="text-gray-400">Machine Number</span>
                    <span
                      className={`text-lg 2xl:text-2xl whitespace-nowrap ${configData.machineNumber
                        ? "text-white"
                        : "text-gray-500"
                        }`}
                    >
                      {configData.machineNumber || "Not Set"}
                    </span>

                    {/* Installation Point */}
                    <span className="text-gray-400">Installation Point</span>
                    <span
                      className={`text-lg 2xl:text-2xl whitespace-nowrap ${configData.installationPoint
                        ? "text-white"
                        : "text-gray-500"
                        }`}
                    >
                      {configData.installationPoint || "Not Set"}
                    </span>

                    {/* Machine Class */}
                    <span className="text-gray-400">Machine Class</span>
                    <span
                      className={`text-lg 2xl:text-2xl whitespace-nowrap ${configData.machineClass ? "text-white" : "text-gray-500"
                        }`}
                    >
                      {configData.machineClass
                        ? configData.machineClass.charAt(0).toUpperCase() +
                        configData.machineClass.slice(1)
                        : "Not Set"}
                    </span>

                    {/* Machine Installation Date */}
                    <span className="text-gray-400">
                      Machine Installation Date
                    </span>
                    <span className="text-lg 2xl:text-2xl text-white whitespace-nowrap">
                      {sensor?.installationDate
                        ? formatDate(
                          new Date(sensor.installationDate).toISOString()
                        )
                        : "Not Set"}
                    </span>

                    {/* Machine Age */}
                    <span className="text-gray-400">Machine Age</span>
                    <span className="text-lg 2xl:text-2xl text-white whitespace-nowrap">
                      {(() => {
                        if (!sensor?.installationDate) return "Unknown";
                        const start = new Date(sensor.installationDate);
                        const now = new Date();
                        const diffTime = Math.abs(
                          now.getTime() - start.getTime()
                        );
                        const diffDays = Math.floor(
                          diffTime / (1000 * 60 * 60 * 24)
                        );
                        const diffHours = Math.floor(
                          (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                        );
                        return `${diffDays} Day${diffDays > 1 ? "s" : ""} ${diffHours} Hour${diffHours > 1 ? "s" : ""}`;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="hidden xl:block w-[1px] bg-[#374151] my-4 opacity-50"></div>

                <div className="flex-1 max-w-xl rounded-xl p-3 2xl:p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] 2xl:grid-cols-[250px_1fr] items-center mb-4">
                    <h2 className="text-2xl 2xl:text-4xl font-semibold text-white">
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

                        if (sensor.connectivity === "offline") {
                          statusLevel = "lost";
                        } else if (sensor.operationalStatus === "standby") {
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
                            className={`px-3 py-1 2xl:px-5 2xl:py-2 text-sm md:text-base 2xl:text-2xl rounded-full ${getStatusStyles(statusLevel)}`}
                          >
                            {getStatusLabel(statusLevel)}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-[160px_1fr] 2xl:grid-cols-[200px_1fr] gap-x-4 gap-y-1 text-base 2xl:text-xl">
                    {/* Signal Strength */}
                    <span className="text-gray-400">Signal Strength</span>
                    <span className="flex items-center gap-2 text-white whitespace-nowrap">
                      {(() => {
                        const level = getSignalStrength(currentData.rssi || 0);
                        const iconProps = { className: "h-5 w-5" };

                        switch (level) {
                          case 0:
                            return (
                              <WifiOff
                                {...iconProps}
                                className={cn(
                                  iconProps.className,
                                  "text-gray-400"
                                )}
                              />
                            );
                          case 1:
                            return (
                              <WifiZero
                                {...iconProps}
                                className={cn(
                                  iconProps.className,
                                  "text-yellow-400"
                                )}
                              />
                            );
                          case 2:
                            return (
                              <WifiLow
                                {...iconProps}
                                className={cn(
                                  iconProps.className,
                                  "text-yellow-400"
                                )}
                              />
                            );
                          case 3:
                            return (
                              <WifiHigh
                                {...iconProps}
                                className={cn(
                                  iconProps.className,
                                  "text-[#00E200]"
                                )}
                              />
                            );
                          case 4:
                            return (
                              <Wifi
                                {...iconProps}
                                className={cn(
                                  iconProps.className,
                                  "text-[#00E200]"
                                )}
                              />
                            );
                          default:
                            return (
                              <WifiOff
                                {...iconProps}
                                className={cn(
                                  iconProps.className,
                                  "text-gray-400"
                                )}
                              />
                            );
                        }
                      })()}
                      <span className="text-sm 2xl:text-lg text-gray-500">
                        ({getSignalStrengthLabel(currentData.rssi || 0)})
                      </span>
                    </span>

                    {/* Battery */}
                    <span className="text-gray-400">Battery</span>
                    <span className="text-lg 2xl:text-2xl text-white whitespace-nowrap">
                      {safeBattery.toFixed(0)}%
                    </span>

                    {/* Sensor Installation Date */}
                    <span className="text-gray-400">
                      Sensor Installation Date
                    </span>
                    <span className="text-lg 2xl:text-2xl text-white whitespace-nowrap">
                      {sensor?.installationDate
                        ? formatDate(
                          new Date(sensor.installationDate).toISOString()
                        )
                        : formatDate("2025-04-26")}
                    </span>

                    {/* Last Updated */}
                    <span className="text-gray-400">Last Updated</span>
                    <span className="text-lg 2xl:text-2xl text-white whitespace-nowrap">
                      {formatThaiDate(String(currentData.datetime))}
                    </span>

                    {/* Note */}
                    <span className="text-gray-400">Note</span>
                    <span
                      className={`max-w-[200px] 2xl:max-w-xs truncate text-lg 2xl:text-2xl ${configData.notes ? "text-white" : "text-gray-500"}`}
                      title={configData.notes || "No notes"}
                    >
                      {configData.notes || "No notes"}
                    </span>
                  </div>
                </div>

                <div className="hidden xl:block w-[1px] bg-[#374151] my-4 opacity-50"></div>

                <div className="flex-1 max-w-xl rounded-xl p-3 2xl:p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl 2xl:text-4xl font-semibold text-white">
                      Select Date
                    </h2>
                  </div>
                  <div
                    className="bg-[#030616] rounded-md p-2 overflow-y-auto custom-scrollbar"
                    style={{ maxHeight: "280px" }}
                  >
                    {sortedDatetimes.length > 0 ? (
                      <ul className="space-y-1 text-base 2xl:text-xl">
                        {sortedDatetimes.map((datetime, index) => (
                          <li key={`${datetime}-${index}`}>
                            <button
                              className={`w-full text-left px-2 py-1 rounded hover:bg-[#374151]/50 text-white ${selectedDatetime === datetime
                                ? "bg-blue-600"
                                : ""
                                }`}
                              onClick={async () => {
                                setSelectedDatetime(datetime);
                                try {
                                  const data = await fetchSensorLastData(
                                    params.id,
                                    datetime
                                  );
                                  if (data) {
                                    setSensorLastData(data);
                                  } else {
                                    setError("Failed to fetch sensor data");
                                  }
                                } catch {
                                  setError("Failed to fetch sensor data");
                                }
                              }}
                            >
                              {formatDateTimeDayFirst(datetime)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-400 text-sm 2xl:text-lg px-2 py-1">
                        No history available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics and Analysis */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-4 2xl:gap-8">
            <Card
              className="border-[1.35px] border-[#374151]"
              style={{
                backgroundColor:
                  safeTemp > (configData?.alarm_ths || 35)
                    ? "#7f1d1d" // red-900
                    : safeTemp > (configData?.alarm_ths || 35) * 0.7
                      ? "#fae739" // custom yellow
                      : "#14532d", // green-900
              }}
            >
              <CardContent className="p-4 2xl:p-6">
                {(() => {
                  console.log("=== Temperature Statistics ===");
                  console.log("safeTemp:", safeTemp);
                  console.log(
                    "currentData.temperature:",
                    currentData.temperature
                  );
                  console.log(
                    "sensorLastData?.data.temperature:",
                    sensorLastData?.data?.temperature
                  );
                  console.log("configData.alarm_ths:", configData?.alarm_ths);
                  return null;
                })()}
                <div className="flex flex-col items-start justify-start text-left w-full">
                  <h3
                    className="mb-2 font-extrabold text-base md:text-lg lg:text-xl 2xl:text-3xl w-full"
                    style={{
                      color:
                        safeTemp > (configData?.alarm_ths || 35) * 0.7 &&
                          safeTemp <= (configData?.alarm_ths || 35)
                          ? "#1f2937"
                          : "#ffffff",
                    }}
                  >
                    Temperature Statistics
                  </h3>

                  <div className="flex justify-between items-baseline w-full mb-2">
                    <div
                      className="text-xl md:text-2xl lg:text-3xl 2xl:text-5xl font-extrabold"
                      style={{
                        color:
                          safeTemp > (configData?.alarm_ths || 35) * 0.7 &&
                            safeTemp <= (configData?.alarm_ths || 35)
                            ? "#1f2937"
                            : "#ffffff",
                      }}
                    >
                      {safeTemp.toFixed(0)}°C
                    </div>
                    <div
                      className="text-lg md:text-xl lg:text-2xl 2xl:text-4xl font-bold mr-4"
                      style={{
                        color:
                          safeTemp > (configData?.alarm_ths || 35) * 0.7 &&
                            safeTemp <= (configData?.alarm_ths || 35)
                            ? "#1f2937"
                            : "#ffffff",
                      }}
                    >
                      {safeTemp > (configData?.alarm_ths || 35)
                        ? "Critical"
                        : safeTemp > (configData?.alarm_ths || 35) * 0.7
                          ? "Warning"
                          : "Normal"}
                    </div>
                  </div>

                  <div className="space-y-1 w-full">
                    <div
                      className="text-sm md:text-base 2xl:text-xl font-medium"
                      style={{
                        color:
                          safeTemp > (configData?.alarm_ths || 35) * 0.7 &&
                            safeTemp <= (configData?.alarm_ths || 35)
                            ? "#4b5563"
                            : "#d1d5db",
                      }}
                    >
                      Threshold max: {configData?.thresholdMax ?? 2.5} °C
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conditionally show H-axis card */}
            {configData.hAxisEnabled && (
              <Card
                className={`border-[1.35px] border-[#374151]
              ${getDetailCardColor(parseFloat(xStats.velocityTopPeak))}`}
              >
                <CardContent className="p-4 2xl:p-6">
                  <h3
                    className={`mb-2 font-extrabold text-base md:text-lg lg:text-xl 2xl:text-3xl ${shouldTextBeWhite(
                      getDetailCardColor(parseFloat(xStats.velocityTopPeak))
                    )
                      ? "!text-white"
                      : "!text-black"
                      }`}
                  >
                    Horizontal (H)
                  </h3>
                  <div className="space-y-1 text-lg md:text-xl 2xl:text-2xl">
                    <div className="flex justify-between">
                      <span
                        className={
                          shouldTextBeWhite(
                            getDetailCardColor(
                              parseFloat(xStats.velocityTopPeak)
                            )
                          )
                            ? "!text-white"
                            : "!text-black"
                        }
                      >
                        Acceleration
                      </span>
                      <span
                        className={`text-right ${shouldTextBeWhite(
                          getCardBackgroundColorCallback(
                            parseFloat(xStats.velocityTopPeak)
                          )
                        )
                          ? "!text-white text-xl md:text-2xl 2xl:text-4xl font-bold"
                          : "!text-black text-xl md:text-2xl 2xl:text-4xl font-bold"
                          }`}
                      >
                        {xStats.accelTopPeak} G
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        className={
                          shouldTextBeWhite(
                            getCardBackgroundColorCallback(
                              parseFloat(xStats.velocityTopPeak)
                            )
                          )
                            ? "!text-white"
                            : "!text-black"
                        }
                      >
                        Velocity
                      </span>
                      <span
                        className={`text-right ${shouldTextBeWhite(
                          getCardBackgroundColorCallback(
                            parseFloat(xStats.velocityTopPeak)
                          )
                        )
                          ? "!text-white text-xl md:text-2xl 2xl:text-4xl font-bold"
                          : "!text-black text-xl md:text-2xl 2xl:text-4xl font-bold"
                          }`}
                      >
                        {xStats.velocityTopPeak} mm/s
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conditionally show V-axis card */}
            {configData.vAxisEnabled && (
              <Card
                className={`border-[1.35px] border-[#374151]
              ${getDetailCardColor(parseFloat(yStats.velocityTopPeak))}`}
              >
                {/* {getDetailCardColor(parseFloat(yStats.velocityTopPeak))} */}
                <CardContent className="p-4 2xl:p-6">
                  <h3
                    className={`mb-2 font-extrabold text-base md:text-lg lg:text-xl 2xl:text-3xl ${shouldTextBeWhite(
                      getDetailCardColor(parseFloat(yStats.velocityTopPeak))
                    )
                      ? "!text-white"
                      : "!text-black"
                      }`}
                  >
                    Vertical (V)
                  </h3>
                  <div className="space-y-1 text-lg md:text-xl 2xl:text-2xl">
                    <div className="flex justify-between">
                      <span
                        className={
                          shouldTextBeWhite(
                            getCardBackgroundColorCallback(
                              parseFloat(yStats.velocityTopPeak)
                            )
                          )
                            ? "!text-white"
                            : "!text-black"
                        }
                      >
                        Acceleration
                      </span>
                      <span
                        className={`text-right ${shouldTextBeWhite(
                          getCardBackgroundColorCallback(
                            parseFloat(yStats.velocityTopPeak)
                          )
                        )
                          ? "!text-white text-xl md:text-2xl 2xl:text-4xl font-bold"
                          : "!text-black text-xl md:text-2xl 2xl:text-4xl font-bold"
                          }`}
                      >
                        {yStats.accelTopPeak} G
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        className={
                          shouldTextBeWhite(
                            getCardBackgroundColorCallback(
                              parseFloat(yStats.velocityTopPeak)
                            )
                          )
                            ? "!text-white"
                            : "!text-black"
                        }
                      >
                        Velocity
                      </span>
                      <span
                        className={`text-right ${shouldTextBeWhite(
                          getCardBackgroundColorCallback(
                            parseFloat(yStats.velocityTopPeak)
                          )
                        )
                          ? "!text-white text-xl md:text-2xl 2xl:text-4xl font-bold"
                          : "!text-black text-xl md:text-2xl 2xl:text-4xl font-bold"
                          }`}
                      >
                        {yStats.velocityTopPeak} mm/s
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conditionally show A-axis card */}
            {configData.aAxisEnabled && (
              <Card
                className={`border-[1.35px] border-[#374151] ${getDetailCardColor(parseFloat(zStats.velocityTopPeak))}`}
              >
                <CardContent className="p-4 2xl:p-6">
                  <h3
                    className={`mb-2 font-extrabold text-base md:text-lg lg:text-xl 2xl:text-3xl ${shouldTextBeWhite(
                      getDetailCardColor(parseFloat(zStats.velocityTopPeak))
                    )
                      ? "!text-white"
                      : "!text-black"
                      }`}
                  >
                    Axial (A)
                  </h3>
                  <div className="space-y-1 text-lg md:text-xl 2xl:text-2xl">
                    <div className="flex justify-between">
                      <span
                        className={
                          shouldTextBeWhite(
                            getCardBackgroundColorCallback(
                              parseFloat(zStats.velocityTopPeak)
                            )
                          )
                            ? "!text-white"
                            : "!text-black"
                        }
                      >
                        Acceleration
                      </span>
                      <span
                        className={`text-right ${shouldTextBeWhite(
                          getCardBackgroundColorCallback(
                            parseFloat(zStats.velocityTopPeak)
                          )
                        )
                          ? "!text-white text-xl md:text-2xl 2xl:text-4xl font-bold"
                          : "!text-black text-xl md:text-2xl 2xl:text-4xl font-bold"
                          }`}
                      >
                        {zStats.accelTopPeak} G
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        className={
                          shouldTextBeWhite(
                            getCardBackgroundColorCallback(
                              parseFloat(zStats.velocityTopPeak)
                            )
                          )
                            ? "!text-white"
                            : "!text-black"
                        }
                      >
                        Velocity
                      </span>
                      <span
                        className={`text-right ${shouldTextBeWhite(
                          getCardBackgroundColorCallback(
                            parseFloat(zStats.velocityTopPeak)
                          )
                        )
                          ? "!text-white text-xl md:text-2xl 2xl:text-4xl font-bold"
                          : "!text-black text-xl md:text-2xl 2xl:text-4xl font-bold"
                          }`}
                      >
                        {zStats.velocityTopPeak} mm/s
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Vibration Analysis Section */}
          <Card className="bg-[#030616] border-[1.35px] border-[#374151]">
            <CardContent className="p-6">
              <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold mb-4 text-white">
                Vibration Frequency Analysis
              </h2>

              {/* Axis and Unit Selection with Checkboxes */}
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
                        className="w-5 h-5 accent-blue-600"
                      />
                      <span className="text-sm font-medium text-white">
                        H (Horizontal)
                      </span>
                    </label>
                  )}
                  {configData.vAxisEnabled && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAxis === "V-axis"}
                        onChange={() => setSelectedAxis("V-axis")}
                        className="w-5 h-5 accent-blue-600"
                      />
                      <span className="text-sm font-medium text-white">
                        V (Vertical)
                      </span>
                    </label>
                  )}
                  {configData.aAxisEnabled && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAxis === "A-axis"}
                        onChange={() => setSelectedAxis("A-axis")}
                        className="w-5 h-5 accent-blue-600"
                      />
                      <span className="text-sm font-medium text-white">
                        A (Axial)
                      </span>
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
                      className="w-5 h-5 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-white">
                      Acceleration(G)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUnit === "Acceleration (mm/s²)"}
                      onChange={() => setSelectedUnit("Acceleration (mm/s²)")}
                      className="w-5 h-5 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-white">
                      Acceleration(mm/s²)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUnit === "Velocity (mm/s)"}
                      onChange={() => setSelectedUnit("Velocity (mm/s)")}
                      className="w-5 h-5 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-white">
                      Velocity(mm/s)
                    </span>
                  </label>
                </div>
              </div>

              {(() => {
                const hasData = vibrationData.hasData;

                return (
                  <div className="space-y-6">
                    {/* RMS Overall + Top 5 Peaks & Short Trend Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left Column: RMS Overall + Top 5 Peaks */}
                      <div className="bg-[#030616] border-[1.35px] border-[#374151] rounded-lg p-6">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <h4 className="text-xl font-bold text-white">
                              RMS Overall :
                            </h4>
                            <span className="text-xl font-bold text-white">
                              {hasData ? vibrationData.rmsValue : "-"}
                            </span>
                          </div>
                          <span className="text-xl font-bold text-white">
                            {hasData ? selectedUnit.split(" ")[0] : ""}
                          </span>
                        </div>

                        <div className="mb-4">
                          <h5 className="text-xl font-bold text-white mb-6">
                            Top 5 Peaks
                          </h5>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-6 pb-3 border-b-2 border-[#374151]">
                              <div className="text-base font-bold text-white">
                                RMS :
                              </div>
                              <div className="text-base font-bold text-white text-right">
                                Frequency
                              </div>
                            </div>
                            {hasData && vibrationData.topPeaks ? (
                              vibrationData.topPeaks.map((row, i) => (
                                <div key={i} className="grid grid-cols-2 gap-6">
                                  <div className="text-lg font-medium text-white">
                                    {row.rms}
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
                      </div>

                      {/* Right Column: Short Trend */}
                      <div className="bg-[#030616] border-[1.35px] border-[#374151] rounded-lg p-6">
                        <h4 className="text-xl font-bold text-white mb-8">
                          Short Trend
                        </h4>
                        <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar">
                          <table className="min-w-full text-base">
                            <thead className="sticky top-0 bg-[#030616]">
                              <tr className="">
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
                                    rmsValue = (
                                      item[`g_rms_${axisKey}`] || 0
                                    ).toFixed(3);
                                    unitShort = "G";
                                  } else if (
                                    selectedUnit === "Acceleration (mm/s²)"
                                  ) {
                                    rmsValue = (
                                      item[`a_rms_${axisKey}`] || 0
                                    ).toFixed(2);
                                    unitShort = "mm/s²";
                                  } else {
                                    rmsValue = (
                                      item[`velo_rms_${axisKey}`] || 0
                                    ).toFixed(3);
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
                          Time Domain
                        </span>
                      </h3>
                      <div className="h-80 bg-[#030616] border-[1.35px] border-[#374151] rounded-lg p-4">
                        {hasData && vibrationData.timeData ? (
                          <ReactECharts
                            option={{
                              backgroundColor: "#030616",
                              grid: {
                                left: 60,
                                right: 30,
                                top: 30,
                                bottom: 40,
                              },
                              tooltip: {
                                trigger: "axis",
                                axisPointer: { type: "line" },
                                formatter: (params: any) => {
                                  if (params && params.length > 0) {
                                    const time = params[0].axisValue;
                                    const value = params[0].value;
                                    return `F(ts) ${time} s<br/>${params[0].marker} ${params[0].seriesName}: ${Number(value).toFixed(4)}`;
                                  }
                                  return "";
                                },
                              },
                              xAxis: {
                                type: "category",
                                data: vibrationData.timeData.labels,
                                name: "Time (s)",
                                nameTextStyle: {
                                  color: "#fff",
                                  fontWeight: 500,
                                },
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
                              yAxis: {
                                type: "value",
                                name: vibrationData.yAxisLabel || selectedUnit,
                                nameTextStyle: {
                                  color: "#fff",
                                  fontWeight: 500,
                                },
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
                                {
                                  type: "inside",
                                  xAxisIndex: 0,
                                  filterMode: "none",
                                },
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
                                  name:
                                    vibrationData.yAxisLabel || selectedUnit,
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
                            <p className="text-sm text-gray-300">
                              No data available
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Frequency Domain Section */}
                    <div>
                      <h3 className="text-base font-semibold mb-3 text-white">
                        <span className="text-lg md:text-xl lg:text-2xl font-extrabold text-white">
                          Frequency Domain
                        </span>
                      </h3>
                      <div className="h-80 bg-[#030616] border-[1.35px] border-[#374151] rounded-lg p-4">
                        {hasData && vibrationData.freqData ? (
                          <ReactECharts
                            option={{
                              backgroundColor: "#030616",
                              grid: {
                                left: 60,
                                right: 30,
                                top: 30,
                                bottom: 40,
                              },
                              tooltip: {
                                trigger: "axis",
                                axisPointer: { type: "line" },
                                formatter: (params: any) => {
                                  if (params && params.length > 0) {
                                    const freq = params[0].axisValue;
                                    const value = params[0].value;
                                    return `F(Hz) ${freq} Hz<br/>${params[0].marker} ${params[0].seriesName}: ${Number(value).toFixed(4)}`;
                                  }
                                  return "";
                                },
                              },
                              xAxis: {
                                type: "category",
                                data: vibrationData.freqData.labels,
                                name: "Frequency (Hz)",
                                nameTextStyle: {
                                  color: "#fff",
                                  fontWeight: 500,
                                },
                                axisLabel: { color: "#fff", fontWeight: 500 },
                                axisLine: { lineStyle: { color: "#fff" } },
                                splitLine: {
                                  show: true,
                                  lineStyle: {
                                    color: "rgba(255,255,255,0.025)",
                                    width: 1,
                                    type: "solid",
                                  },
                                },
                              },
                              yAxis: {
                                type: "value",
                                name: vibrationData.yAxisLabel
                                  ? `${vibrationData.yAxisLabel} Magnitude`
                                  : "Magnitude",
                                nameTextStyle: {
                                  color: "#fff",
                                  fontWeight: 500,
                                },
                                axisLabel: { color: "#fff", fontWeight: 500 },
                                axisLine: { lineStyle: { color: "#fff" } },
                                splitLine: {
                                  show: true,
                                  lineStyle: {
                                    color: "rgba(255,255,255,0.025)",
                                    width: 1,
                                    type: "solid",
                                  },
                                },
                              },
                              dataZoom: [
                                {
                                  type: "inside",
                                  xAxisIndex: 0,
                                  filterMode: "none",
                                  zoomOnMouseWheel: true,
                                  moveOnMouseMove: true,
                                  moveOnMouseWheel: true,
                                },
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
                                  name: vibrationData.yAxisLabel
                                    ? `${vibrationData.yAxisLabel} Magnitude`
                                    : "Magnitude",
                                  type: "line",
                                  data: vibrationData.freqData.datasets[0].data,
                                  smooth: true,
                                  symbol: "none",
                                  lineStyle: { width: 2, color: "#eab308" },
                                  areaStyle: { color: "rgba(234,179,8,0.08)" },
                                },
                              ],
                              legend: { show: false },
                            }}
                            style={{ height: "100%", width: "100%" }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-gray-300">
                              No data available
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
