import { appFetch } from "@/data/appFetch";
// REST API utility functions for use with React Query

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await appFetch(url, {
    ...fetchOptions,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
    }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * GET request
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  return fetchApi<T>(endpoint, { method: "GET", params });
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string): Promise<T> {
  return fetchApi<T>(endpoint, { method: "DELETE" });
}
