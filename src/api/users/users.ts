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
import { toBase64 } from "@/lib/utils";

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
  const base64Image = await toBase64(file);
  const contentType = file.type || "image/jpeg";
  const token = getToken();

  const url = `${API_BASE_URL}/users/avatar`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        image_base64: base64Image,
        content_type: contentType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Avatar upload failed:", response.status, errorText);
      throw new Error(
        `Upload failed with status ${response.status}: ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw error;
  }
}

// Get all users (Admin only)
// Get all users (Admin only)
export async function getAllUsers(): Promise<
  Array<import("@/lib/types").UserAdminResponse>
> {
  try {
    const axiosInstance = getAxiosInstance();
    // Backend doesn't return status/last_login yet, so we fetch as any[] and map
    const response =
      await axiosInstance.get<Array<Record<string, unknown>>>("/users");

    if (response.data.length > 0) {
      console.log("Sample user data (First User):", {
        id: response.data[0].id,
        status: response.data[0].status,
        role: response.data[0].role,
      });
    }

    return response.data.map((user) => {
      // Normalize status mapping based on user requirements
      // Backend status is still missing, defaulting to "Online" to show Green as requested
      let displayStatus = (user.status as string) || "Online";
      const s = displayStatus.toLowerCase();

      if (s === "active") displayStatus = "ONLINE";
      else if (s === "disabled") displayStatus = "OFFLINE";
      else if (s === "pending") displayStatus = "PENDING";
      else if (s === "suspended") displayStatus = "SUSPENDED";
      else displayStatus = "OFFLINE"; // Fallback

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

// Update user status (Admin only)
export async function updateUserStatus(
  userId: string,
  status: string
): Promise<{ message: string }> {
  try {
    const axiosInstance = getAxiosInstance();
    // Convert display status to backend status if needed
    let backendStatus = status.toLowerCase();
    if (backendStatus === "online") backendStatus = "active";
    if (backendStatus === "offline") backendStatus = "disabled";

    const response = await axiosInstance.put<{ message: string }>(
      `/users/${userId}/status`,
      { status: backendStatus }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating status for user ${userId}:`, error);
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
