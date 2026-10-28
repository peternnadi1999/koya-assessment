import type { NextRequest } from "next/server";

/** An error that maps directly to an HTTP response: `{ "error": "<message>" }`. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  unauthorized: () => new AppError(401, "missing or invalid API key"),
  badRequest: (message: string) => new AppError(400, message),
  notFound: (message: string) => new AppError(404, message),
  conflict: (message: string) => new AppError(409, message),
  unprocessable: (message: string) => new AppError(422, message),
  tooManyRequests: (retryAfterSeconds: number) =>
    new AppError(429, "too many booking attempts for this email, try again later", {
      "Retry-After": String(retryAfterSeconds),
    }),
};

export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json({ error: err.message }, { status: err.status, headers: err.headers });
  }
  console.error("Unhandled error:", err);
  return Response.json({ error: "internal server error" }, { status: 500 });
}

/** Wraps a route handler so thrown AppErrors become `{ error }` JSON responses. */
export function handleRoute<Ctx = unknown>(
  handler: (request: NextRequest, ctx: Ctx) => Promise<Response>,
) {
  return async (request: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
