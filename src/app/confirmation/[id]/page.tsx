import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingConfirmation } from "@/features/bookings/components/booking-confirmation";
import { getConfirmation } from "@/features/bookings/services/booking.service";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// The confirmation page lives at /confirmation/:id because /bookings/:id is the JSON API.
export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const found = await getConfirmation(id).catch((err: unknown) => {
    if (err instanceof AppError && err.status === 404) return null;
    throw err;
  });

  if (!found) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
        Appointment details
      </p>
      <BookingConfirmation booking={found.booking} slot={found.slot} />
      {found.booking.status === "confirmed" && (
        <Link
          href={`/manage/${encodeURIComponent(found.booking.id)}?token=${encodeURIComponent(found.managementToken)}`}
          referrerPolicy="no-referrer"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          Manage or reschedule appointment
        </Link>
      )}
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100/70 hover:text-brand-900"
      >
        <span aria-hidden>←</span> Back to available appointments
      </Link>
    </main>
  );
}
