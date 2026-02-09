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

// Global inflight promise for deduplication
let profilePromise: Promise<UserProfileResponse> | null = null;

// Get user profile
export async function getUserProfile(): Promise<UserProfileResponse> {
  if (profilePromise) return profilePromise;

  profilePromise = (async () => {
    try {
      const axiosInstance = getAxiosInstance();
      const response =
        await axiosInstance.get<UserProfileResponse>("/users/profile");
      return response.data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    } finally {
      // Clear after small delay to catch simultaneous bursts
      setTimeout(() => {
        profilePromise = null;
      }, 500);
    }
  })();

  return profilePromise;
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

  const url = `${API_BASE_URL}/users/avatar/base64`;

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

// Global inflight promise for deduplication
let allUsersPromise: Promise<import("@/lib/types").UserAdminResponse[]> | null =
  null;

// Get all users (Admin only)
export async function getAllUsers(): Promise<
  Array<import("@/lib/types").UserAdminResponse>
> {
  if (allUsersPromise) return allUsersPromise;

  allUsersPromise = (async () => {
    try {
      const axiosInstance = getAxiosInstance();
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
        return {
          ...user,
          status: (user.status as string) || "PENDING",
          last_login: user.last_login,
        } as import("@/lib/types").UserAdminResponse;
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    } finally {
      setTimeout(() => {
        allUsersPromise = null;
      }, 500);
    }
  })();

  return allUsersPromise;
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

// Approve user (Admin only)
export async function approveUser(
  userId: string
): Promise<{ message: string }> {
  try {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.put<{ message: string }>(
      `/admin/users/${userId}/approve`
    );
    return response.data;
  } catch (error) {
    console.error(`Error approving user ${userId}:`, error);
    throw error;
  }
}
