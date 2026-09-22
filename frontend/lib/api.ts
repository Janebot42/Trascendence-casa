export type ApiErrorData = { error?: string; message?: string };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly data: ApiErrorData = {}) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api${path}`, { ...init, headers, credentials: 'include' });
  const text = await response.text();
  let data: T | ApiErrorData = {};
  if (text) {
    try { data = JSON.parse(text) as T | ApiErrorData; }
    catch { data = { message: text }; }
  }
  if (!response.ok) {
    const errorData = data as ApiErrorData;
    throw new ApiError(errorData.message ?? 'La petición ha fallado', response.status, errorData);
  }
  return data as T;
}
