import { HttpRequest } from "@azure/functions";

export async function readJson<T>(request: HttpRequest): Promise<T> {
  return (await request.json()) as T;
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

