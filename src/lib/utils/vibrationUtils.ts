import {
  adcToAccelerationG,
  accelerationGToMmPerSecSquared,
  findTopPeaks,
  handlingWindowFunction,
  calculateFFT,
} from "./sensorCalculations";
import type { Sensor } from "@/lib/types";

// Types for vibration levels and color schemes
export type VibrationLevel = "normal" | "warning" | "concern" | "critical";
export type ColorScheme = "dark" | "light" | "card";

// Interface for threshold configuration
export interface VibrationThresholds {
  min?: number;
  medium?: number;
  max?: number;
}

export interface SensorConfig {
  threshold_min?: string | number;
  threshold_medium?: string | number;
  threshold_max?: string | number;
  thresholdMin?: string | number;
  thresholdMedium?: string | number;
  thresholdMax?: string | number;
  machineClass?: string;
}

/**
 * Get vibration level based on velocity value and thresholds
 * @param velocityValue - Velocity value in mm/s
 * @param thresholds - Optional custom thresholds, uses defaults if not provided
 * @returns Vibration level string
 */
export function getVibrationLevel(
  velocityValue: number,
  thresholds?: VibrationThresholds
): VibrationLevel {
  // Use more reasonable default thresholds that match typical sensor configurations (ISO 10816-ish)
  // Aligned with NotificationHistoryTable visual logic (< 2 green, < 3 yellow, >= 3 red)
  const minThreshold = thresholds?.min ?? 2.0; // 2.0 mm/s (Start of Warning)
  const mediumThreshold = thresholds?.medium ?? 2.5; // 2.5 mm/s (Start of Concern)
  const maxThreshold = thresholds?.max ?? 3.0; // 3.0 mm/s (Start of Critical)

  if (velocityValue < minThreshold) {
    return "normal";
  } else if (velocityValue >= minThreshold && velocityValue < mediumThreshold) {
    return "warning";
  } else if (velocityValue >= mediumThreshold && velocityValue < maxThreshold) {
    return "concern";
  } else {
    return "critical";
  }
}

/**
 * Get vibration level from sensor config (for sensor detail page)
 * @param velocityValue - Velocity value in mm/s
 * @param config - Sensor configuration from API
 * @returns Vibration level string
 */
export function getVibrationLevelFromConfig(
  velocityValue: number,
  config: SensorConfig
): VibrationLevel {
  const thresholds: VibrationThresholds = {
    min:
      config.thresholdMin !== undefined
        ? Number(config.thresholdMin)
        : config.threshold_min !== undefined
          ? Number(config.threshold_min)
          : undefined,
    medium:
      config.thresholdMedium !== undefined
        ? Number(config.thresholdMedium)
        : config.threshold_medium !== undefined
          ? Number(config.threshold_medium)
          : undefined,
    max:
      config.thresholdMax !== undefined
        ? Number(config.thresholdMax)
        : config.threshold_max !== undefined
          ? Number(config.threshold_max)
          : undefined,
  };

  return getVibrationLevel(velocityValue, thresholds);
}

/**
 * Get CSS color class for vibration level
 * @param level - Vibration level
 * @param scheme - Color scheme (dark, light, or card)
 * @param isOffline - Whether sensor is offline
 * @returns CSS class string
 */
export function getVibrationColor(
  level: VibrationLevel,
  scheme: ColorScheme = "light",
  isOffline: boolean = false
): string {
  // If sensor is offline, return gray color
  if (isOffline) {
    return "bg-gray-400";
  }

  // เหลือง = [#fae739]
  // ส้ม = [#ff6600]
  // แดง = [#ff0000]

  const colorMap = {
    dark: {
      normal: "bg-[#00e200] text-black",
      warning: "bg-[#ffff00] text-black",
      concern: "bg-[#ff9900] text-black",
      critical: "bg-[#ff2b05] text-black",
    },
    light: {
      normal: "bg-[#00e200] text-black",
      warning: "bg-[#ffff00] text-black",
      concern: "bg-[#ff9900] text-black",
      critical: "bg-[#ff2b05] text-black",
    },
    card: {
      normal: "bg-[#00e200] text-black",
      warning: "bg-[#ffff00] text-black",
      concern: "bg-[#ff9900] text-black",
      critical: "bg-[#ff2b05] text-black",
    },
  };

  const color = colorMap[scheme][level] || colorMap[scheme].normal;

  // Add !important for card scheme to override default card background
  // if (scheme === "card") {
  //   return color.replace("bg-", "!bg-");
  // }

  return color;
}

/**
 * Get vibration color directly from velocity value and config
 * @param velocityValue - Velocity value in mm/s
 * @param config - Sensor configuration
 * @param scheme - Color scheme
 * @param isOffline - Whether sensor is offline
 * @returns CSS class string
 */
export function getVibrationColorFromVelocity(
  velocityValue: number,
  config: SensorConfig,
  scheme: ColorScheme = "light",
  isOffline: boolean = false
): string {
  const level = getVibrationLevelFromConfig(velocityValue, config);
  return getVibrationColor(level, scheme, isOffline);
}

/**
 * Get vibration color for sensor axis (for list/dot views)
 * @param sensor - Sensor object
 * @param axis - Axis ('h', 'v', 'a')
 * @param scheme - Color scheme
 * @returns CSS class string
 */
export function getSensorAxisVibrationColor(
  sensor: Sensor,
  axis: "h" | "v" | "a",
  scheme: ColorScheme = "light",
  g_scale: number = 16,
  fmax: number = 400
): string {
  // If sensor is offline, return gray color
  if (sensor.connectivity === "offline") {
    return "bg-gray-400";
  }

  // Calculate velocity-based vibration status using real data
  if (sensor.connectivity === "online" && sensor.last_data) {
    // Get the correct data arrays based on axis
    let axisData: number[] = [];
    if (axis === "h" && sensor.last_data.h) {
      axisData = Array.isArray(sensor.last_data.h) ? sensor.last_data.h : [];
    } else if (axis === "v" && sensor.last_data.v) {
      axisData = Array.isArray(sensor.last_data.v) ? sensor.last_data.v : [];
    } else if (axis === "a" && sensor.last_data.a) {
      axisData = Array.isArray(sensor.last_data.a) ? sensor.last_data.a : [];
    }

    if (axisData && axisData.length > 0) {
      // Calculate time interval based on LOR and fmax from sensor configuration
      const lor = sensor.lor || 6400; // Use sensor's LOR value or default
      const sensorFmax = sensor.fmax || fmax || 400; // Use sensor's fmax value or default
      const totalTime = lor / sensorFmax;

      // Use sensor's g_scale from API, fallback to parameter, then default
      const sensorGScale = sensor.g_scale || g_scale || 16;

      const gData = axisData.map((adc) =>
        adcToAccelerationG(adc, sensorGScale)
      );
      const mmPerSecSquaredData = gData.map((g) =>
        accelerationGToMmPerSecSquared(g)
      );
      const deltaF = 1 / totalTime;
      const freqLabels = Array.from(
        { length: axisData.length },
        (_, i) => i * deltaF
      ).map((label) => label.toFixed(2));

      const mmWithHanding = handlingWindowFunction(
        mmPerSecSquaredData
      ) as number[];

      let magnitude: number[] = [];

      ({ magnitude } = calculateFFT(mmWithHanding, sensorFmax));

      magnitude = magnitude.map(
        (val, idx) => val / (2 * Math.PI * (idx * deltaF))
      );

      const stats = findTopPeaks(magnitude, freqLabels, lor, 1);
      const velocityValue = parseFloat(stats.topPeaks[0].peak.toFixed(2));

      // Use sensor's own threshold configuration if available, with fallback to defaults
      const sensorConfig: SensorConfig = {
        thresholdMin:
          sensor.threshold_min !== undefined
            ? Number(sensor.threshold_min)
            : 0.1,
        thresholdMedium:
          sensor.threshold_medium !== undefined
            ? Number(sensor.threshold_medium)
            : 0.125,
        thresholdMax:
          sensor.threshold_max !== undefined
            ? Number(sensor.threshold_max)
            : 0.15,
        machineClass: sensor.machine_class || undefined,
      };

      // if(sensor.sensor_name == 'D02') {
      //   console.log(velocityValue);
      // }

      return getVibrationColorFromVelocity(
        velocityValue,
        sensorConfig,
        scheme,
        false
      );
    }
  }

  // Fallback to sensor's stored vibration level
  const level =
    axis === "h"
      ? sensor.vibrationH
      : axis === "v"
        ? sensor.vibrationV
        : sensor.vibrationA;

  // Map stored levels to new levels
  const levelMap: Record<string, VibrationLevel> = {
    normal: "normal",
    warning: "warning",
    concern: "concern",
    critical: "critical",
  };

  const mappedLevel = levelMap[level] || "normal";
  return getVibrationColor(mappedLevel, scheme, false);
}

/**
 * Get vibration level for sensor axis (for card view)
 * @param sensor - Sensor object
 * @param axis - Axis ('h', 'v', 'a')
 * @returns Vibration level string
 */

/**
 * Get card background color for sensor detail page
 * @param velocityValue - Velocity value in mm/s
 * @param config - Sensor configuration
 * @returns CSS class string
 */
export function getCardBackgroundColor(
  velocityValue: number,
  config: SensorConfig
): string {
  return getVibrationColorFromVelocity(velocityValue, config, "card", false);
}

/**
 * Get default thresholds for fallback scenarios
 * @returns Default threshold values
 */
export function getDefaultThresholds(): VibrationThresholds {
  return {
    min: 2.0,
    medium: 2.5,
    max: 3.0,
  };
}
