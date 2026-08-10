import { describe, it, expect } from "vitest";
import {
  tooLong,
  tooLarge,
  isValidDateString,
  isPlausibleBirthdate,
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_AMOUNT,
} from "./validate";

describe("tooLong", () => {
  it("allows a value exactly at the limit", () => {
    expect(tooLong("a".repeat(MAX_NAME_LENGTH), MAX_NAME_LENGTH)).toBe(false);
  });

  it("rejects a value one character over the limit", () => {
    expect(tooLong("a".repeat(MAX_NAME_LENGTH + 1), MAX_NAME_LENGTH)).toBe(true);
  });

  it("allows an empty string", () => {
    // Emptiness is a separate concern (a required-field check), not this
    // guard's job — this only ever fires as a second check after a route's
    // own "is this required field present" validation.
    expect(tooLong("", MAX_NAME_LENGTH)).toBe(false);
  });

  it("has sane, documented thresholds", () => {
    // Locks in the actual constants so a future edit notices it's changing
    // a real limit, not just refactoring.
    expect(MAX_NAME_LENGTH).toBe(200);
    expect(MAX_NOTE_LENGTH).toBe(2000);
    expect(MAX_EMAIL_LENGTH).toBe(254);
  });
});

describe("tooLarge", () => {
  it("allows a value exactly at the limit", () => {
    expect(tooLarge(MAX_AMOUNT, MAX_AMOUNT)).toBe(false);
  });

  it("rejects a value over the limit", () => {
    expect(tooLarge(MAX_AMOUNT + 0.01, MAX_AMOUNT)).toBe(true);
  });

  it("allows small, realistic amounts", () => {
    expect(tooLarge(42.5, MAX_AMOUNT)).toBe(false);
  });

  it("stays comfortably under the numeric(14,2) column's real ceiling", () => {
    // Locks in the actual constant, and the reasoning behind it: this must
    // stay well under ~$999,999,999,999.99 (12 integer digits) so a
    // rejected value here never reaches Postgres and risks a raw overflow
    // error instead of this clean check firing first.
    expect(MAX_AMOUNT).toBe(100_000_000);
    expect(MAX_AMOUNT).toBeLessThan(999_999_999_999.99);
  });
});

describe("isValidDateString", () => {
  it("accepts a real calendar date", () => {
    expect(isValidDateString("2026-06-15")).toBe(true);
  });

  it("rejects an out-of-range month", () => {
    expect(isValidDateString("2026-13-01")).toBe(false);
  });

  it("rejects a day that doesn't exist in that month", () => {
    // February never has 30 days, in a leap year or not.
    expect(isValidDateString("2026-02-30")).toBe(false);
  });

  it("rejects a value that isn't even the right shape", () => {
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("06/15/2026")).toBe(false);
    expect(isValidDateString("")).toBe(false);
  });
});

describe("isPlausibleBirthdate", () => {
  it("accepts an ordinary past birthdate", () => {
    expect(isPlausibleBirthdate("1995-03-20")).toBe(true);
  });

  it("rejects a birthdate in the future", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    expect(isPlausibleBirthdate(future.toISOString().slice(0, 10))).toBe(false);
  });

  it("rejects a birthdate before 1900", () => {
    expect(isPlausibleBirthdate("1899-12-31")).toBe(false);
  });

  it("accepts a birthdate exactly at the 1900 boundary", () => {
    expect(isPlausibleBirthdate("1900-01-01")).toBe(true);
  });

  it("rejects a format-valid but nonsensical date even with a plausible year", () => {
    expect(isPlausibleBirthdate("1995-13-01")).toBe(false);
  });
});
