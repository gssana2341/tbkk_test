import {
  reconstructTimeDomainFromAPI,
  TimeReconstructionRequest,
  calculateFFT,
  findTopPeaks,
} from "./sensorCalculations";
import {
  ChartTimeData,
  ChartFreqData,
  ChartConfigData,
} from "../types/sensor-data";

/**
 * Helper to pair and sort data by frequency (small to large)
 */
export function prepareCombinedSortedData(
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

/**
 * Prepares chart data for both Time and Frequency domains.
 */
export function prepareChartData(
  accData: number[],
  freqData: number[],
  selectedUnit: string,
  timeInterval: number,
  configData: ChartConfigData,
  fPoints?: number[],
  rmsOverride?: number,
  preCalcFFT?: { magnitude: number[]; frequency: number[] }
): {
  hasData: boolean;
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
    accData && accData.length > 0 && accData.length <= configData.lor * 1.5;

  if (
    isSpectrumData ||
    ((!effectiveAccData || effectiveAccData.length === 0) &&
      freqData &&
      freqData.length > 0)
  ) {
    try {
      const amplitudes =
        isSpectrumData && effectiveAccData.length > 0
          ? effectiveAccData
          : freqData;

      let effectiveFPoints = fPoints;
      if (!effectiveFPoints || effectiveFPoints.length !== amplitudes.length) {
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

  if (
    (!effectiveAccData || effectiveAccData.length === 0) &&
    (!freqData || freqData.length === 0)
  ) {
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
      hasData: false,
      timeData: emptyTimeData,
      freqData: emptyFreqData,
      yAxisLabel: "No Data",
      rmsValue: "0.000",
      peakValue: "0.000",
      peakToPeakValue: "0.000",
      topPeaks: [],
    };
  }

  const n = effectiveAccData.length;
  const theoreticalTotalTime = configData.lor / configData.fmax;

  const timeLabels = Array.from({ length: n }, (_, i) => {
    if (n <= 1) return "0.00";
    if (i === n - 1) return theoreticalTotalTime.toFixed(2);
    return ((i * theoreticalTotalTime) / (n - 1)).toFixed(2);
  });

  let processedData: number[];
  let yAxisLabel: string;

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

  const peakToPeak = peak * 2;
  const rmsValue = rms.toFixed(2);
  const peakValue = peak.toFixed(2);
  const peakToPeakValue = peakToPeak.toFixed(2);

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
  let freqMagnitude: number[] = [];
  let freqLabels: string[] = [];

  // 1. ALWAYS calculate high-resolution spectrum from Time Domain for the LINE GRAPH
  let calculatedMagnitude: number[] = [];
  let calculatedLabels: string[] = [];

  if (preCalcFFT && preCalcFFT.magnitude.length > 0) {
    calculatedMagnitude = preCalcFFT.magnitude;
    calculatedLabels = preCalcFFT.frequency.map((f: number) => f.toFixed(2));
  } else if (effectiveAccData && effectiveAccData.length > 0) {
    const fftResult = calculateFFT(effectiveAccData, configData.fmax);
    calculatedMagnitude = fftResult.magnitude;
    calculatedLabels = fftResult.frequency.map((f: number) => f.toFixed(2));
  }

  // 2. DEFINE Source for PEAKS (Prefer sensor data if provided)
  let peakSourceMag = calculatedMagnitude;
  let peakSourceLabels = calculatedLabels;

  if (freqData && freqData.length > 0) {
    let sensorFreq = fPoints || freqData.map((_, i) => i);
    if (sensorFreq.length === freqData.length) {
      const sorted = prepareCombinedSortedData(sensorFreq, freqData);
      peakSourceMag = sorted.sortedMag;
      peakSourceLabels = sorted.sortedFreq.map((f) => f.toFixed(2));
    } else {
      peakSourceMag = freqData;
      peakSourceLabels = freqData.map((_, i) => i.toFixed(2));
    }
  }

  // Use calculated FFT for the graph visualization
  freqMagnitude = calculatedMagnitude;
  freqLabels = calculatedLabels;

  if (freqMagnitude.length > 0) {
    // Find peaks using the peak source (Sensor data)
    const { topPeaks: processedPeaks } = findTopPeaks(
      peakSourceMag,
      peakSourceLabels,
      configData.lor,
      5
    );

    // Create colored dots for the chart based on the selected peaks
    // We need to match the peak frequencies (from sensor) to the labels in our calculated FFT graph
    const pointRadius = new Array(freqMagnitude.length).fill(0);
    const pointBackgroundColor = new Array(freqMagnitude.length).fill(
      "transparent"
    );
    processedPeaks.forEach((peak) => {
      const closestIdx = freqLabels.findIndex(
        (l) => Math.abs(parseFloat(l) - parseFloat(peak.frequency)) < 0.5
      );
      if (closestIdx !== -1) {
        pointBackgroundColor[closestIdx] = "red";
        pointRadius[closestIdx] = 4;
      }
    });

    const freqChartData = {
      labels: freqLabels,
      datasets: [
        {
          label: `${yAxisLabel} Magnitude`,
          data: freqMagnitude,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.1,
          pointRadius: pointRadius,
          pointBackgroundColor: pointBackgroundColor,
        },
      ],
    };

    const hasAnyData =
      (effectiveAccData && effectiveAccData.length > 0) ||
      freqMagnitude.length > 0;

    return {
      hasData: hasAnyData,
      timeData: timeChartData,
      freqData: freqChartData,
      yAxisLabel,
      rmsValue,
      peakValue,
      peakToPeakValue,
      topPeaks: processedPeaks,
    };
  }

  return {
    hasData: effectiveAccData && effectiveAccData.length > 0,
    timeData: timeChartData,
    freqData: { labels: [], datasets: [] },
    yAxisLabel,
    rmsValue,
    peakValue,
    peakToPeakValue,
    topPeaks: [],
  };
}

/**
 * Format date time to en-GB format
 */
export function formatDateTimeDayFirst(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    // Check if format is ISO (contains T)
    if (dateStr.includes("T")) {
      const [datePart, timePartRaw] = dateStr.split("T");
      if (datePart && timePartRaw) {
        const date = datePart.split("-").reverse().join("/");
        const time = timePartRaw.split("Z")[0].split(".")[0]; // Remove Z and milliseconds
        // Handle HH:mm:ss -> HH:mm
        const timeParts = time.split(":");
        if (timeParts.length >= 2) {
          return `${date} ${timeParts[0]}:${timeParts[1]}`;
        }
        return `${date} ${time}`;
      }
    }

    // Fallback to simpler parsing for non-ISO or if split fails
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "");
  } catch {
    return dateStr;
  }
}
