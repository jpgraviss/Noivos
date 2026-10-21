import { describe, it, expect } from "vitest";
import { defaultCategoryNameForPlaidCategory } from "./plaid";

// The one pure, DB/API-free piece of lib/plaid.ts — everything else
// (syncPlaidItem, encryptAccessToken, verifyPlaidWebhookSignature) needs a
// real Plaid client, database connection, or live signing key, which is
// why this is the only test file for this module.
describe("defaultCategoryNameForPlaidCategory", () => {
  it("maps groceries to Groceries", () => {
    expect(defaultCategoryNameForPlaidCategory("FOOD_AND_DRINK", "FOOD_AND_DRINK_GROCERIES")).toBe("Groceries");
  });

  it("maps every other FOOD_AND_DRINK detail to Dining Out", () => {
    expect(defaultCategoryNameForPlaidCategory("FOOD_AND_DRINK", "FOOD_AND_DRINK_RESTAURANT")).toBe("Dining Out");
    expect(defaultCategoryNameForPlaidCategory("FOOD_AND_DRINK", "FOOD_AND_DRINK_COFFEE")).toBe("Dining Out");
  });

  it("maps transportation and general merchandise directly", () => {
    expect(defaultCategoryNameForPlaidCategory("TRANSPORTATION", "TRANSPORTATION_GAS")).toBe("Transportation");
    expect(defaultCategoryNameForPlaidCategory("GENERAL_MERCHANDISE", "GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES")).toBe(
      "Personal Shopping"
    );
  });

  it("returns null for a primary category with no matching default", () => {
    expect(defaultCategoryNameForPlaidCategory("MEDICAL", "MEDICAL_PRIMARY_CARE")).toBeNull();
    expect(defaultCategoryNameForPlaidCategory("TRAVEL", "TRAVEL_FLIGHTS")).toBeNull();
  });

  it("returns null when Plaid didn't classify the transaction at all", () => {
    expect(defaultCategoryNameForPlaidCategory(null, null)).toBeNull();
    expect(defaultCategoryNameForPlaidCategory(undefined, undefined)).toBeNull();
  });
});
