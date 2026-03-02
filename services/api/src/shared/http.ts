import { HttpResponseInit } from "@azure/functions";

export function json(status: number, body: unknown): HttpResponseInit {
  return {
    status,
    jsonBody: body
  };
}

export function errorResponse(error: unknown, defaultStatus = 400): HttpResponseInit {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = message.startsWith("Unauthorized") ? 401 : defaultStatus;
  return json(status, { error: message });
}
