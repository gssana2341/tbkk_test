import { getToken } from "@/lib/auth";
import { NotificationLogsResponse } from "@/lib/types";

export interface GetNotificationLogsParams {
  page?: number;
  limit?: number;
}

// Global inflight promise for deduplication
const notificationLogsInflight = new Map<
  string,
  Promise<NotificationLogsResponse>
>();

export async function getNotificationLogs(
  params: GetNotificationLogsParams = {}
): Promise<NotificationLogsResponse> {
  const token = getToken();
  const { page = 1, limit = 20 } = params;
  const baseUrl = `${window.location.origin}/api/notification-logs`;
  const urlParams = new URLSearchParams();
  urlParams.append("page", page.toString());
  urlParams.append("limit", limit.toString());
  const cacheKey = `${baseUrl}?${urlParams.toString()}`;

  if (notificationLogsInflight.has(cacheKey)) {
    return notificationLogsInflight.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(cacheKey, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch notification logs: ${response.status}`
        );
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
    } finally {
      setTimeout(() => {
        notificationLogsInflight.delete(cacheKey);
      }, 500);
    }
  })();

  notificationLogsInflight.set(cacheKey, fetchPromise);
  return fetchPromise;
}
