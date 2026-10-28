import { NextRequest } from "next/server";
import {
  cancelBooking,
  getBooking,
} from "@/features/bookings/services/booking.service";
import { handleRoute } from "@/lib/errors";
import { requireApiKey } from "@/server/auth/api-key";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /bookings/:id — look up one booking.
export const GET = handleRoute(async (request: NextRequest, { params }: Ctx) => {
  requireApiKey(request);
  const { id } = await params;
  return Response.json(await getBooking(id));
});

// DELETE /bookings/:id — cancel it and free the slot (level 3).
export const DELETE = handleRoute(async (request: NextRequest, { params }: Ctx) => {
  requireApiKey(request);
  const { id } = await params;
  return Response.json(await cancelBooking(id));
});
