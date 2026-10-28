import { cn, formatDay, formatTime } from "@/lib/utils";
import type { BookingDTO } from "../types";

export function BookingConfirmation({
  booking,
  slot,
}: {
  booking: BookingDTO;
  slot: { provider: string; start: string; end: string };
}) {
  const confirmed = booking.status === "confirmed";

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-brand-100 bg-white shadow-xl shadow-brand-900/[0.06]">
      <div className={cn("h-1.5", confirmed ? "bg-brand-500" : "bg-zinc-300")} />
      <div className="p-6 sm:p-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
              confirmed ? "bg-brand-100 text-brand-700" : "bg-zinc-100 text-zinc-600",
            )}
            aria-hidden
          >
            {confirmed ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.8">
                <path d="m5 12.5 4.25 4.25L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.8">
                <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <div>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                confirmed ? "bg-brand-50 text-brand-700" : "bg-zinc-100 text-zinc-600",
              )}
            >
              {confirmed ? "Appointment confirmed" : "Appointment cancelled"}
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-brand-900 sm:text-3xl">
              {confirmed ? "You're all booked." : "This booking was cancelled."}
            </h1>
            <p className="mt-2 text-sm leading-6 text-brand-800/70">
              {confirmed
                ? "We look forward to seeing you. Keep these details for your visit."
                : "This appointment is no longer reserved for you."}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-brand-50 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Your visit</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-brand-900">
            {formatDay(slot.start)}
          </p>
          <p className="mt-1 text-sm text-brand-800/80">
            {formatTime(slot.start)} <span className="px-1 text-brand-400">·</span> {slot.provider}
          </p>
        </div>

        <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-brand-800/60">Patient</dt>
            <dd className="mt-1 text-sm font-semibold text-brand-900">{booking.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-brand-800/60">Email address</dt>
            <dd className="mt-1 break-all text-sm font-semibold text-brand-900">{booking.email}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-brand-800/60">Booking reference</dt>
            <dd className="mt-1 inline-block rounded-lg bg-brand-50 px-2.5 py-1.5 font-mono text-xs text-brand-800">
              {booking.id}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
