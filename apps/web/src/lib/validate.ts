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

export function tooLong(value: string, max: number): boolean {
  return value.length > max;
}
