import axios from "axios";

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
