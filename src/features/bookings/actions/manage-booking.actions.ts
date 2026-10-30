"use server";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import {
  cancelManagedBooking,
  rescheduleManagedBooking,
} from "../services/booking.service";

export interface ManageFormState {
  error?: string;
}

function readField(formData: FormData, name: string, maxLength: number): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.length <= maxLength ? value : null;
}

export async function cancelManagedBookingAction(
  _previous: ManageFormState,
  formData: FormData,
): Promise<ManageFormState> {
  const id = readField(formData, "booking_id", 200);
  const token = readField(formData, "token", 64);
  if (!id || !token) return { error: "Invalid appointment management link." };

  try {
    await cancelManagedBooking(id, token);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  redirect(`/manage/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}&notice=cancelled`);
}

export async function rescheduleManagedBookingAction(
  _previous: ManageFormState,
  formData: FormData,
): Promise<ManageFormState> {
  const id = readField(formData, "booking_id", 200);
  const token = readField(formData, "token", 64);
  const slotId = readField(formData, "slot_id", 200);
  if (!id || !token || !slotId) return { error: "Choose an available appointment time." };

  try {
    await rescheduleManagedBooking(id, token, slotId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  redirect(`/manage/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}&notice=rescheduled`);
}
