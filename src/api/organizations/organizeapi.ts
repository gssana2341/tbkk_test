import axios from "axios";
import { getToken } from "@/lib/auth";

export interface OrganizationPayload {
  name: string;
  description: string;
  org_code?: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  description: string;
  org_code: string;
  created_at: string;
  updated_at: string;
}

export async function createOrganization(
  payload: OrganizationPayload
): Promise<OrganizationResponse> {
  const baseUrl = "/api";
  const response = await axios.post(`${baseUrl}/organizations`, payload);
  return response.data;
}

// Global inflight promise for deduplication
let organizationsPromise: Promise<OrganizationResponse[]> | null = null;

// Fetch all organizations
export async function getOrganizations(): Promise<OrganizationResponse[]> {
  if (organizationsPromise) return organizationsPromise;

  organizationsPromise = (async () => {
    try {
      const baseUrl = "/api";
      const token = getToken();
      const response = await axios.get(`${baseUrl}/organizations`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching organizations:", error);
      throw error;
    } finally {
      setTimeout(() => { organizationsPromise = null; }, 500);
    }
  })();

  return organizationsPromise;
}

// Get organization by org_code
export async function getOrganizationByOrgCode(
  orgCode: string
): Promise<OrganizationResponse | null> {
  try {
    const organizations = await getOrganizations();
    return organizations.find((org) => org.org_code === orgCode) || null;
  } catch (error) {
    console.error("Error fetching organization:", error);
    return null;
  }
}
