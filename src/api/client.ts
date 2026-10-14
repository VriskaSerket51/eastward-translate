const HOST = (process.env.NEXT_PUBLIC_API_HOST ?? "").replace(/\/$/, "");

export function apiUrl(
  path: string,
  parameters: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters))
    if (value !== undefined) query.set(key, value);
  return HOST + path + (query.size ? "?" + query.toString() : "");
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
  parameters: Record<string, string | undefined> = {},
): Promise<T> {
  const response = await fetch(apiUrl(path, parameters), options);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `HTTP ${response.status}: ${detail.slice(0, 300) || response.statusText}`,
    );
  }
  return response.json() as Promise<T>;
}
