import { NextRequest } from "next/server";
import { resetSlots } from "@/features/bookings/services/booking.service";
import { Errors, handleRoute } from "@/lib/errors";
import { requireApiKey } from "@/server/auth/api-key";

export const dynamic = "force-dynamic";

// POST /reset — delete every booking and replace all slots with the ones sent.
export const POST = handleRoute(async (request: NextRequest) => {
  requireApiKey(request);
  const body = await request.json().catch(() => {
    throw Errors.badRequest("request body must be valid JSON");
  });
  await resetSlots(body);
  return Response.json({ ok: true }, { status: 200 });
});
