import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ManageActions } from "@/features/bookings/components/manage-actions";
import { BookingConfirmation } from "@/features/bookings/components/booking-confirmation";
import {
  getManageableBooking,
  listOpenSlots,
} from "@/features/bookings/services/booking.service";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Manage appointment | Clinic Booking",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ManageAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string | string[]; notice?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (typeof query.token !== "string") notFound();

  let found;
  try {
    found = await getManageableBooking(id, query.token);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const slots = found.canManage ? await listOpenSlots() : [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
        Appointment management
      </p>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-brand-900 sm:text-3xl">
        Manage your appointment
      </h1>
      {query.notice === "cancelled" && (
        <p role="status" className="mb-5 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Your appointment has been cancelled.
        </p>
      )}
      {query.notice === "rescheduled" && (
        <p role="status" className="mb-5 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Your appointment has been rescheduled.
        </p>
      )}
      <BookingConfirmation booking={found.booking} slot={found.slot} />
      {found.canManage ? (
        <ManageActions bookingId={id} token={query.token} slots={slots} />
      ) : (
        <div className="mt-6 space-y-3">
          {found.booking.status === "confirmed" && (
            <p className="text-sm text-brand-800/70">
              This appointment has started and can no longer be changed online.
            </p>
          )}
          <Link
            href="/"
            className="inline-flex items-center rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Back to available appointments
          </Link>
        </div>
      )}
    </main>
  );
}
