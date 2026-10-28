// Wire shapes — exactly what the API spec defines (snake_case, ISO dates).

export type BookingStatus = "confirmed" | "cancelled";

export interface SlotDTO {
  id: string;
  provider: string;
  start: string;
  end: string;
  available: boolean;
}

export interface BookingDTO {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: BookingStatus;
  created_at: string;
}

export interface BookingPageDTO {
  bookings: BookingDTO[];
  next_cursor: string | null;
}
