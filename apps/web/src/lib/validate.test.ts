import { describe, it, expect } from "vitest";
import { tooLong, tooLarge, MAX_NAME_LENGTH, MAX_NOTE_LENGTH, MAX_EMAIL_LENGTH, MAX_AMOUNT } from "./validate";

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
