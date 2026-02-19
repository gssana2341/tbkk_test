import type {
  Sensor,
  SensorFilters,
  SensorReading,
  SensorSummary,
  SensorApiData,
  SensorStatus,
} from "@/lib/types";
// Add the import for getRegisteredDevices at the top of the file
import { getRegisteredDevices } from "./register";
import {
  adcToAccelerationG,
  accelerationGToMmPerSecSquared,
  accelerationToVelocity,
} from "@/lib/sensorCalculations";
import { getToken } from "@/lib/auth";

// Cache for real sensors from API
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes (for background re-use)
let realSensorsCache: Sensor[] | null = null;
let lastFetchTime = 0;
let inflightRawDataPromise: Promise<SensorApiData[]> | null = null;

// Helper to send "Lost" status notification to backend
async function sendLostNotification(apiSensor: any) {
  const token = getToken();
  const sensorId = apiSensor.id;
  const lastUpdated =
    apiSensor.last_data?.datetime || apiSensor.updated_at || "";

  // Deduplication: Only send once per "Lost" event for each sensor
  // We store the sensor ID and the last known data timestamp to know if it's the same "Lost" state
  const storageKey = `lost_notif_${sensorId}`;
  const alreadyNotified = localStorage.getItem(storageKey);

  if (alreadyNotified === lastUpdated) {
    // console.log(`Notification already sent for sensor ${sensorId} at ${lastUpdated}`);
    return;
  }

  try {
    const payload = {
      sensor_id: sensorId,
      status: "lost",
      alert_type: "lost",
      datetime: lastUpdated || new Date().toISOString(),
      mac_address: apiSensor.mac_address || "",
      area: apiSensor.area || "",
      sensor_name: apiSensor.sensor_name || apiSensor.name || "",
      machine_no: apiSensor.machine_no || apiSensor.machine_number || "",
      installation_point:
        apiSensor.installed_point || apiSensor.installation_point || "",
      machine_class: 0,
      machine: apiSensor.machine || "",
      sensor_type: apiSensor.sensor_type || "Master",
      motor_start_time: apiSensor.motor_start_time || "",
      time_interval: 0,
      high_pass: 0,
      g_scale: 0,
      lor: 0,
      max_frequency: 0,
      note: apiSensor.note || "Lost Status Detected",
      threshold_min: 0,
      threshold_medium: 0,
      threshold_max: 0,
      temperature_threshold_min: 0,
      temperature_threshold_max: 0,
    };

    const url = `${"/api"}/notification-logs`;
    console.log("Sending Lost notification for sensor:", sensorId, "to", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      localStorage.setItem(storageKey, lastUpdated);
      console.log(`Lost notification sent successfully for sensor ${sensorId}`);
    } else {
      const errorText = await response.text();
      console.error(
        `Failed to send Lost notification for sensor ${sensorId}:`,
        response.status,
        errorText
      );
    }
  } catch (error) {
    console.error(
      `Error sending Lost notification for sensor ${sensorId}:`,
      error
    );
  }
}

// Function to fetch real sensors from API
export async function fetchRealSensors(
  isShort: boolean = false
): Promise<Sensor[]> {
  // Check cache first
  const now = Date.now();
  if (realSensorsCache && now - lastFetchTime < CACHE_DURATION) {
    return realSensorsCache;
  }

  // Deduplicate network request
  if (!inflightRawDataPromise) {
    inflightRawDataPromise = (async () => {
      const token = getToken();
      try {
        const url = `${"/api"}/sensors/with-last-data`;
        console.log("Fetching real sensors (Network) from:", url);
        const response = await fetch(url, {
          cache: "no-store",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "ngrok-skip-browser-warning": "true",
          },
        });
        if (!response.ok) return [];
        const apiData = await response.json();
        return Array.isArray(apiData) ? apiData : [];
      } catch (error) {
        console.error("Network Error in fetchRealSensors:", error);
        return [];
      }
    })();
  }

  const apiData = await inflightRawDataPromise.finally(() => {
    // We clear it after resolution so next tick can trigger a fresh background fetch if needed
    // But within the same "event burst", everyone joins this promise.
    setTimeout(() => {
      inflightRawDataPromise = null;
    }, 100);
  });

  // Transform API data to match our Sensor interface
  const result = apiData.map((apiSensor: SensorApiData) => {
    const now = Date.now();
    // If isShort is true, we skip expensive calculation and large arrays
    if (isShort) {
      let status: SensorStatus = "ok";
      const veloRmsH = apiSensor.last_data?.velo_rms_h || 0;
      const veloRmsV = apiSensor.last_data?.velo_rms_v || 0;
      const veloRmsA = apiSensor.last_data?.velo_rms_a || 0;
      const maxRms = Math.max(veloRmsH, veloRmsV, veloRmsA);

      const tMin = apiSensor.threshold_min || 2.0;
      const tMed = apiSensor.threshold_medium || 4.5;
      const tMax = apiSensor.threshold_max || 9.0;

      const lastUpdated = apiSensor.last_data?.datetime
        ? new Date(apiSensor.last_data.datetime.replace("Z", "")).getTime()
        : apiSensor.updated_at
          ? new Date(apiSensor.updated_at.replace("Z", "")).getTime()
          : Date.now();

      // Check for "Lost" status based on time timeout (same logic as full path)
      const timeInterval = apiSensor.time_interval || 0; // minutes
      const timeoutThresholdMs = (timeInterval + 5) * 60 * 1000;
      const isLost = now - lastUpdated > timeoutThresholdMs;
      const operationalStatus = apiSensor.last_data ? "running" : "standby";

      if (isLost && operationalStatus !== "standby") {
        status = "lost";
        // Trigger notification for Lost status (async, don't await to not block rendering)
        if (typeof window !== "undefined") {
          sendLostNotification(apiSensor);
        }
      } else if (maxRms >= tMax && maxRms > 0) status = "critical";
      else if (maxRms >= tMed && maxRms > 0) status = "concern";
      else if (maxRms >= tMin && maxRms > 0) status = "warning";
      else if (!apiSensor.last_data) status = "standby";

      return {
        id: apiSensor.id,
        serialNumber: apiSensor.name,
        mac_address: apiSensor.mac_address || null,
        macAddress: apiSensor.mac_address || undefined,
        machineName: apiSensor.machine_no || "Unknown",
        sensor_name: apiSensor.sensor_name || apiSensor.name,
        name: apiSensor.sensor_name || apiSensor.name,
        location: apiSensor.installed_point || "N/A",
        status,
        lastUpdated,
        connectivity: apiSensor.last_data ? "online" : "offline",
        batteryLevel: apiSensor.last_data?.battery || 0,
        signalStrength: apiSensor.last_data?.rssi || 0,
        operationalStatus: apiSensor.last_data ? "running" : "standby",
        machine_class: apiSensor.machine_class,
        area: apiSensor.area,
        sensor_type: apiSensor.sensor_type || "Master",
        installationDate: new Date(apiSensor.created_at).getTime(),
        model: `Model-${apiSensor.id.substring(0, 8)}`,
        vibrationH: "normal",
        vibrationV: "normal",
        vibrationA: "normal",
        // Scalar data for tooltips and list view
        last_data: apiSensor.last_data
          ? {
              datetime: apiSensor.last_data.datetime,
              velo_rms_h: veloRmsH,
              velo_rms_v: veloRmsV,
              velo_rms_a: veloRmsA,
              temperature: apiSensor.last_data.temperature,
              battery: apiSensor.last_data.battery,
              rssi: apiSensor.last_data.rssi,
              level_vibration: apiSensor.last_data.level_vibration,
              level_temperature: apiSensor.last_data.level_temperature,
              g_rms_h: apiSensor.last_data.g_rms_h,
              g_rms_v: apiSensor.last_data.g_rms_v,
              g_rms_a: apiSensor.last_data.g_rms_a,
              a_rms_h: apiSensor.last_data.a_rms_h,
              a_rms_v: apiSensor.last_data.a_rms_v,
              a_rms_a: apiSensor.last_data.a_rms_a,
            }
          : undefined,
        h_stats: {
          velocityTopPeak: veloRmsH.toFixed(2),
          accelTopPeak: "0.00",
          dominantFreq: "0.00",
        },
        v_stats: {
          velocityTopPeak: veloRmsV.toFixed(2),
          accelTopPeak: "0.00",
          dominantFreq: "0.00",
        },
        a_stats: {
          velocityTopPeak: veloRmsA.toFixed(2),
          accelTopPeak: "0.00",
          dominantFreq: "0.00",
        },
        // Thresholds for list view colors
        threshold_min: apiSensor.threshold_min,
        threshold_medium: apiSensor.threshold_medium,
        threshold_max: apiSensor.threshold_max,
        // Skip raw data and detailed readings
        readings: [],
        maintenanceHistory: [],
      } as Sensor;
    }

    // Helper to calculate RMS from raw data if velo_rms is missing
    const calculateRmsFromRaw = (
      rawArray: number[][] | undefined,
      gScale: number = 16, // Default g_scale
      lor: number = 800, // Default lor
      fmax: number = 1000 // Default fmax
    ): number => {
      if (!rawArray || rawArray.length === 0) return 0;

      // Flatten the array of arrays
      const flattenedData = rawArray.flat();
      if (flattenedData.length === 0) return 0;

      // Convert ADC to G
      const gData = flattenedData.map((adc) => adcToAccelerationG(adc, gScale));

      // Convert G to mm/s^2
      const mmPerSecSquaredData = gData.map((g) =>
        accelerationGToMmPerSecSquared(g)
      );

      // Calculate time interval
      const totalTime = lor / fmax;
      const timeInterval = totalTime / (flattenedData.length - 1 || 1);

      // Convert to Velocity (mm/s)
      const velocityData = accelerationToVelocity(
        mmPerSecSquaredData,
        timeInterval
      );

      // Calculate RMS
      const sumSquare = velocityData.reduce((sum, val) => sum + val * val, 0);
      const rms = Math.sqrt(sumSquare / velocityData.length);

      return Number(rms.toFixed(2));
    };

    // Check if we need to calculate RMS (if missing or 0)
    let veloRmsH = apiSensor.last_data?.velo_rms_h || 0;
    let veloRmsV = apiSensor.last_data?.velo_rms_v || 0;
    let veloRmsA = apiSensor.last_data?.velo_rms_a || 0;

    // If RMS is 0 but we have raw data, calculate it
    // First try last_32 arrays (historical chunks)
    // Then try direct acc arrays (current reading)
    if (veloRmsH === 0) {
      if (apiSensor.last_data?.last_32_h) {
        veloRmsH = calculateRmsFromRaw(
          apiSensor.last_data.last_32_h,
          apiSensor.g_scale,
          apiSensor.lor,
          apiSensor.fmax
        );
      } else if (
        apiSensor.last_data?.acc_h &&
        apiSensor.last_data.acc_h.length > 0
      ) {
        veloRmsH = calculateRmsFromRaw(
          [apiSensor.last_data.acc_h],
          apiSensor.g_scale,
          apiSensor.lor,
          apiSensor.fmax
        );
      }
    }

    if (veloRmsV === 0) {
      if (apiSensor.last_data?.last_32_v) {
        veloRmsV = calculateRmsFromRaw(
          apiSensor.last_data.last_32_v,
          apiSensor.g_scale,
          apiSensor.lor,
          apiSensor.fmax
        );
      } else if (
        apiSensor.last_data?.acc_v &&
        apiSensor.last_data.acc_v.length > 0
      ) {
        veloRmsV = calculateRmsFromRaw(
          [apiSensor.last_data.acc_v],
          apiSensor.g_scale,
          apiSensor.lor,
          apiSensor.fmax
        );
      }
    }

    if (veloRmsA === 0) {
      if (apiSensor.last_data?.last_32_a) {
        veloRmsA = calculateRmsFromRaw(
          apiSensor.last_data.last_32_a,
          apiSensor.g_scale,
          apiSensor.lor,
          apiSensor.fmax
        );
      } else if (
        apiSensor.last_data?.acc_a &&
        apiSensor.last_data.acc_a.length > 0
      ) {
        veloRmsA = calculateRmsFromRaw(
          [apiSensor.last_data.acc_a],
          apiSensor.g_scale,
          apiSensor.lor,
          apiSensor.fmax
        );
      }
    }

    // Update the last_data object with calculated values if needed
    if (apiSensor.last_data) {
      if (!apiSensor.last_data.velo_rms_h)
        apiSensor.last_data.velo_rms_h = veloRmsH;
      if (!apiSensor.last_data.velo_rms_v)
        apiSensor.last_data.velo_rms_v = veloRmsV;
      if (!apiSensor.last_data.velo_rms_a)
        apiSensor.last_data.velo_rms_a = veloRmsA;
    }

    // Create readings from data if available
    const readings: SensorReading[] = [];
    if (apiSensor.last_data) {
      // Use the new simplified data structure
      const temperature = apiSensor.last_data.temperature || 0;

      // Extract H, V, A data from separate arrays
      // Data will be processed later if needed

      // Create readings with temperature only (vibration data comes from H, V, A arrays)
      readings.push({
        timestamp: new Date(
          apiSensor.last_data.datetime.replace("Z", "")
        ).getTime(),
        temperature,
        vibrationX: 0, // Vibration data is calculated from H, V, A arrays
        vibrationY: 0,
        vibrationZ: 0,
      });
    }

    // Use data directly from API without calculation
    // Extract acceleration data arrays
    const hData = apiSensor.last_data?.acc_h || [];
    const vData = apiSensor.last_data?.acc_v || [];
    const aData = apiSensor.last_data?.acc_a || [];

    // Use RMS values directly from API (no calculation needed)
    const hStats = {
      accelTopPeak: "0.00",
      velocityTopPeak: apiSensor.last_data?.velo_rms_h?.toFixed(2) || "0.00",
      dominantFreq: "0.00", // Can be calculated from freq_h if needed
    };
    const vStats = {
      accelTopPeak: "0.00",
      velocityTopPeak: apiSensor.last_data?.velo_rms_v?.toFixed(2) || "0.00",
      dominantFreq: "0.00", // Can be calculated from freq_v if needed
    };
    const aStats = {
      accelTopPeak: "0.00",
      velocityTopPeak: apiSensor.last_data?.velo_rms_a?.toFixed(2) || "0.00",
      dominantFreq: "0.00", // Can be calculated from freq_a if needed
    };

    const lastDataTime = apiSensor.last_data?.datetime
      ? new Date(apiSensor.last_data.datetime.replace("Z", "")).getTime()
      : 0;
    const updatedAtTime = apiSensor.updated_at
      ? new Date(apiSensor.updated_at.replace("Z", "")).getTime()
      : 0;

    // Select the latest timestamp between the actual data time and the record's update time
    const lastUpdated = Math.max(lastDataTime, updatedAtTime) || now;

    // Determine status based on visual color groups (matches SensorCard.tsx)
    let status: SensorStatus = "ok";

    // 1. Check for "Lost" status based on time timeout
    const timeInterval = apiSensor.time_interval || 0; // minutes
    const timeoutThresholdMs = (timeInterval + 5) * 60 * 1000;
    const isLost = now - lastUpdated > timeoutThresholdMs;

    const connectivity = apiSensor.last_data ? "online" : "offline";
    const operationalStatus = apiSensor.last_data ? "running" : "standby";

    if (isLost && operationalStatus !== "standby") {
      status = "lost";
      // Trigger notification for Lost status (async, don't await to not block rendering)
      if (typeof window !== "undefined") {
        sendLostNotification(apiSensor);
      }
    } else {
      // Calculate status from Vibration RMS
      const maxRms = Math.max(veloRmsH, veloRmsV, veloRmsA);
      const tMin =
        apiSensor.threshold_min !== undefined && apiSensor.threshold_min > 0
          ? apiSensor.threshold_min
          : 2.0;
      const tMed =
        apiSensor.threshold_medium !== undefined &&
        apiSensor.threshold_medium > 0
          ? apiSensor.threshold_medium
          : 4.5;
      const tMax =
        apiSensor.threshold_max !== undefined && apiSensor.threshold_max > 0
          ? apiSensor.threshold_max
          : 9.0;

      if (maxRms >= tMax && maxRms > 0) {
        status = "critical";
      } else if (maxRms >= tMed && maxRms > 0) {
        status = "concern";
      } else if (maxRms >= tMin && maxRms > 0) {
        status = "warning";
      } else if (operationalStatus === "standby") {
        status = "standby";
      } else {
        status = "ok";
      }
    }

    // Generate sensor number from name or use index

    const sensor: Sensor = {
      id: apiSensor.id,
      serialNumber: apiSensor.name, // Use name as serial number since it's the device identifier
      machineName: apiSensor.machine_no || "Unknown Machine",
      sensor_type: apiSensor.sensor_type || "Master",
      location: apiSensor.installed_point || "API Location",
      installationDate: new Date(apiSensor.created_at).getTime(),
      lastUpdated,
      readings,
      status,
      maintenanceHistory: [],
      // New fields for card display
      name: apiSensor.sensor_name || apiSensor.name, // Use sensor_name if available, otherwise fallback to name
      model: `Model-${apiSensor.id.substring(0, 8)}`,
      operationalStatus: apiSensor.last_data ? "running" : "standby",
      batteryLevel: apiSensor.last_data?.battery || 0,
      connectivity: apiSensor.last_data ? "online" : "offline",
      signalStrength: apiSensor.last_data?.rssi || 0,
      vibrationH: "normal",
      vibrationV: "normal",
      vibrationA: "normal",
      // Store raw API data for access by components
      last_data: apiSensor.last_data
        ? {
            datetime: apiSensor.last_data.datetime,
            acc_h: apiSensor.last_data.acc_h || [],
            freq_h: apiSensor.last_data.freq_h || [],
            acc_v: apiSensor.last_data.acc_v || [],
            freq_v: apiSensor.last_data.freq_v || [],
            acc_a: apiSensor.last_data.acc_a || [],
            freq_a: apiSensor.last_data.freq_a || [],
            velo_rms_h: apiSensor.last_data.velo_rms_h,
            velo_rms_v: apiSensor.last_data.velo_rms_v,
            velo_rms_a: apiSensor.last_data.velo_rms_a,
            temperature: apiSensor.last_data.temperature,
            battery: apiSensor.last_data.battery,
            rssi: apiSensor.last_data.rssi,
            level_vibration: apiSensor.last_data.level_vibration,
            level_temperature: apiSensor.last_data.level_temperature,
            // G RMS values for tooltip
            g_rms_h: apiSensor.last_data.g_rms_h,
            g_rms_v: apiSensor.last_data.g_rms_v,
            g_rms_a: apiSensor.last_data.g_rms_a,
            // A RMS values
            a_rms_h: apiSensor.last_data.a_rms_h,
            a_rms_v: apiSensor.last_data.a_rms_v,
            a_rms_a: apiSensor.last_data.a_rms_a,
            v: vData,
            a: aData,
            // Map new config fields if present in last_data
            fmax: apiSensor.last_data.fmax,
            lor: apiSensor.last_data.lor,
            g_scale: apiSensor.last_data.g_scale,
          }
        : undefined,
      // Store calculated H, V, A statistics
      h_stats: hStats,
      v_stats: vStats,
      a_stats: aStats,
      // New API configuration fields
      fmax: apiSensor.fmax,
      lor: apiSensor.lor,
      g_scale: apiSensor.g_scale,
      alarm_ths: apiSensor.alarm_ths,
      time_interval: apiSensor.time_interval,
      motor_start_time: apiSensor.motor_start_time,
      // Threshold configuration fields from API
      threshold_min: apiSensor.threshold_min,
      threshold_medium: apiSensor.threshold_medium,
      threshold_max: apiSensor.threshold_max,
      machine_class: apiSensor.machine_class,
      machine_number: apiSensor.machine_no,
      installation_point: apiSensor.installed_point,
      area: apiSensor.area,
      machine: apiSensor.machine,
      sensor_name: apiSensor.sensor_name,
      temperature_threshold_min: apiSensor.temperature_threshold_min,
      temperature_threshold_max: apiSensor.temperature_threshold_max,
      macAddress: apiSensor.mac_address || undefined,
      mac_address: apiSensor.mac_address || null,
    };

    return sensor;
  });

  // Deduplicate by sensor ID (API may return duplicates)
  const uniqueMap = new Map<string, Sensor>();
  for (const sensor of result) {
    if (!uniqueMap.has(sensor.id)) {
      uniqueMap.set(sensor.id, sensor);
    }
  }
  const dedupedResult = Array.from(uniqueMap.values());

  // Global cache for full data (if we ever need it)
  if (!isShort) {
    realSensorsCache = dedupedResult;
    lastFetchTime = Date.now();
  }

  return dedupedResult;
}

// Get all sensors with pagination and filtering
export async function getSensors(
  filters: SensorFilters & { isShort?: boolean } = {}
): Promise<{ sensors: Sensor[]; total: number }> {
  // Fetch real sensors from API only
  const realSensors = await fetchRealSensors(filters.isShort);

  // Helper function to get severity weight
  const getSeverityWeight = (sensor: Sensor): number => {
    // Priority per user request: Red > Orange > Yellow > Green > Gray > Black
    switch (sensor.status) {
      case "critical":
        return 60; // Red
      case "concern":
        return 50; // Orange
      case "warning":
        return 40; // Yellow
      case "ok":
        return 30; // Green
      case "standby":
        return 20; // Gray
      case "lost":
        return 10; // Black
      default:
        return 0;
    }
  };

  // Sort real sensors by severity then by last updated (newest first)
  let allSensors = realSensors.sort((a, b) => {
    const weightA = getSeverityWeight(a);
    const weightB = getSeverityWeight(b);

    if (weightA !== weightB) {
      return weightB - weightA; // Descending order of weight
    }

    // Secondary sort: Last updated (newest first)
    return b.lastUpdated - a.lastUpdated;
  });

  // Apply filters
  if (filters.status && filters.status !== "all") {
    allSensors = allSensors.filter(
      (sensor) => sensor.status === filters.status
    );
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    allSensors = allSensors.filter(
      (sensor) =>
        sensor.serialNumber.toLowerCase().includes(searchLower) ||
        sensor.machineName.toLowerCase().includes(searchLower) ||
        sensor.name.toLowerCase().includes(searchLower) ||
        (sensor.location && sensor.location.toLowerCase().includes(searchLower))
    );
  }

  // Get total count before pagination
  const total = allSensors.length;

  // Apply pagination
  const page = filters.page || 1;
  const limit = filters.limit || 50; // Default to 50 per page
  const start = (page - 1) * limit;
  const end = start + limit;

  allSensors = allSensors.slice(start, end);

  return { sensors: allSensors, total };
}

// Get a single sensor by ID
export async function getSensorById(id: string): Promise<Sensor | null> {
  // Fetch from real API only
  try {
    const realSensors = await fetchRealSensors();
    const realSensor = realSensors.find((s) => s.id === id);
    if (realSensor) return realSensor;
  } catch {
    // Error fetching real sensor by ID
  }

  // Check in registered sensors
  try {
    const { sensors: registeredSensors } = await getRegisteredDevices();
    const sensor = registeredSensors.find((s) => s.id === id);
    if (sensor) return sensor;
  } catch {
    // Error fetching registered sensors
  }

  return null;
}

// Get sensor readings for a specific sensor
export async function getSensorReadings(
  sensorId: string
): Promise<SensorReading[]> {
  // Fetch from real API only
  try {
    const realSensors = await fetchRealSensors();
    const realSensor = realSensors.find((s) => s.id === sensorId);
    if (realSensor && realSensor.readings.length > 0) {
      return realSensor.readings;
    }
  } catch {
    // Error fetching real sensor readings
  }

  // Check in registered sensors
  try {
    const { sensors: registeredSensors } = await getRegisteredDevices();
    const sensor = registeredSensors.find((s) => s.id === sensorId);
    if (sensor && sensor.readings.length > 0) {
      return sensor.readings;
    }
  } catch {
    // Error fetching registered sensors
  }

  // If sensor not found, return empty array
  return [];
}

// Get summary data for dashboard
export async function getSensorSummary(
  period: "daily" | "weekly" | "monthly"
): Promise<SensorSummary> {
  // Fetch real sensors from API only
  const allSensors = await fetchRealSensors();

  // Count sensors by status
  const criticalCount = allSensors.filter(
    (s) => s.status === "critical"
  ).length;
  const warningCount = allSensors.filter((s) => s.status === "warning").length;

  // Calculate temperature stats from all sensors
  const allTemps: number[] = [];
  const allVibX: number[] = [];
  const allVibY: number[] = [];
  const allVibZ: number[] = [];

  allSensors.forEach((sensor) => {
    sensor.readings.forEach((reading) => {
      allTemps.push(reading.temperature);
      allVibX.push(reading.vibrationX);
      allVibY.push(reading.vibrationY);
      allVibZ.push(reading.vibrationZ);
    });
  });

  const avgTemp =
    allTemps.length > 0
      ? allTemps.reduce((sum, temp) => sum + temp, 0) / allTemps.length
      : 0;
  const minTemp = allTemps.length > 0 ? Math.min(...allTemps) : 0;
  const maxTemp = allTemps.length > 0 ? Math.max(...allTemps) : 0;

  const avgVibX =
    allVibX.length > 0
      ? allVibX.reduce((sum, vib) => sum + vib, 0) / allVibX.length
      : 0;
  const avgVibY =
    allVibY.length > 0
      ? allVibY.reduce((sum, vib) => sum + vib, 0) / allVibY.length
      : 0;
  const avgVibZ =
    allVibZ.length > 0
      ? allVibZ.reduce((sum, vib) => sum + vib, 0) / allVibZ.length
      : 0;

  // Chart data should be fetched from API based on the period
  // For now, return empty arrays - will be populated from API
  const dataPoints = period === "daily" ? 24 : period === "weekly" ? 7 : 30;

  const temperatureData = Array.from({ length: dataPoints }).map((_, i) => {
    const pointName =
      period === "daily"
        ? `${i}:00`
        : period === "weekly"
          ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i % 7]
          : `Day ${i + 1}`;

    return {
      name: pointName,
      min: 0,
      avg: avgTemp > 0 ? Number.parseFloat(avgTemp.toFixed(1)) : 0,
      max: 0,
    };
  });

  const vibrationData = Array.from({ length: dataPoints }).map((_, i) => {
    const pointName =
      period === "daily"
        ? `${i}:00`
        : period === "weekly"
          ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i % 7]
          : `Day ${i + 1}`;

    return {
      name: pointName,
      x: avgVibX > 0 ? Number.parseFloat(avgVibX.toFixed(2)) : 0,
      y: avgVibY > 0 ? Number.parseFloat(avgVibY.toFixed(2)) : 0,
      z: avgVibZ > 0 ? Number.parseFloat(avgVibZ.toFixed(2)) : 0,
    };
  });

  return {
    totalSensors: allSensors.length,
    activeSensors: allSensors.filter((s) => s.status !== "critical").length,
    criticalAlerts: criticalCount,
    criticalAlertsChange: 0, // Should be calculated from API data
    warningAlerts: warningCount,
    warningAlertsChange: 0, // Should be calculated from API data
    avgTemperature: Number.parseFloat(avgTemp.toFixed(1)),
    minTemperature: Number.parseFloat(minTemp.toFixed(1)),
    maxTemperature: Number.parseFloat(maxTemp.toFixed(1)),
    avgVibration: {
      x: Number.parseFloat(avgVibX.toFixed(2)),
      y: Number.parseFloat(avgVibY.toFixed(2)),
      z: Number.parseFloat(avgVibZ.toFixed(2)),
    },
    temperatureData,
    vibrationData,
  };
}

// Delete a sensor by ID
export async function deleteSensor(id: string): Promise<boolean> {
  try {
    const token = getToken();
    const url = `${"/api"}/sensors/${id}`;
    console.log("Attempting to delete sensor at URL:", url);

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      console.error(
        `Error deleting sensor: ${response.status} ${response.statusText}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting sensor:", error);
    return false;
  }
}
