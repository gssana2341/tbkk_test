import { fft } from "fft-js";

export const adcToAccelerationG = (adc: number, gScale: number): number => {
  // This is a placeholder implementation.
  // The actual conversion depends on the ADC resolution and sensor sensitivity.
  const adcResolution = 4096; // Assuming 12-bit ADC
  return (adc / adcResolution) * gScale;
};

export const accelerationGToMmPerSecSquared = (g: number): number => {
  const gInMetersPerSecondSquared = 9.80665;
  return g * gInMetersPerSecondSquared * 1000;
};

export const accelerationToVelocity = (
  accelerationData: number[],
  timeInterval: number
): number[] => {
  let velocity = 0;
  return accelerationData.map((acceleration) => {
    velocity += acceleration * timeInterval;
    return velocity;
  });
};

export const calculateFFT = (
  data: number[],
  sampleRate: number
): { magnitude: number[]; frequency: number[] } => {
  const phasors = fft(data);
  const magnitude = phasors.map(
    (p) => Math.sqrt(p[0] * p[0] + p[1] * p[1]) / data.length
  );
  const frequency = Array.from(
    { length: data.length },
    (_, i) => (i * sampleRate) / data.length
  );
  return { magnitude, frequency };
};

export const getAxisTopPeakStats = (
  axisData: number[],
  gScale: number,
  fmax: number
): { accelTopPeak: string; velocityTopPeak: string; dominantFreq: string } => {
  const gData = axisData.map((adc) => adcToAccelerationG(adc, gScale));
  const { magnitude, frequency } = calculateFFT(gData, fmax);

  let maxMag = 0;
  let dominantFreq = 0;
  for (let i = 1; i < magnitude.length / 2; i++) {
    if (magnitude[i] > maxMag) {
      maxMag = magnitude[i];
      dominantFreq = frequency[i];
    }
  }

  const accelTopPeak = maxMag.toFixed(3);

  // Placeholder for velocity calculation
  const velocityTopPeak = (maxMag * 10).toFixed(3);

  return {
    accelTopPeak,
    velocityTopPeak,
    dominantFreq: dominantFreq.toFixed(3),
  };
};

export const calculateVibrationStats = (
  h: number[],
  v: number[],
  a: number[]
): { rms: string; peak: string; status: string } => {
  const allData = [...h, ...v, ...a];
  const rms = Math.sqrt(
    allData.reduce((sum, val) => sum + val * val, 0) / allData.length
  ).toFixed(3);
  const peak = Math.max(...allData.map(Math.abs)).toFixed(3);
  const status =
    parseFloat(rms) > 0.8
      ? "Critical"
      : parseFloat(rms) > 0.5
        ? "Warning"
        : "Normal";
  return { rms, peak, status };
};

export const handlingWindowFunction = (data: number[]): number[] => {
  // Placeholder for windowing function (e.g., Hanning window)
  return data.map(
    (value, index) =>
      value * (0.5 * (1 - Math.cos((2 * Math.PI * index) / (data.length - 1))))
  );
};

export const findTopPeaks = (
  magnitude: number[],
  frequency: number[],
  lor: number,
  count: number
): {
  topPeaks: { peak: number; rms: string; frequency: string }[];
  pointBackgroundColor: string[];
} => {
  const peaks = [];
  for (let i = 1; i < magnitude.length - 1; i++) {
    if (magnitude[i] > magnitude[i - 1] && magnitude[i] > magnitude[i + 1]) {
      peaks.push({ magnitude: magnitude[i], frequency: frequency[i] });
    }
  }

  const topPeaks = peaks
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, count)
    .map((p) => ({
      peak: p.magnitude,
      rms: (p.magnitude / Math.sqrt(2)).toFixed(3),
      frequency: p.frequency.toString(),
    }));

  const pointBackgroundColor = magnitude.map((m) =>
    topPeaks.some((p) => p.peak === m) ? "red" : "transparent"
  );

  return { topPeaks, pointBackgroundColor };
};
