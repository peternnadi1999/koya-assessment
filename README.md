# Clinic Booking

Clinic appointment booking: a JSON API (Koya assessment, Task 1, levels 1–5) plus a small
web page that uses it. Next.js (App Router) · PostgreSQL · Prisma · Zod · Tailwind (green/white) · Vercel.

## Quick start

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL, DIRECT_URL, API_KEY
npx prisma migrate deploy     # creates the tables (incl. the partial unique index)
npm run db:seed               # optional demo slots for the web page
npm run dev                   # http://localhost:3000
```

## API (as in the spec)

Every request needs `X-API-Key` (401 otherwise). Errors are always `{"error": "<message>"}`.

| Level | Endpoint | Behaviour |
| --- | --- | --- |
| 1 | `POST /reset` | Deletes all bookings, replaces all slots with `{ "slots": [{id, provider, start, end}] }` |
| 1 | `GET /slots[?provider=]` | All slots, earliest first, each with `available` |
| 1–5 | `POST /bookings` | `{slot_id, name, email}` → 201 · 400 invalid / slot already started · 404 no such slot · 409 slot taken · 422 key reuse with different body · 429 too many attempts |
| 1 | `GET /bookings/:id` | The booking, or 404 |
| 3 | `DELETE /bookings/:id` | Cancels and frees the slot; 404 unknown, 409 already cancelled |
| 4 | `GET /bookings?email=&limit=&cursor=` | That person's bookings, oldest first, cursor-paged (`limit` 1–50, default 10) |

## How each level is enforced

- **Level 2** – `X-API-Key` is checked first on every route (constant-time compare). Input is validated with Zod; `name`/`email` are trimmed and `email` is stored lower-case.
- **Level 3** – the *database* guarantees it: a partial unique index allows only one `confirmed` booking per slot, so simultaneous requests can't both win; the loser gets a 409. Cancelled rows don't count, so cancelling frees the slot.
- **Level 4** – with an `Idempotency-Key`, the stored response is replayed (same status and booking `id`); a different body gives 422. The key row is inserted in the same transaction as the booking, so even simultaneous retries create one booking. Paging is keyset-based on `(created_at, id)`, so it stays correct while new bookings arrive.
- **Level 5** – at most 5 `POST /bookings` attempts per email in any 60 seconds (failures count), the 6th gets 429 + `Retry-After`. Attempts are stored in Postgres and checked under a per-email advisory lock, so a burst can't slip past the limit. Idempotent replays don't count as new attempts.

`POST /reset` also clears idempotency records and attempt counters, so every test run starts clean.

## Web page

`/` lists open slots, the form books one, `/confirmation/:id` shows the result. The page books through a
server action that calls the same service as the API, so the API key never reaches the browser. (The
confirmation page is `/confirmation/:id`, not `/bookings/:id`, because that path is the JSON API.)
The confirmation page provides a private `/manage/:id?token=…` link for cancelling or rescheduling
upcoming appointments. The token is an HMAC signed with `API_KEY`, checked on every server action,
and does not rely on an email-only lookup. Keep `API_KEY` secret and use a strong random value; rotating
it invalidates existing management links. Management pages are excluded from search indexing.

## Structure

```
src/app/{reset,slots,bookings,bookings/[id]}/route.ts   API route handlers (auth → call service)
src/app/{page.tsx,confirmation/[id],manage/[id]}        web pages
src/features/bookings   components, schemas (parsing/validation), services (rules), repositories (Prisma only), actions
src/server              db client, API-key check, rate limiter, management-link signing
src/lib                 env validation, errors, helpers
prisma/                 schema, hand-written migration, seed
tests/                  unit (Vitest) and e2e (runs against a live URL)
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run vercel-build` | Used by Vercel: `prisma generate`, `migrate deploy`, `next build` |
| `npm test` | Unit tests |
| `E2E_BASE_URL=… E2E_API_KEY=… npm test -- e2e` | Spec checks against a running server (**it calls `/reset`**) |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma helpers |
