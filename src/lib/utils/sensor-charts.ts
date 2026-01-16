
import {
    reconstructTimeDomainFromAPI,
    TimeReconstructionRequest,
    calculateFFT,
    findTopPeaks
} from "./sensorCalculations";
import {
    ChartTimeData,
    ChartFreqData,
    ChartConfigData
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
    rmsOverride?: number
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

    if ((!effectiveAccData || effectiveAccData.length === 0) && (!freqData || freqData.length === 0)) {
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
        if (n <= 1) return "0.0000";
        if (i === n - 1) return theoreticalTotalTime.toFixed(4);
        return ((i * theoreticalTotalTime) / (n - 1)).toFixed(4);
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

    // CRITICAL: Alway calculate FFT from the Time Domain data (effectiveAccData)
    // to get a high-resolution, continuous spectrum as shown in the user's reference.
    if (effectiveAccData && effectiveAccData.length > 0) {
        const fftResult = calculateFFT(effectiveAccData, configData.fmax);
        freqMagnitude = fftResult.magnitude;
        freqLabels = fftResult.frequency.map((f: number) => f.toFixed(2));
    } else if (freqData && freqData.length > 0) {
        // Fallback to provided freqData only if no time domain data exists
        let finalFreq = fPoints || freqData.map((_, i) => i);
        if (finalFreq.length === freqData.length) {
            const sorted = prepareCombinedSortedData(finalFreq, freqData);
            freqMagnitude = sorted.sortedMag;
            freqLabels = sorted.sortedFreq.map((f) => f.toFixed(2));
        } else {
            freqMagnitude = freqData;
            freqLabels = freqData.map((_, i) => i.toFixed(2));
        }
    }

    if (freqMagnitude.length > 0) {
        // Only cutoff if we are using calculated FFT or if Fmax is reasonably large
        const maxDisplayFreq = Math.max(configData.fmax, ...freqLabels.map(f => parseFloat(f)));
        // If the user's config is way too small compared to data, we show all data
        const realCutoff = Math.max(configData.fmax, 1.1 * Math.max(...freqLabels.map(f => parseFloat(f))));

        // Actually, if it's spectrum data from API, let's not cutoff at all unless it's huge
        // For now, let's just make sure we don't cutoff if it results in 0 points
        const cutOffIdx = freqLabels.findIndex((f) => parseFloat(f) > realCutoff);
        if (cutOffIdx !== -1 && cutOffIdx > 0) {
            freqMagnitude = freqMagnitude.slice(0, cutOffIdx);
            freqLabels = freqLabels.slice(0, cutOffIdx);
        }

        const { topPeaks: processedPeaks, pointBackgroundColor: processedColors } =
            findTopPeaks(freqMagnitude, freqLabels, configData.lor, 5);

        const freqChartData = {
            labels: freqLabels,
            datasets: [
                {
                    label: `${yAxisLabel} Magnitude`,
                    data: freqMagnitude,
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    tension: 0.1,
                    pointRadius: 0,
                    pointBackgroundColor: processedColors,
                },
            ],
        };

        const hasAnyData =
            (effectiveAccData && effectiveAccData.length > 0) ||
            (freqMagnitude.length > 0);

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
        hasData: (effectiveAccData && effectiveAccData.length > 0),
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
        const date = new Date(dateStr);
        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    } catch {
        return dateStr;
    }
}
