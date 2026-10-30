"use client";

import { useActionState } from "react";
import { formatDay, formatTime } from "@/lib/utils";
import type { SlotDTO } from "../types";
import {
  cancelManagedBookingAction,
  rescheduleManagedBookingAction,
  type ManageFormState,
} from "../actions/manage-booking.actions";

const initialState: ManageFormState = {};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-brand-200 bg-white px-3.5 py-3 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

export function ManageActions({
  bookingId,
  token,
  slots,
}: {
  bookingId: string;
  token: string;
  slots: SlotDTO[];
}) {
  const [cancelState, cancelAction, cancelling] = useActionState(
    cancelManagedBookingAction,
    initialState,
  );
  const [rescheduleState, rescheduleAction, rescheduling] = useActionState(
    rescheduleManagedBookingAction,
    initialState,
  );

  return (
    <section className="mt-7 space-y-5">
      {slots.length > 0 && (
        <form action={rescheduleAction} className="space-y-4 rounded-2xl border border-brand-100 bg-white p-5">
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="token" value={token} />
          <label className="block text-sm font-semibold text-brand-900">
            Choose a new appointment time
            <select name="slot_id" required defaultValue="" className={inputClass}>
              <option value="" disabled>Select an available time</option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {formatDay(slot.start)} · {formatTime(slot.start)} · {slot.provider}
                </option>
              ))}
            </select>
          </label>
          {rescheduleState.error && (
            <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              {rescheduleState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={rescheduling}
            className="w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-wait disabled:opacity-60"
          >
            {rescheduling ? "Rescheduling…" : "Reschedule appointment"}
          </button>
        </form>
      )}

      <form
        action={cancelAction}
        onSubmit={(event) => {
          if (!window.confirm("Cancel this appointment? This cannot be undone.")) {
            event.preventDefault();
          }
        }}
        className="rounded-2xl border border-red-100 bg-white p-5"
      >
        <input type="hidden" name="booking_id" value={bookingId} />
        <input type="hidden" name="token" value={token} />
        <p className="mb-3 text-sm text-brand-800/70">
          Cancelling releases this appointment time for another patient.
        </p>
        {cancelState.error && (
          <p role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            {cancelState.error}
          </p>
        )}
        <button
          type="submit"
          disabled={cancelling}
          className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
        >
          {cancelling ? "Cancelling…" : "Cancel appointment"}
        </button>
      </form>
    </section>
  );
}
