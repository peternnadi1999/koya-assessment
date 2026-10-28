import { NextRequest } from "next/server";
import {
  createBooking,
  listBookings,
} from "@/features/bookings/services/booking.service";
import { Errors, handleRoute } from "@/lib/errors";
import { requireApiKey } from "@/server/auth/api-key";

export const dynamic = "force-dynamic";

// POST /bookings — book a slot (levels 1–5). Optional Idempotency-Key header.
export const POST = handleRoute(async (request: NextRequest) => {
  requireApiKey(request);
  const body = await request.json().catch(() => {
    throw Errors.badRequest("request body must be valid JSON");
  });
  const booking = await createBooking(body, request.headers.get("idempotency-key"));
  return Response.json(booking, { status: 201 });
});

// GET /bookings?email=…&limit=…&cursor=… — a person's bookings, oldest first (level 4).
export const GET = handleRoute(async (request: NextRequest) => {
  requireApiKey(request);
  const q = request.nextUrl.searchParams;
  return Response.json(
    await listBookings({ email: q.get("email"), limit: q.get("limit"), cursor: q.get("cursor") }),
  );
});
