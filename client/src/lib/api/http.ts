import { API_URL } from '../../config';

/**
 * Error thrown for any non-2xx API response. `message` carries the
 * server-provided error text (the `error` or `message` field of the JSON
 * error body) when one is present.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

/**
 * Thin fetch wrapper around the Seatbook API.
 *
 * - Prefixes `API_URL` and sends/parses JSON.
 * - Attaches the bearer token from localStorage when `auth` is set.
 * - Throws `ApiError` on non-2xx responses, using the `error` / `message`
 *   field of the server's JSON error payload as the message.
 *   (All server routes respond to errors with a JSON body.)
 */
export async function request<T>(
  path: string,
  { method = 'GET', body, auth = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // The server always replies to errors with a JSON body; the `.catch` only
    // guards against non-JSON from outside the app (e.g. a proxy error page).
    const data = (await res.json().catch(() => null)) as
      | { error?: unknown; message?: unknown }
      | null;
    const message =
      data && typeof data.error === 'string'
        ? data.error
        : data && typeof data.message === 'string'
          ? data.message
          : undefined;
    throw new ApiError(res.status, message ?? `Request failed (HTTP ${res.status})`);
  }

  return res.json() as Promise<T>;
}

/** Human-readable message for an error thrown by the API layer. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
