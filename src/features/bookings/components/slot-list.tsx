"use client";

import { useMemo, useState } from "react";
import { cn, formatDay, formatTime } from "@/lib/utils";
import type { SlotDTO } from "../types";
import { BookingForm } from "./booking-form";

export function SlotList({ slots }: { slots: SlotDTO[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const groups = new Map<string, SlotDTO[]>();
    for (const slot of slots) {
      const day = formatDay(slot.start);
      groups.set(day, [...(groups.get(day) ?? []), slot]);
    }
    return [...groups.entries()];
  }, [slots]);

  const selected = slots.find((s) => s.id === selectedId) ?? null;

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-white px-6 py-14 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.7">
            <rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5" />
            <path d="M8 3.75v3M16 3.75v3M3.75 9.5h16.5" strokeLinecap="round" />
          </svg>
        </span>
        <h3 className="mt-4 text-base font-semibold text-brand-900">No appointments available</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-brand-800/70">
          There are no upcoming times to book right now. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-7">
        {byDay.map(([day, daySlots]) => (
          <section key={day} className="rounded-2xl border border-brand-100/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <h3 className="shrink-0 text-sm font-semibold text-brand-900">{day}</h3>
              <span className="h-px flex-1 bg-brand-100" aria-hidden />
              <span className="text-xs text-brand-700/70">
                {daySlots.length} {daySlots.length === 1 ? "time" : "times"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedId(slot.id)}
                  aria-pressed={slot.id === selectedId}
                  className={cn(
                    "group flex min-h-[4.25rem] items-center justify-between rounded-xl border px-4 py-3 text-left transition duration-150",
                    slot.id === selectedId
                      ? "border-brand-700 bg-brand-700 text-white shadow-md shadow-brand-900/10"
                      : "border-brand-100 bg-white text-brand-900 hover:border-brand-300 hover:bg-brand-50/70",
                  )}
                >
                  <span>
                    <span className="block text-base font-semibold tracking-tight">{formatTime(slot.start)}</span>
                    <span className={cn("mt-0.5 block text-xs", slot.id === selectedId ? "text-white/75" : "text-brand-700/70")}>
                      {slot.provider}
                    </span>
                  </span>
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    className={cn(
                      "h-4 w-4 transition-transform group-hover:translate-x-0.5",
                      slot.id === selectedId ? "text-white" : "text-brand-500",
                    )}
                  >
                    <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        {selected ? (
          <BookingForm key={selected.id} slot={selected} />
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-200 bg-white/70 p-6 sm:p-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100/70 text-brand-700" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path d="M8 5.5h8M8 9.5h8M8 13.5h5" strokeLinecap="round" />
                <path d="M6.5 3.75h11A2.75 2.75 0 0 1 20.25 6.5v11A2.75 2.75 0 0 1 17.5 20.25h-11A2.75 2.75 0 0 1 3.75 17.5v-11A2.75 2.75 0 0 1 6.5 3.75Z" />
              </svg>
            </span>
            <h3 className="mt-4 text-sm font-semibold text-brand-900">Your appointment</h3>
            <p className="mt-1 text-sm leading-6 text-brand-800/70">
              Select an available time to add your details and reserve your visit.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
