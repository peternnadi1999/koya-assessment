"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { createBooking } from "../services/booking.service";

export interface BookingFormState {
  error?: string;
}

// Used by the web form. It calls the same service as POST /bookings, on the
// server, so validation, the 409 race guard and the per-email limit all apply
// and the API key never has to reach the browser.
export async function bookSlotAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const body = {
    slot_id: formData.get("slot_id"),
    name: formData.get("name"),
    email: formData.get("email"),
  };

  let bookingId: string;
  try {
    // A fresh idempotency key per submit: double-clicks of the same submit can't double-book.
    bookingId = (await createBooking(body, formData.get("request_id")?.toString() ?? randomUUID())).id;
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    throw err;
  }

  // redirect() throws, so it must stay outside the try/catch.
  redirect(`/confirmation/${bookingId}`);
}
