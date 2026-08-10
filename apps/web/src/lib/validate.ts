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

// Every optional date field across these routes (goals' targetDate,
// wedding's weddingDate, vendors' balanceDueDate, checklist's dueDate,
// profile's birthdate) used to check only `/^\d{4}-\d{2}-\d{2}$/` — format,
// not whether it's a real calendar date. Something format-valid but
// nonsensical like "2026-13-45" passed that regex and would only get
// caught by Postgres's own `date` column throwing a raw, unhelpful cast
// error (found 2026-08-08 while adding birthdate's own sanity checks,
// which needed real date parsing anyway — extracted this once rather than
// duplicate the same two-part check five times).
//
// JS's ISO-string `Date` parsing rejects a month/day clearly out of range
// (month 13, day 32) as Invalid Date, but does NOT validate a day against
// the *actual* length of that specific month — "2026-02-30" silently
// parses as 2026-03-02 instead of failing (confirmed directly: an initial
// version of this function trusted `Number.isNaN` alone and a test caught
// it). Round-tripping the parsed date back through `toISOString()` and
// comparing it to the original string catches that rollover — a month
// that doesn't exist gets rejected outright by the parser; a day that
// doesn't exist in an otherwise-valid month gets rejected here instead.
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

// Birthdate specifically needs more than "is this a real calendar date" —
// it's used for identity verification ahead of Plaid integration (see
// IdentitySettings.tsx) and, unlike every other date field in this app, is
// locked once set (no "Request a change" flow is wired up yet — see that
// component's own comment), so a nonsensical value here is stuck, not just
// a display glitch. Rejects a birthdate in the future or before 1900 — a
// generous sanity bound, deliberately not a minimum-age/eligibility rule.
// Whether this app requires users to be some minimum age is a legal/
// compliance call this project isn't making unilaterally here, same
// posture as the AI Coach provider decision.
export function isPlausibleBirthdate(value: string): boolean {
  if (!isValidDateString(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < 1900) return false;
  return new Date(`${value}T00:00:00Z`).getTime() <= Date.now();
}

// Every `id`/`categoryId`/`goalId`-shaped field in this app is a Postgres
// `uuid` column. Passing a client-supplied string straight into a `where
// id = $1` without checking its shape first means a malformed value hits
// Postgres's own uuid-cast error instead of a clean 400 — worse, the
// route's own catch-all sometimes attributes a *specific but wrong* reason
// to that failure (e.g. "the goal may not exist or isn't yours" for what
// was actually just a bad string, found 2026-08-08 in
// goals/[id]/contributions). Extracted once both that route and
// budget/transactions needed the identical check rather than duplicate the
// regex in each.
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
