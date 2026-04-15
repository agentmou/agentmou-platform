import { z, type ZodTypeAny } from 'zod';
import { getApiUrl } from '@/lib/runtime/public-origins';

const API_URL = getApiUrl().replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiContractError extends Error {
  constructor(
    public path: string,
    public issues: string[]
  ) {
    super(formatContractError(path, issues));
    this.name = 'ApiContractError';
  }
}

async function parseErrorBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  try {
    const text = await response.text();
    return text || undefined;
  } catch {
    return undefined;
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await parseErrorBody(response);
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `API ${response.status}: ${response.statusText}`;

    throw new ApiError(response.status, message, body);
  }

  return response.json();
}

export async function requestParsed<TSchema extends ZodTypeAny>(
  path: string,
  schema: TSchema,
  options?: RequestInit
): Promise<z.infer<TSchema>> {
  const data = await request<unknown>(path, options);
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`
  );

  throw new ApiContractError(path, issues);
}

export function isApiNotFound(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404;
}

export function buildQueryString(
  query: Record<string, string | number | boolean | null | undefined>
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const result = params.toString();
  return result ? `?${result}` : '';
}

function formatContractError(path: string, issues: string[]): string {
  if (process.env.NODE_ENV === 'development') {
    return `API contract mismatch for ${path}: ${issues.join('; ')}`;
  }

  return `API contract mismatch for ${path}`;
}
