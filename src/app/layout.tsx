import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Book an appointment | Clinic Booking",
  description: "Book a clinic appointment online, at a time that works for you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-brand-100/80 bg-white">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-700 text-2xl font-light text-white shadow-sm shadow-brand-900/10"
            >
              +
            </span>
            <div className="ml-3 flex-1">
              <span className="block text-base font-semibold tracking-tight text-brand-900">
                Clinic Booking
              </span>
              <span className="block text-xs text-brand-700/70">Patient appointments</span>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 sm:flex">
              <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
              Online booking
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="mt-12 border-t border-brand-100/80 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-brand-800/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <span>Your care, on your schedule.</span>
            <span>Appointments are confirmed instantly.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
