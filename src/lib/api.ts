const rawBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://ai-worker-backend-ztos.onrender.com/api/v2";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}
