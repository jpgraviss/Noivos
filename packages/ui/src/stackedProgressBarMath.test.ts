import { describe, it, expect } from "vitest";
import { computeSegmentWidths } from "./stackedProgressBarMath";

// The pure width-percentage math behind StackedProgressBar (Budget's
// category chart, Goals' per-contributor progress) — extracted so it's
// testable without rendering an RN/RNW component tree.
describe("computeSegmentWidths", () => {
  it("splits contributors proportionally against the target", () => {
    const widths = computeSegmentWidths(
      [
        { name: "Ava", amount: 30, color: "#000" },
        { name: "Marcus", amount: 20, color: "#111" },
      ],
      100
    );
    expect(widths).toEqual([30, 20]);
  });

  it("guards against a zero target instead of dividing by zero", () => {
    // Every current caller already guards against target <= 0 before
    // rendering at all — this is the shared component's own defense, so a
    // future caller that forgets that guard gets 0% segments instead of a
    // NaN%/Infinity% CSS width.
    const widths = computeSegmentWidths([{ name: "Ava", amount: 30, color: "#000" }], 0);
    expect(widths).toEqual([0]);
  });

  it("guards against a negative target the same way as a zero one", () => {
    const widths = computeSegmentWidths([{ name: "Ava", amount: 30, color: "#000" }], -50);
    expect(widths).toEqual([0]);
  });

  it("clamps a negative contributor amount to 0% rather than a negative width", () => {
    const widths = computeSegmentWidths([{ name: "Ava", amount: -10, color: "#000" }], 100);
    expect(widths).toEqual([0]);
  });

  it("returns an empty array for no contributors", () => {
    expect(computeSegmentWidths([], 100)).toEqual([]);
  });

  it("does not clamp the total to 100% when contributions exceed the target (each segment is independent)", () => {
    // Overfunded goals/categories aren't clamped here — the container's
    // overflow: hidden visually clips the excess, which is the existing,
    // intentional behavior this test locks in rather than changes.
    const widths = computeSegmentWidths(
      [
        { name: "Ava", amount: 80, color: "#000" },
        { name: "Marcus", amount: 80, color: "#111" },
      ],
      100
    );
    expect(widths).toEqual([80, 80]);
  });
});
