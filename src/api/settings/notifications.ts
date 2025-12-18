import axios from "axios";
import type {
  EmailNotificationSettings,
  SmsNotificationSettings,
  WebhookNotificationSettings,
  NotificationSettings,
  NotificationSettingsResponse,
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

// Get all notification settings
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.get<NotificationSettingsResponse>(
      "/settings/notifications"
    );
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    return getNotificationSettingsFromLocalStorage();
  }
}

// Update email notification settings
export async function updateEmailNotificationSettings(
  settings: Partial<EmailNotificationSettings>
): Promise<EmailNotificationSettings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{
      settings: EmailNotificationSettings;
    }>("/settings/notifications/email", settings);
    // Save to localStorage as backup
    saveEmailNotificationSettingsToLocalStorage(response.data.settings);
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getNotificationSettingsFromLocalStorage();
    const updatedSettings = {
      ...currentSettings.email,
      ...settings,
    };
    saveEmailNotificationSettingsToLocalStorage(updatedSettings);
    return updatedSettings;
  }
}

// Update SMS notification settings
export async function updateSmsNotificationSettings(
  settings: Partial<SmsNotificationSettings>
): Promise<SmsNotificationSettings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{
      settings: SmsNotificationSettings;
    }>("/settings/notifications/sms", settings);
    // Save to localStorage as backup
    saveSmsNotificationSettingsToLocalStorage(response.data.settings);
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getNotificationSettingsFromLocalStorage();
    const updatedSettings = {
      ...currentSettings.sms,
      ...settings,
    };
    saveSmsNotificationSettingsToLocalStorage(updatedSettings);
    return updatedSettings;
  }
}

// Update webhook notification settings
export async function updateWebhookNotificationSettings(
  settings: Partial<WebhookNotificationSettings>
): Promise<WebhookNotificationSettings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{
      settings: WebhookNotificationSettings;
    }>("/settings/notifications/webhook", settings);
    // Save to localStorage as backup
    saveWebhookNotificationSettingsToLocalStorage(response.data.settings);
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getNotificationSettingsFromLocalStorage();
    const updatedSettings = {
      ...currentSettings.webhook,
      ...settings,
    };
    saveWebhookNotificationSettingsToLocalStorage(updatedSettings);
    return updatedSettings;
  }
}

// Update all notification settings
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<NotificationSettingsResponse>(
      "/settings/notifications",
      settings
    );
    // Save to localStorage as backup
    saveNotificationSettingsToLocalStorage(response.data.settings);
    return response.data.settings;
  } catch {
    // Fallback to localStorage if API fails
    const currentSettings = getNotificationSettingsFromLocalStorage();
    const updatedSettings = {
      email: {
        ...currentSettings.email,
        ...settings.email,
      },
      sms: {
        ...currentSettings.sms,
        ...settings.sms,
      },
      webhook: {
        ...currentSettings.webhook,
        ...settings.webhook,
      },
    };
    saveNotificationSettingsToLocalStorage(updatedSettings);
    return updatedSettings;
  }
}

// LocalStorage helpers (fallback)
const NOTIFICATION_SETTINGS_STORAGE_KEY = "app_notification_settings";

const defaultNotificationSettings: NotificationSettings = {
  email: {
    enabled: true,
    recipients: "",
    sender_email: "notifications@example.com",
    critical_alerts: true,
    warning_alerts: true,
    info_alerts: false,
    daily_reports: true,
  },
  sms: {
    enabled: false,
    phone_numbers: "",
    provider: "twilio",
    critical_alerts: true,
    warning_alerts: false,
  },
  webhook: {
    enabled: false,
    webhook_url: "",
    webhook_secret: "",
    payload_format: "json",
    custom_template: "",
  },
};

export function getNotificationSettingsFromLocalStorage(): NotificationSettings {
  if (typeof window === "undefined") {
    return defaultNotificationSettings;
  }

  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(
      "Error reading notification settings from localStorage:",
      error
    );
  }

  return defaultNotificationSettings;
}

export function saveNotificationSettingsToLocalStorage(
  settings: NotificationSettings
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      NOTIFICATION_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error("Error saving notification settings to localStorage:", error);
  }
}

export function saveEmailNotificationSettingsToLocalStorage(
  settings: EmailNotificationSettings
): void {
  const currentSettings = getNotificationSettingsFromLocalStorage();
  saveNotificationSettingsToLocalStorage({
    ...currentSettings,
    email: settings,
  });
}

export function saveSmsNotificationSettingsToLocalStorage(
  settings: SmsNotificationSettings
): void {
  const currentSettings = getNotificationSettingsFromLocalStorage();
  saveNotificationSettingsToLocalStorage({
    ...currentSettings,
    sms: settings,
  });
}

export function saveWebhookNotificationSettingsToLocalStorage(
  settings: WebhookNotificationSettings
): void {
  const currentSettings = getNotificationSettingsFromLocalStorage();
  saveNotificationSettingsToLocalStorage({
    ...currentSettings,
    webhook: settings,
  });
}
