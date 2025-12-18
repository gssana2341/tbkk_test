import axios from "axios";
import type {
  UserProfileResponse,
  UserProfileUpdateRequest,
  PasswordChangeRequest,
  SecuritySettingsUpdateRequest,
  TwoFactorEnableResponse,
  TwoFactorDisableRequest,
  UserSecuritySettings,
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
      "ngrok-skip-browser-warning": "true",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
};

// Get user profile
export async function getUserProfile(): Promise<UserProfileResponse> {
  try {
    const axiosInstance = getAxiosInstance();
    const response =
      await axiosInstance.get<UserProfileResponse>("/users/profile");
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(
  profile: UserProfileUpdateRequest
): Promise<UserProfileResponse> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<UserProfileResponse>(
      "/users/profile",
      profile
    );
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

// Change password
export async function changePassword(
  passwordData: PasswordChangeRequest
): Promise<{ message: string }> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{ message: string }>(
      "/users/password",
      passwordData
    );
    return response.data;
  } catch (error) {
    console.error("Error changing password:", error);
    throw error;
  }
}

// Update security settings
export async function updateSecuritySettings(
  settings: SecuritySettingsUpdateRequest
): Promise<{ settings: UserSecuritySettings; message?: string }> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{
      settings: UserSecuritySettings;
      message?: string;
    }>("/users/security", settings);
    return response.data;
  } catch (error) {
    console.error("Error updating security settings:", error);
    throw error;
  }
}

// Enable two-factor authentication
export async function enableTwoFactor(): Promise<TwoFactorEnableResponse> {
  try {
    const axiosInstance = getAxiosInstance();
    const response =
      await axiosInstance.post<TwoFactorEnableResponse>("/users/2fa/enable");
    return response.data;
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    throw error;
  }
}

// Disable two-factor authentication
export async function disableTwoFactor(
  request: TwoFactorDisableRequest
): Promise<{ message: string }> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.post<{ message: string }>(
      "/users/2fa/disable",
      request
    );
    return response.data;
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    throw error;
  }
}

// Upload avatar
export async function uploadAvatar(
  file: File
): Promise<{ avatar_url: string; message?: string }> {
  try {
    const axiosInstance = getAxiosInstance();
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await axiosInstance.post<{
      avatar_url: string;
      message?: string;
    }>("/users/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw error;
  }
}

// Get all users (Admin only)
// Get all users (Admin only)
export async function getAllUsers(): Promise<Array<import("@/lib/types").UserAdminResponse>> {
  try {
    const axiosInstance = getAxiosInstance();
    // Backend doesn't return status/last_login yet, so we fetch as any[] and map
    const response = await axiosInstance.get<any[]>("/users");

    if (response.data.length > 0) {
      console.log("Sample user data (First User):", {
        id: response.data[0].id,
        status: response.data[0].status,
        role: response.data[0].role
      });
    }

    return response.data.map((user) => {
      // Normalize status mapping based on user requirements
      // Backend status is still missing, defaulting to "Online" to show Green as requested
      let displayStatus = user.status || "Online";
      const s = displayStatus.toLowerCase();

      if (s === "active") displayStatus = "Online";
      else if (s === "disabled") displayStatus = "Offline";
      else if (s === "pending") displayStatus = "Pending";
      else if (s === "suspended") displayStatus = "Suspended";
      else displayStatus = "Offline"; // Fallback

      return {
        ...user,
        status: displayStatus,
        last_login: user.last_login,
      } as import("@/lib/types").UserAdminResponse;
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

// Update user role (Admin only)
export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ message: string }> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{ message: string }>(
      `/users/${userId}/role`,
      { role }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating role for user ${userId}:`, error);
    throw error;
  }
}

// Delete user (Admin only, same org check handled by backend)
export async function deleteUser(userId: string): Promise<{ message: string }> {
  try {
    const axiosInstance = getAxiosInstance();
    console.log("Attempting to delete user with ID:", userId);
    const response = await axiosInstance.delete<{ message: string }>(
      `/users/${userId}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
}
