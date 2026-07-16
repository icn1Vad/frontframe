import type { QueryParameters } from "./types";

export function buildQueryString(query?: QueryParameters): string {
  if (!query) return "";
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) parameters.append(key, String(item));
      continue;
    }
    parameters.set(key, String(value));
  }
  const serialized = parameters.toString();
  return serialized ? `?${serialized}` : "";
}
