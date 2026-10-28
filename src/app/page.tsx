import { SlotList } from "@/features/bookings/components/slot-list";
import { listOpenSlots } from "@/features/bookings/services/booking.service";

// Availability changes constantly; never prerender this page.
export const dynamic = "force-dynamic";

export default async function Home() {
  const open = await listOpenSlots();

  return (
    <main className="mx-auto max-w-6xl px-5 pb-4 pt-8 sm:px-8 sm:pt-12">
      <section className="relative isolate mb-10 overflow-hidden rounded-[2rem] bg-brand-900 px-6 py-9 text-white shadow-xl shadow-brand-900/10 sm:px-10 sm:py-12 lg:px-14">
        <div
          aria-hidden
          className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border-[48px] border-white/[0.04]"
        />
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/3 bg-gradient-to-l from-brand-800/70 to-transparent lg:block" />
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-300" aria-hidden />
            A little easier, a little healthier
          </p>
          <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
            Care that fits your schedule.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base">
            Choose a time that works for you. Your appointment will be confirmed
            as soon as you book.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-white/85 sm:text-sm">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="text-brand-300">✓</span>
              Simple online booking
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="text-brand-300">✓</span>
              Instant confirmation
            </span>
          </div>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
            Find a time
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-brand-900 sm:text-2xl">
            Available appointments
          </h2>
        </div>
        <p className="rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-medium text-brand-700">
          {open.length} {open.length === 1 ? "time" : "times"} available
        </p>
      </div>
      <SlotList slots={open} />
    </main>
  );
}
