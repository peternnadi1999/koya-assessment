import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  asObject,
  decodeCursor,
  emailKeyOf,
  encodeCursor,
  fingerprint,
  parseLimit,
  parseNewBooking,
  parseReset,
} from "@/features/bookings/schemas/booking.schema";

const message = (fn: () => unknown): string => {
  try {
    fn();
  } catch (err) {
    if (err instanceof AppError) {
      expect(err.status).toBe(400);
      return err.message;
    }
    throw err;
  }
  throw new Error("expected a 400");
};

describe("parseNewBooking", () => {
  it("trims name and email and lower-cases the email", () => {
    expect(
      parseNewBooking({ slot_id: "s1", name: "  Ada Obi ", email: "  ADA@Example.COM " }),
    ).toEqual({ slot_id: "s1", name: "Ada Obi", email: "ada@example.com" });
  });

  it("rejects missing, empty and whitespace-only fields", () => {
    expect(message(() => parseNewBooking({ name: "A", email: "a@b.co" }))).toMatch(/slot_id/);
    expect(message(() => parseNewBooking({ slot_id: "s1", name: "   ", email: "a@b.co" }))).toMatch(/name/);
    expect(message(() => parseNewBooking({ slot_id: "s1", name: "A" }))).toMatch(/email/);
    expect(message(() => parseNewBooking({ slot_id: "", name: "A", email: "a@b.co" }))).toMatch(/slot_id/);
  });

  it("rejects non-string values and invalid emails", () => {
    expect(message(() => parseNewBooking({ slot_id: 1, name: "A", email: "a@b.co" }))).toMatch(/slot_id/);
    for (const email of ["nope", "a@b", "a b@c.co", "@b.co", "a@.co "]) {
      expect(message(() => parseNewBooking({ slot_id: "s1", name: "A", email }))).toMatch(/email/);
    }
  });
});

describe("asObject / emailKeyOf", () => {
  it("only accepts JSON objects", () => {
    for (const bad of [null, [], "x", 1, undefined]) expect(message(() => asObject(bad))).toMatch(/object/);
    expect(asObject({ a: 1 })).toEqual({ a: 1 });
  });

  it("derives the rate-limit key from the email", () => {
    expect(emailKeyOf({ email: "  A@B.co " })).toBe("a@b.co");
    expect(emailKeyOf({})).toBe("");
    expect(emailKeyOf({ email: 5 })).toBe("");
  });
});

describe("fingerprint", () => {
  it("is the same for equivalent bodies and differs otherwise", () => {
    const a = fingerprint({ slot_id: "s1", name: "Ada", email: "ada@x.co" });
    expect(fingerprint({ slot_id: "s1", name: " Ada ", email: "ADA@x.co", extra: 1 })).toBe(a);
    expect(fingerprint({ slot_id: "s2", name: "Ada", email: "ada@x.co" })).not.toBe(a);
    expect(fingerprint({ slot_id: "s1", name: "Bob", email: "ada@x.co" })).not.toBe(a);
  });
});

describe("parseLimit", () => {
  it("defaults to 10 and accepts 1..50", () => {
    expect(parseLimit(null)).toBe(10);
    expect(parseLimit("1")).toBe(1);
    expect(parseLimit("50")).toBe(50);
  });

  it("rejects everything else", () => {
    for (const bad of ["0", "51", "-1", "abc", "1.5", "", " ", "1e1"]) {
      expect(message(() => parseLimit(bad))).toMatch(/limit/);
    }
  });
});

describe("cursor", () => {
  it("round-trips", () => {
    const c = { t: 1_800_000_000_123, id: "bk_abc" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("rejects garbage", () => {
    for (const bad of ["!!!", "e30", Buffer.from('{"t":"x","id":1}').toString("base64url")]) {
      expect(message(() => decodeCursor(bad))).toMatch(/cursor/);
    }
  });
});

describe("parseReset", () => {
  const slot = (id: string) => ({
    id,
    provider: "Dr Ade",
    start: "2026-12-10T09:00:00Z",
    end: "2026-12-10T09:30:00Z",
  });

  it("parses slots into dates", () => {
    const [s] = parseReset({ slots: [slot("s1")] });
    expect(s.start.toISOString()).toBe("2026-12-10T09:00:00.000Z");
  });

  it("accepts an empty list", () => {
    expect(parseReset({ slots: [] })).toEqual([]);
  });

  it("rejects bad input and duplicate ids", () => {
    expect(message(() => parseReset({}))).toMatch(/slots/);
    expect(message(() => parseReset({ slots: [{ ...slot("s1"), start: "nope" }] }))).toMatch(/start/);
    expect(message(() => parseReset({ slots: [slot("s1"), slot("s1")] }))).toMatch(/duplicate/);
  });
});
