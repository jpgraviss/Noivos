import { describe, it, expect } from "vitest";
import { tooLong, MAX_NAME_LENGTH, MAX_NOTE_LENGTH, MAX_EMAIL_LENGTH } from "./validate";

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
