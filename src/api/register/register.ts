import axios from "axios";

const API_BASE_URL = "/api";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  org_code: string;
}

export interface RegisterResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    organization_id: string;
    org_code: string;
    role: string;
    created_at: string;
  };
}

export async function register(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, payload);
  return response.data;
}
