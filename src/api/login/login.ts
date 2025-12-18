import axios from "axios";

const API_BASE_URL = "/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    organization_id: string;
    org_code: string;
    role: string;
    created_at: string;
    updated_at?: string;
  };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, payload);
  return response.data;
}
