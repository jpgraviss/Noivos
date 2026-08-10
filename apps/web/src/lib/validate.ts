// Centralized max-length guards for user-supplied free text. Every
// name/note/email-shaped column in packages/database/migrations/0001_init.sql
// is a plain Postgres `text` (no built-in length limit of its own), and
// Next.js Route Handlers have no request-body size limit either — only the
// platform proxy layer's 10MB default (`proxyClientMaxBodySize`) caps a
// request at all, which is still enormous for a single form field. None of
// this was exploitable in a "read someone else's data" sense (every route
// is already RLS-scoped), but nothing stopped a client from writing
// megabytes of text into a single goal name or note. Deliberately generous
// relative to real usage rather than tight — these exist to rule out abuse,
// not to second-guess a legitimately long note.
export const MAX_NAME_LENGTH = 200;
export const MAX_NOTE_LENGTH = 2000;
// RFC 5321 §4.5.3.1.3 — the actual maximum length of an SMTP path/address.
export const MAX_EMAIL_LENGTH = 254;
// Every currency amount in the schema is `numeric(14, 2)` — 12 integer
// digits, so it can technically hold up to ~$999,999,999,999.99 before
// Postgres itself throws a raw "numeric field overflow" (found 2026-08-08:
// no route validated an upper bound at all, so a client submitting
// something absurd would surface that as an unhelpful generic 500 instead
// of a clean 400, the same class of gap as the date-format/UUID-format
// checks fixed earlier). $100,000,000 is nowhere near a real personal- or
// wedding-finance amount — deliberately generous, same posture as the
// length limits above, this rules out abuse/overflow, not realistic use.
export const MAX_AMOUNT = 100_000_000;

export function tooLong(value: string, max: number): boolean {
  return value.length > max;
}

export function tooLarge(value: number, max: number): boolean {
  return value > max;
}
