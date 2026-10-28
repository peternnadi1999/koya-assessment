/* eslint-disable @typescript-eslint/no-explicit-any -- test helpers deal in untyped JSON */
/**
 * End-to-end checks of the assessment spec, run against a live server.
 *
 *   E2E_BASE_URL=http://localhost:3000 E2E_API_KEY=<key> npm test -- e2e
 *
 * Skipped unless E2E_BASE_URL is set. NOTE: POST /reset wipes all bookings and
 * slots, so only point this at a database you are happy to reset (a local one,
 * or the deployed one BEFORE you submit).
 */
import { describe, expect, it } from "vitest";

const BASE = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const KEY = process.env.E2E_API_KEY ?? "";
const suite = BASE ? describe : describe.skip;

interface Res {
  status: number;
  json: any;
  headers: Headers;
}

async function call(
  method: string,
  path: string,
  opts: { body?: unknown; headers?: Record<string, string>; key?: string | null } = {},
): Promise<Res> {
  const key = opts.key === undefined ? KEY : opts.key;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(key ? { "x-api-key": key } : {}),
      ...opts.headers,
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, json, headers: res.headers };
}

const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const email = () => `user-${uid()}@example.com`;

const slot = (id: string, provider: string, startH: number) => ({
  id,
  provider,
  start: hours(startH),
  end: hours(startH + 0.5),
});

const book = (slot_id: string, em = email(), extra: Record<string, string> = {}) =>
  call("POST", "/bookings", { body: { slot_id, name: "Ada Obi", email: em }, headers: extra });

async function reset() {
  const r = await call("POST", "/reset", {
    body: {
      slots: [
        slot("past", "Dr Ade", -2),
        slot("s3", "Dr Bello", 5),
        slot("s1", "Dr Ade", 3),
        slot("s2", "Dr Ade", 4),
        ...Array.from({ length: 8 }, (_, i) => slot(`x${i}`, "Dr Ade", 10 + i)),
      ],
    },
  });
  expect(r.status).toBe(200);
}

suite("clinic booking API", { timeout: 120_000 }, () => {
  it("level 2: rejects missing or wrong API key with 401", async () => {
    for (const [m, p] of [
      ["GET", "/slots"],
      ["POST", "/reset"],
      ["POST", "/bookings"],
      ["GET", "/bookings?email=a@b.co"],
      ["GET", "/bookings/nope"],
      ["DELETE", "/bookings/nope"],
    ] as const) {
      expect((await call(m, p, { key: null, body: m === "POST" ? {} : undefined })).status).toBe(401);
      const wrong = await call(m, p, { key: "wrong", body: m === "POST" ? {} : undefined });
      expect(wrong.status).toBe(401);
      expect(typeof wrong.json.error).toBe("string");
    }
  });

  it("level 1: lists slots earliest first, filters by provider, tracks availability", async () => {
    await reset();
    const all = await call("GET", "/slots");
    expect(all.status).toBe(200);
    const ids = all.json.slots.map((s: any) => s.id);
    expect(ids.slice(0, 4)).toEqual(["past", "s1", "s2", "s3"]);
    expect(all.json.slots[0]).toMatchObject({ id: "past", provider: "Dr Ade", available: true });

    const bello = await call("GET", `/slots?provider=${encodeURIComponent("Dr Bello")}`);
    expect(bello.json.slots.map((s: any) => s.id)).toEqual(["s3"]);
    expect((await call("GET", "/slots?provider=dr%20bello")).json.slots).toEqual([]); // exact match

    expect((await book("s1")).status).toBe(201);
    const after = await call("GET", "/slots");
    expect(after.json.slots.find((s: any) => s.id === "s1").available).toBe(false);
    expect(after.json.slots.find((s: any) => s.id === "s2").available).toBe(true);
  });

  it("level 1+2: books, normalises input, and looks the booking up", async () => {
    await reset();
    const r = await call("POST", "/bookings", {
      body: { slot_id: "s1", name: "  Ada Obi  ", email: "  ADA@Example.COM " },
    });
    expect(r.status).toBe(201);
    expect(r.json).toMatchObject({
      slot_id: "s1",
      name: "Ada Obi",
      email: "ada@example.com",
      status: "confirmed",
    });
    expect(typeof r.json.id).toBe("string");
    expect(Number.isNaN(Date.parse(r.json.created_at))).toBe(false);

    const got = await call("GET", `/bookings/${r.json.id}`);
    expect(got.status).toBe(200);
    expect(got.json).toEqual(r.json);

    const missing = await call("GET", "/bookings/does-not-exist");
    expect(missing.status).toBe(404);
    expect(typeof missing.json.error).toBe("string");
  });

  it("level 2: validation errors", async () => {
    await reset();
    const bad = [
      {},
      { name: "A", email: "a@b.co" },
      { slot_id: "s1", email: "a@b.co" },
      { slot_id: "s1", name: "A" },
      { slot_id: "", name: "A", email: "a@b.co" },
      { slot_id: "s1", name: "   ", email: "a@b.co" },
      { slot_id: "s1", name: "A", email: "not-an-email" },
    ];
    for (const body of bad) {
      const r = await call("POST", "/bookings", { body });
      expect(r.status, JSON.stringify(body)).toBe(400);
      expect(typeof r.json.error).toBe("string");
    }
    expect((await book("nope")).status).toBe(404);
    expect((await book("past")).status).toBe(400);
  });

  it("level 3: a slot can only be booked once, even under a simultaneous burst", async () => {
    await reset();
    const results = await Promise.all(Array.from({ length: 25 }, () => book("s2")));
    const codes = results.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(24);
    expect(results.find((r) => r.status === 409)!.json.error).toEqual(expect.any(String));
  });

  it("level 3: cancelling frees the slot and can't be done twice", async () => {
    await reset();
    const b = await book("s1");
    const cancelled = await call("DELETE", `/bookings/${b.json.id}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.json).toMatchObject({ id: b.json.id, status: "cancelled" });
    expect((await call("GET", `/bookings/${b.json.id}`)).json.status).toBe("cancelled");

    expect((await call("DELETE", `/bookings/${b.json.id}`)).status).toBe(409);
    expect((await call("DELETE", "/bookings/nope")).status).toBe(404);

    expect((await call("GET", "/slots")).json.slots.find((s: any) => s.id === "s1").available).toBe(true);
    expect((await book("s1")).status).toBe(201);
  });

  it("level 4: idempotency key replays, and rejects a different body", async () => {
    await reset();
    const em = email();
    const key = `key-${uid()}`;
    const first = await book("s1", em, { "Idempotency-Key": key });
    const again = await book("s1", em, { "Idempotency-Key": key });
    expect(first.status).toBe(201);
    expect(again.status).toBe(201);
    expect(again.json.id).toBe(first.json.id);

    const different = await book("s2", em, { "Idempotency-Key": key });
    expect(different.status).toBe(422);
    expect(typeof different.json.error).toBe("string");

    const mine = await call("GET", `/bookings?email=${encodeURIComponent(em)}`);
    expect(mine.json.bookings).toHaveLength(1);
  });

  it("level 4: simultaneous retries with one key create exactly one booking", async () => {
    await reset();
    const em = email();
    const key = `key-${uid()}`;
    const rs = await Promise.all(Array.from({ length: 5 }, () => book("s1", em, { "Idempotency-Key": key })));
    expect(rs.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    expect(new Set(rs.map((r) => r.json.id)).size).toBe(1);
  });

  it("level 4: pages through a person's bookings oldest first", async () => {
    await reset();
    const em = email();
    const made: string[] = [];
    for (const id of ["x0", "x1", "x2", "x3", "x4"]) {
      const r = await book(id, em);
      expect(r.status).toBe(201);
      made.push(r.json.id);
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    const sizes: number[] = [];
    do {
      const q: string = `/bookings?email=${encodeURIComponent(em.toUpperCase())}&limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const page: Res = await call("GET", q);
      expect(page.status).toBe(200);
      sizes.push(page.json.bookings.length);
      seen.push(...page.json.bookings.map((b: any) => b.id));
      cursor = page.json.next_cursor;
    } while (cursor);
    expect(sizes).toEqual([2, 2, 1]);
    expect(seen).toEqual(made);

    for (const bad of ["0", "51", "abc", "1.5", "-3"]) {
      expect((await call("GET", `/bookings?email=${em}&limit=${bad}`)).status).toBe(400);
    }
    expect((await call("GET", "/bookings")).status).toBe(400);
    expect((await call("GET", `/bookings?email=${em}&cursor=garbage`)).status).toBe(400);
    expect((await call("GET", `/bookings?email=${email()}`)).json).toEqual({ bookings: [], next_cursor: null });
  });

  it("level 5: the 6th attempt for one email in a minute is 429; other emails are fine", async () => {
    await reset();
    const em = email();
    for (let i = 0; i < 5; i++) expect((await book("nope", em)).status).toBe(404); // failures count
    const limited = await book("s1", em);
    expect(limited.status).toBe(429);
    expect(typeof limited.json.error).toBe("string");
    const retry = limited.headers.get("retry-after");
    expect(retry).toMatch(/^\d+$/);
    expect(Number(retry)).toBeGreaterThanOrEqual(1);
    expect(Number(retry)).toBeLessThanOrEqual(60);

    expect((await book("s1", email())).status).toBe(201);
  });

  it("level 5: a simultaneous burst for one email lets exactly 5 through", async () => {
    await reset();
    const em = email();
    const rs = await Promise.all(Array.from({ length: 12 }, () => book("nope", em)));
    expect(rs.filter((r) => r.status === 404)).toHaveLength(5);
    expect(rs.filter((r) => r.status === 429)).toHaveLength(7);
  });
});
