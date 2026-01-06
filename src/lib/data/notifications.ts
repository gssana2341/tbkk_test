import { getToken } from "@/lib/auth";
import { NotificationLogsResponse } from "@/lib/types";

export interface GetNotificationLogsParams {
  page?: number;
  limit?: number;
}

export async function getNotificationLogs(
  params: GetNotificationLogsParams = {}
): Promise<NotificationLogsResponse> {
  const token = getToken();
  const { page = 1, limit = 20 } = params;

  try {
    const url = new URL(`${window.location.origin}/api/notification-logs`);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("limit", limit.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch notification logs: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching notification logs:", error);
    return {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 1,
    };
  }
}
