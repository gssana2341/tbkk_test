import axios from "axios";
import type {
  SystemSettings,
  DisplaySettings,
  Settings,
  SettingsResponse,
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

// Get all settings
export async function getSettings(): Promise<Settings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.get<SettingsResponse>("/settings");
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    return getSettingsFromLocalStorage();
  }
}

// Update system settings
export async function updateSystemSettings(
  settings: Partial<SystemSettings>
): Promise<SystemSettings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{ settings: SystemSettings }>(
      "/settings/system",
      settings
    );
    // Save to localStorage as backup
    saveSystemSettingsToLocalStorage(response.data.settings);
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getSettingsFromLocalStorage();
    const updatedSettings = {
      ...currentSettings.system,
      ...settings,
    };
    saveSystemSettingsToLocalStorage(updatedSettings);
    return updatedSettings;
  }
}

// Update display settings
export async function updateDisplaySettings(
  settings: Partial<DisplaySettings>
): Promise<DisplaySettings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{ settings: DisplaySettings }>(
      "/settings/display",
      settings
    );
    // Save to localStorage as backup
    saveDisplaySettingsToLocalStorage(response.data.settings);
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getSettingsFromLocalStorage();
    const updatedSettings = {
      ...currentSettings.display,
      ...settings,
    };
    saveDisplaySettingsToLocalStorage(updatedSettings);
    return updatedSettings;
  }
}

// Update all settings
export async function updateSettings(
  settings: Partial<Settings>
): Promise<Settings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<SettingsResponse>(
      "/settings",
      settings
    );
    // Save to localStorage as backup
    saveSettingsToLocalStorage(response.data.settings);
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getSettingsFromLocalStorage();
    const updatedSettings = {
      system: {
        ...currentSettings.system,
        ...settings.system,
      },
      display: {
        ...currentSettings.display,
        ...settings.display,
      },
    };
    saveSettingsToLocalStorage(updatedSettings);
    return updatedSettings;
  }
}

// LocalStorage helpers (fallback)
const SETTINGS_STORAGE_KEY = "app_settings";

const defaultSettings: Settings = {
  system: {
    system_name: "TBKK-Surazense",
    timezone: "UTC",
    date_format: "MM/DD/YYYY",
    temperature_unit: "celsius",
  },
  display: {
    auto_refresh: true,
    refresh_interval: 30,
    show_grid_lines: true,
    show_tooltips: true,
  },
};

export function getSettingsFromLocalStorage(): Settings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading settings from localStorage:", error);
  }

  return defaultSettings;
}

export function saveSettingsToLocalStorage(settings: Settings): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings to localStorage:", error);
  }
}

export function saveSystemSettingsToLocalStorage(
  settings: SystemSettings
): void {
  const currentSettings = getSettingsFromLocalStorage();
  saveSettingsToLocalStorage({
    ...currentSettings,
    system: settings,
  });
}

export function saveDisplaySettingsToLocalStorage(
  settings: DisplaySettings
): void {
  const currentSettings = getSettingsFromLocalStorage();
  saveSettingsToLocalStorage({
    ...currentSettings,
    display: settings,
  });
}
