import { NextRequest } from "next/server";
import { listSlots } from "@/features/bookings/services/booking.service";
import { handleRoute } from "@/lib/errors";
import { requireApiKey } from "@/server/auth/api-key";

export const dynamic = "force-dynamic";

// GET /slots[?provider=Dr%20Ade] — every slot, earliest start first.
export const GET = handleRoute(async (request: NextRequest) => {
  requireApiKey(request);
  const provider = request.nextUrl.searchParams.get("provider");
  return Response.json(await listSlots(provider));
});
