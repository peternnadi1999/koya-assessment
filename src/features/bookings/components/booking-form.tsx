"use client";

import { useActionState, useState } from "react";
import { formatDay, formatTime } from "@/lib/utils";
import { bookSlotAction, type BookingFormState } from "../actions/booking.actions";
import type { SlotDTO } from "../types";

const initialState: BookingFormState = {};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-brand-200 bg-white px-3.5 py-3 text-sm text-brand-900 placeholder:text-brand-800/40 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

export function BookingForm({ slot }: { slot: SlotDTO }) {
  const [state, formAction, pending] = useActionState(bookSlotAction, initialState);
  // One id per form instance, reused if the person submits twice.
  const [requestId] = useState(() => crypto.randomUUID());

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-brand-100 bg-white p-5 shadow-lg shadow-brand-900/[0.06] sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
            <rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5" />
            <path d="M8 3.75v3M16 3.75v3M3.75 9.5h16.5M8 13h3M8 16.5h2" strokeLinecap="round" />
          </svg>
        </span>
        <div className="pt-0.5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Selected time</p>
          <p className="mt-1 text-sm font-semibold text-brand-900">{formatDay(slot.start)}</p>
          <p className="mt-0.5 text-xs text-brand-700/75">
            {formatTime(slot.start)} · {slot.provider}
          </p>
        </div>
      </div>

      <div className="h-px bg-brand-100" />

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-brand-900">Your details</h2>
        <p className="mt-1 text-sm text-brand-800/65">Who should we expect for this visit?</p>
      </div>
      <input type="hidden" name="slot_id" value={slot.id} />
      <input type="hidden" name="request_id" value={requestId} />

      <label className="block text-sm font-medium text-brand-900">
        Full name <span className="text-brand-600">*</span>
        <input name="name" required autoComplete="name" placeholder="e.g. Ada Obi" className={inputClass} />
      </label>

      <label className="block text-sm font-medium text-brand-900">
        Email address <span className="text-brand-600">*</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={inputClass}
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <p className="flex items-start gap-2 text-xs leading-5 text-brand-800/60">
        <svg aria-hidden viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600">
          <path d="M10 2.5 3.5 5v4.25c0 4 2.75 6.75 6.5 8.25 3.75-1.5 6.5-4.25 6.5-8.25V5L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m7.5 10 1.75 1.75 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Your details are used only to manage this appointment.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-900/10 transition hover:bg-brand-800 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Confirming your appointment…" : "Confirm appointment"}
        {!pending && (
          <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </form>
  );
}
