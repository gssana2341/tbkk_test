import axios from "axios";
import type {
  SystemInfo,
  SystemInfoResponse,
  SystemResources,
  SystemResourcesResponse,
  SystemDataManagementSettings,
  SystemDataManagementResponse,
  BackupRunRequest,
  BackupRunResponse,
  BackupHistoryResponse,
  BackupSummaryResponse,
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

// Get system information
export async function getSystemInfo(): Promise<SystemInfo> {
  try {
    const axiosInstance = getAxiosInstance();
    const response =
      await axiosInstance.get<SystemInfoResponse>("/system/info");
    return response.data.system;
  } catch (error) {
    console.error("Error fetching system info:", error);
    // Return default values if API fails
    return {
      system_name: "VIBRATION-SZ",
      system_version: "v1.0.0",
      database_status: "unknown",
      api_status: "unknown",
    };
  }
}

// Update system information
export async function updateSystemInfo(
  info: Partial<SystemInfo>
): Promise<SystemInfoResponse> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<SystemInfoResponse>(
      "/system/info",
      info
    );
    return response.data;
  } catch (error) {
    console.error("Error updating system info:", error);
    throw error;
  }
}

// Get system resources
export async function getSystemResources(): Promise<SystemResources> {
  try {
    const axiosInstance = getAxiosInstance();
    const response =
      await axiosInstance.get<SystemResourcesResponse>("/system/resources");
    return response.data.resources;
  } catch (error) {
    console.error("Error fetching system resources:", error);
    // Return default values if API fails
    return {
      cpu_usage: 0,
      memory_usage: 0,
      disk_usage: 0,
    };
  }
}

// Record system resources
export async function recordSystemResources(
  resources: Partial<SystemResources>
): Promise<{ id: string; message?: string }> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.post<{ id: string; message?: string }>(
      "/system/resources",
      resources
    );
    return response.data;
  } catch (error) {
    console.error("Error recording system resources:", error);
    throw error;
  }
}

// Get data management settings
export async function getDataManagementSettings(): Promise<SystemDataManagementSettings> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.get<SystemDataManagementResponse>(
      "/system/data-management"
    );
    return response.data.settings;
  } catch (error) {
    console.error("Error fetching data management settings:", error);
    // Return default values if API fails
    return {
      sensor_data_retention_days: 90,
      alert_history_retention_days: 180,
      automated_backups_enabled: true,
      backup_frequency: "daily",
      backup_retention_count: 7,
    };
  }
}

// Update data management settings
export async function updateDataManagementSettings(
  settings: Partial<SystemDataManagementSettings>
): Promise<SystemDataManagementResponse> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<SystemDataManagementResponse>(
      "/system/data-management",
      settings
    );
    return response.data;
  } catch (error) {
    console.error("Error updating data management settings:", error);
    throw error;
  }
}

// Run backup now
export async function runBackupNow(
  request: BackupRunRequest = { backup_type: "full" }
): Promise<BackupRunResponse> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.post<BackupRunResponse>(
      "/system/backup/run",
      request
    );
    return response.data;
  } catch (error) {
    console.error("Error running backup:", error);
    throw error;
  }
}

// Get backup history
export async function getBackupHistory(
  organizationId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<BackupHistoryResponse> {
  try {
    const axiosInstance = getAxiosInstance();
    const params: { limit: number; offset: number; organization_id?: string } =
      { limit, offset };
    if (organizationId) {
      params.organization_id = organizationId;
    }
    const response = await axiosInstance.get<BackupHistoryResponse>(
      "/system/backup/history",
      {
        params,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching backup history:", error);
    throw error;
  }
}

// Get backup summary
export async function getBackupSummary(
  organizationId?: string
): Promise<BackupSummaryResponse> {
  try {
    const axiosInstance = getAxiosInstance();
    const params = organizationId ? { organization_id: organizationId } : {};
    const response = await axiosInstance.get<BackupSummaryResponse>(
      "/system/backup/summary",
      {
        params,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching backup summary:", error);
    throw error;
  }
}
