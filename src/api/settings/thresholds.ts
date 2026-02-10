import axios from "axios";
import type {
  TemperatureThresholds,
  VibrationThresholds,
  MachineThresholdOverride,
  ThresholdSettings,
  ThresholdSettingsResponse,
} from "@/lib/types";
import { getToken } from "@/lib/auth";

const API_BASE_URL = "/api";

// Get axios instance with auth token
const getAxiosInstance = () => {
  const token = getToken();
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
};

// Global inflight promise for deduplication
let thresholdsPromise: Promise<ThresholdSettings> | null = null;

// Get all threshold settings
export async function getThresholdSettings(): Promise<ThresholdSettings> {
  if (thresholdsPromise) return thresholdsPromise;

  thresholdsPromise = (async () => {
    try {
      const axiosInstance = getAxiosInstance();
      const response = await axiosInstance.get<
        ThresholdSettingsResponse | ThresholdSettings
      >("/settings/thresholds");

      console.log("Threshold settings API response:", response.data);

      // Handle different response formats
      let settings: Partial<ThresholdSettings> | null = null;

      // Check if response has nested settings property
      if (
        response.data &&
        typeof response.data === "object" &&
        "settings" in response.data
      ) {
        settings = (response.data as ThresholdSettingsResponse).settings;
        console.log("Found settings in response.data.settings");
      }
      // Check if response.data is already the settings object
      else if (
        response.data &&
        typeof response.data === "object" &&
        ("temperature" in response.data ||
          "vibration" in response.data ||
          "machine_overrides" in response.data)
      ) {
        settings = response.data as Partial<ThresholdSettings>;
        console.log("Found settings directly in response.data");
      }
      // Fallback to default if response structure is unexpected
      else {
        console.warn("Unexpected response format from /settings/thresholds:", {
          responseData: response.data,
          responseStatus: response.status,
          responseHeaders: response.headers,
        });
        // Return localStorage or default instead of throwing error
        return getThresholdSettingsFromLocalStorage();
      }

      // Ensure all required properties exist with defaults
      const normalizedSettings: ThresholdSettings = {
        temperature: {
          warning:
            settings?.temperature?.warning ??
            defaultThresholdSettings.temperature.warning,
          critical:
            settings?.temperature?.critical ??
            defaultThresholdSettings.temperature.critical,
        },
        vibration: {
          warning:
            settings?.vibration?.warning ??
            defaultThresholdSettings.vibration.warning,
          critical:
            settings?.vibration?.critical ??
            defaultThresholdSettings.vibration.critical,
          x_axis_warning:
            settings?.vibration?.x_axis_warning ??
            defaultThresholdSettings.vibration.x_axis_warning,
          y_axis_warning:
            settings?.vibration?.y_axis_warning ??
            defaultThresholdSettings.vibration.y_axis_warning,
          z_axis_warning:
            settings?.vibration?.z_axis_warning ??
            defaultThresholdSettings.vibration.z_axis_warning,
        },
        machine_overrides: Array.isArray(settings?.machine_overrides)
          ? settings.machine_overrides.filter(
              (
                override: MachineThresholdOverride | null | undefined
              ): override is MachineThresholdOverride => override != null
            )
          : [],
      };

      console.log("Normalized threshold settings:", normalizedSettings);

      // Save to localStorage for fallback
      saveThresholdSettingsToLocalStorage(normalizedSettings);

      return normalizedSettings;
    } catch (error) {
      console.error("Error fetching threshold settings from API:", error);
      if (error && typeof error === "object" && "message" in error) {
        console.error("Error details:", {
          message: (error as { message?: string }).message,
          response: (
            error as { response?: { data?: unknown; status?: number } }
          ).response?.data,
          status: (error as { response?: { status?: number } }).response
            ?.status,
        });
      }
      // Fallback to localStorage if API fails - don't throw error
      const localStorageSettings = getThresholdSettingsFromLocalStorage();
      console.log(
        "Using localStorage settings as fallback:",
        localStorageSettings
      );
      return localStorageSettings;
    } finally {
      // Clear after small delay to catch simultaneous bursts
      setTimeout(() => {
        thresholdsPromise = null;
      }, 500);
    }
  })();

  return thresholdsPromise;
}

// Update temperature thresholds
export async function updateTemperatureThresholds(
  thresholds: TemperatureThresholds
): Promise<TemperatureThresholds> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{
      thresholds: TemperatureThresholds;
    }>("/settings/thresholds/temperature", thresholds);
    // Save to localStorage as backup
    const currentSettings = getThresholdSettingsFromLocalStorage();
    saveThresholdSettingsToLocalStorage({
      ...currentSettings,
      temperature: response.data.thresholds,
    });
    return response.data.thresholds;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getThresholdSettingsFromLocalStorage();
    const updatedSettings = {
      ...currentSettings,
      temperature: thresholds,
    };
    saveThresholdSettingsToLocalStorage(updatedSettings);
    return thresholds;
  }
}

// Update vibration thresholds
export async function updateVibrationThresholds(
  thresholds: VibrationThresholds
): Promise<VibrationThresholds> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{
      thresholds: VibrationThresholds;
    }>("/settings/thresholds/vibration", thresholds);
    // Save to localStorage as backup
    const currentSettings = getThresholdSettingsFromLocalStorage();
    saveThresholdSettingsToLocalStorage({
      ...currentSettings,
      vibration: response.data.thresholds,
    });
    return response.data.thresholds;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getThresholdSettingsFromLocalStorage();
    const updatedSettings = {
      ...currentSettings,
      vibration: thresholds,
    };
    saveThresholdSettingsToLocalStorage(updatedSettings);
    return thresholds;
  }
}

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Add machine threshold override
export async function addMachineThresholdOverride(
  override: Omit<MachineThresholdOverride, "id" | "created_at" | "updated_at">
): Promise<MachineThresholdOverride> {
  try {
    const axiosInstance = getAxiosInstance();

    // Prepare the payload - only include machine_id if it's a valid UUID
    const payload: {
      machine_name: string;
      machine_class: string;
      machine_id?: string;
      temperature_warning?: number;
      temperature_critical?: number;
      vibration_warning?: number;
      vibration_critical?: number;
    } = {
      machine_name: override.machine_name || "",
      machine_class: override.machine_class || "",
    };

    // Only include machine_id if it's a valid UUID
    // If machine_id is not a valid UUID, backend will use machine_name instead
    if (override.machine_id && isValidUUID(override.machine_id)) {
      payload.machine_id = override.machine_id;
    }

    // Add threshold values only if they are defined
    if (override.temperature_warning !== undefined) {
      payload.temperature_warning = override.temperature_warning;
    }
    if (override.temperature_critical !== undefined) {
      payload.temperature_critical = override.temperature_critical;
    }
    if (override.vibration_warning !== undefined) {
      payload.vibration_warning = override.vibration_warning;
    }
    if (override.vibration_critical !== undefined) {
      payload.vibration_critical = override.vibration_critical;
    }

    const response = await axiosInstance.post<{
      override: MachineThresholdOverride;
    }>("/settings/thresholds/machine-overrides", payload);
    // Update localStorage
    const currentSettings = getThresholdSettingsFromLocalStorage();
    saveThresholdSettingsToLocalStorage({
      ...currentSettings,
      machine_overrides: [
        ...currentSettings.machine_overrides,
        response.data.override,
      ],
    });
    return response.data.override;
  } catch {
    // Fallback to localStorage if API fails
    const newOverride: MachineThresholdOverride = {
      ...override,
      id: `override-${Date.now()}`,
    };
    const currentSettings = getThresholdSettingsFromLocalStorage();
    saveThresholdSettingsToLocalStorage({
      ...currentSettings,
      machine_overrides: [...currentSettings.machine_overrides, newOverride],
    });
    return newOverride;
  }
}

// Update machine threshold override
export async function updateMachineThresholdOverride(
  overrideId: string,
  override: Partial<MachineThresholdOverride>
): Promise<MachineThresholdOverride> {
  try {
    const axiosInstance = getAxiosInstance();

    // Prepare the payload - only include machine_id if it's a valid UUID
    const payload: Partial<MachineThresholdOverride> = { ...override };

    // Only include machine_id if it's a valid UUID
    if (payload.machine_id && !isValidUUID(payload.machine_id)) {
      delete payload.machine_id;
    }

    const response = await axiosInstance.put<{
      override: MachineThresholdOverride;
    }>(`/settings/thresholds/machine-overrides/${overrideId}`, payload);
    // Update localStorage
    const currentSettings = getThresholdSettingsFromLocalStorage();
    saveThresholdSettingsToLocalStorage({
      ...currentSettings,
      machine_overrides: currentSettings.machine_overrides.map((o) =>
        o.id === overrideId ? response.data.override : o
      ),
    });
    return response.data.override;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getThresholdSettingsFromLocalStorage();
    const updatedOverrides = currentSettings.machine_overrides.map((o) =>
      o.id === overrideId ? { ...o, ...override } : o
    );
    saveThresholdSettingsToLocalStorage({
      ...currentSettings,
      machine_overrides: updatedOverrides,
    });
    return updatedOverrides.find((o) => o.id === overrideId)!;
  }
}

// Delete machine threshold override
export async function deleteMachineThresholdOverride(
  overrideId: string
): Promise<void> {
  try {
    const axiosInstance = getAxiosInstance();
    await axiosInstance.delete(
      `/settings/thresholds/machine-overrides/${overrideId}`
    );
    // Update localStorage
    const currentSettings = getThresholdSettingsFromLocalStorage();
    saveThresholdSettingsToLocalStorage({
      ...currentSettings,
      machine_overrides: currentSettings.machine_overrides.filter(
        (o) => o.id !== overrideId
      ),
    });
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getThresholdSettingsFromLocalStorage();
    saveThresholdSettingsToLocalStorage({
      ...currentSettings,
      machine_overrides: currentSettings.machine_overrides.filter(
        (o) => o.id !== overrideId
      ),
    });
  }
}

// Update all threshold settings
export async function updateThresholdSettings(
  settings: Partial<ThresholdSettings>
): Promise<ThresholdSettings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<ThresholdSettingsResponse>(
      "/settings/thresholds",
      settings
    );
    // Save to localStorage as backup
    saveThresholdSettingsToLocalStorage(response.data.settings);
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getThresholdSettingsFromLocalStorage();
    const updatedSettings = {
      temperature: {
        ...currentSettings.temperature,
        ...settings.temperature,
      },
      vibration: {
        ...currentSettings.vibration,
        ...settings.vibration,
      },
      machine_overrides:
        settings.machine_overrides || currentSettings.machine_overrides,
    };
    saveThresholdSettingsToLocalStorage(updatedSettings);
    return updatedSettings;
  }
}

// LocalStorage helpers (fallback)
const THRESHOLD_SETTINGS_STORAGE_KEY = "app_threshold_settings";

const defaultThresholdSettings: ThresholdSettings = {
  temperature: {
    warning: 30,
    critical: 35,
  },
  vibration: {
    warning: 0.8,
    critical: 1.2,
    x_axis_warning: 0.8,
    y_axis_warning: 0.8,
    z_axis_warning: 0.8,
  },
  machine_overrides: [],
};

export function getThresholdSettingsFromLocalStorage(): ThresholdSettings {
  if (typeof window === "undefined") {
    return defaultThresholdSettings;
  }

  try {
    const stored = localStorage.getItem(THRESHOLD_SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure machine_overrides is always an array and filter out any null/undefined values
      return {
        ...parsed,
        machine_overrides: Array.isArray(parsed.machine_overrides)
          ? parsed.machine_overrides.filter(
              (
                override: MachineThresholdOverride | null | undefined
              ): override is MachineThresholdOverride => override != null
            )
          : [],
      };
    }
  } catch (error) {
    console.error("Error reading threshold settings from localStorage:", error);
  }

  return defaultThresholdSettings;
}

export function saveThresholdSettingsToLocalStorage(
  settings: ThresholdSettings
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      THRESHOLD_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error("Error saving threshold settings to localStorage:", error);
  }
}
