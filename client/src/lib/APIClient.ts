type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const IS_DEV = import.meta.env.VITE_ENV === "development";

export interface APIClientDeps {
  baseUrl: string;
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  getAuthHeaders: () => HeadersInit;
  getJsonHeaders: () => HeadersInit;
  extractApiErrorMessage: (data: unknown, fallbackMessage: string) => string;
  onUnauthorized?: (res: Response) => Promise<void> | void;
}

export interface APIClientOptions {
  auth?: boolean;
  fallbackError?: string;
}

export class APIClient {
  constructor(
    private readonly endpoint: string,
    private readonly options: APIClientOptions = {},
    private readonly deps: APIClientDeps
  ) {}

  private async requestInternal<T>(method: HttpMethod, body?: unknown): Promise<T> {
    const res = await this.deps.request(`${this.deps.baseUrl}${this.endpoint}`, {
      method,
      headers: this.options.auth === false ? this.deps.getJsonHeaders() : this.deps.getAuthHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (this.deps.onUnauthorized) {
        await this.deps.onUnauthorized(res);
      }
      const err = new Error(
        this.deps.extractApiErrorMessage(
          data,
          this.options.fallbackError || "Request failed"
        )
      ) as Error & { validationErrors?: Record<string, string[]> };

      if (data?.errors && typeof data.errors === "object") {
        err.validationErrors = data.errors as Record<string, string[]>;
      }
      throw err;
    }

    return data as T;
  }

  get<T>(): Promise<T> {
    return this.requestInternal<T>("GET");
  }

  post<T>(body?: unknown): Promise<T> {
    return this.requestInternal<T>("POST", body);
  }

  put<T>(body?: unknown): Promise<T> {
    return this.requestInternal<T>("PUT", body);
  }

  delete<T>(): Promise<T> {
    return this.requestInternal<T>("DELETE");
  }
}
