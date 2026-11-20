import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks the whole @google/genai SDK boundary — askFinancialCoach/
// askPurchaseAdvisor/suggestBudgetAmounts all construct their own client
// internally via getClient() rather than taking one as a parameter (unlike
// this project's usual PoolClient-injection testing convention), so the
// module itself is the only seam available to intercept before a real
// network call. Lets every request-construction detail (model, system
// prompt, role mapping, refusal detection, structured-output schema) be
// locked in without a real GEMINI_API_KEY or network access — exactly the
// readiness check worth having before a real key is ever added.
const mockGenerateContent = vi.fn();
vi.mock("@google/genai", () => ({
  // A plain `function`, not an arrow function — `new GoogleGenAI(...)` in
  // lib/ai.ts's getClient() needs a real constructor, and arrow functions
  // can never be called with `new` regardless of vi.fn() wrapping.
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: mockGenerateContent } };
  }),
  // Mirrors the real SDK's enum values exactly (see lib/ai.ts's own
  // throwIfBlocked) — a plain object works since TypeScript enums compile
  // down to string-keyed objects at runtime.
  FinishReason: {
    FINISH_REASON_UNSPECIFIED: "FINISH_REASON_UNSPECIFIED",
    STOP: "STOP",
    MAX_TOKENS: "MAX_TOKENS",
    SAFETY: "SAFETY",
    RECITATION: "RECITATION",
    LANGUAGE: "LANGUAGE",
    OTHER: "OTHER",
    BLOCKLIST: "BLOCKLIST",
    PROHIBITED_CONTENT: "PROHIBITED_CONTENT",
    SPII: "SPII",
  },
  BlockedReason: {
    BLOCKED_REASON_UNSPECIFIED: "BLOCKED_REASON_UNSPECIFIED",
    SAFETY: "SAFETY",
    OTHER: "OTHER",
    BLOCKLIST: "BLOCKLIST",
  },
}));

const { askFinancialCoach, askPurchaseAdvisor, suggestBudgetAmounts, buildBudgetSuggestionContextBlock } = await import("./ai");

const BASE_CTX = {
  monthLabel: "November 2026",
  budgetCategories: [],
  goals: [],
  upcomingBills: [],
  hasPartnership: true,
};

beforeEach(() => {
  mockGenerateContent.mockReset();
});

describe("buildBudgetSuggestionContextBlock", () => {
  it("formats a category with an existing planned amount", () => {
    const block = buildBudgetSuggestionContextBlock([
      { categoryId: "c1", categoryName: "Dining Out", avgMonthlySpend: 312.4, monthsWithData: 3, currentPlannedAmount: 300 },
    ]);
    expect(block).toContain("Dining Out (id: c1)");
    expect(block).toContain("averaged $312/month");
    expect(block).toContain("over the last 3 months");
    expect(block).toContain("current planned amount is $300");
  });

  it("uses singular 'month' for exactly one month of history", () => {
    const block = buildBudgetSuggestionContextBlock([
      { categoryId: "c1", categoryName: "Dining Out", avgMonthlySpend: 100, monthsWithData: 1, currentPlannedAmount: null },
    ]);
    expect(block).toContain("over the last 1 month of");
    expect(block).not.toContain("1 months");
  });

  it("reports 'not set yet' when no budget_categories row exists for the current month", () => {
    const block = buildBudgetSuggestionContextBlock([
      { categoryId: "c1", categoryName: "Travel", avgMonthlySpend: 50, monthsWithData: 2, currentPlannedAmount: null },
    ]);
    expect(block).toContain("current planned amount is not set yet");
  });

  it("lists every category given, each on its own line", () => {
    const block = buildBudgetSuggestionContextBlock([
      { categoryId: "c1", categoryName: "Dining Out", avgMonthlySpend: 300, monthsWithData: 3, currentPlannedAmount: 300 },
      { categoryId: "c2", categoryName: "Groceries", avgMonthlySpend: 600, monthsWithData: 2, currentPlannedAmount: null },
    ]);
    expect(block.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(2);
  });
});

describe("askFinancialCoach", () => {
  it("returns the model's text on a normal completion", async () => {
    mockGenerateContent.mockResolvedValue({ text: "You're on track for the venue deposit.", candidates: [{ finishReason: "STOP" }] });
    const result = await askFinancialCoach(BASE_CTX, [], "Can we afford the venue deposit?");
    expect(result).toBe("You're on track for the venue deposit.");
  });

  it("sends the Gemini model id and the Coach system prompt", async () => {
    mockGenerateContent.mockResolvedValue({ text: "ok", candidates: [{ finishReason: "STOP" }] });
    await askFinancialCoach(BASE_CTX, [], "hi");
    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.model).toBe("gemini-3.8-flash");
    expect(call.config.systemInstruction).toContain("Noivos Money Coach");
  });

  it("maps 'assistant' history turns to Gemini's 'model' role, not 'assistant'", async () => {
    mockGenerateContent.mockResolvedValue({ text: "ok", candidates: [{ finishReason: "STOP" }] });
    await askFinancialCoach(
      BASE_CTX,
      [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      "follow-up question"
    );
    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.contents[0]).toEqual({ role: "user", parts: [{ text: "hi" }] });
    expect(call.contents[1]).toEqual({ role: "model", parts: [{ text: "hello" }] });
  });

  it("includes the user's question and the financial context in the final turn", async () => {
    mockGenerateContent.mockResolvedValue({ text: "ok", candidates: [{ finishReason: "STOP" }] });
    await askFinancialCoach(BASE_CTX, [], "Can we afford a vacation?");
    const call = mockGenerateContent.mock.calls[0][0];
    const lastTurn = call.contents[call.contents.length - 1];
    expect(lastTurn.role).toBe("user");
    expect(lastTurn.parts[0].text).toContain("Their question: Can we afford a vacation?");
    expect(lastTurn.parts[0].text).toContain("November 2026");
  });

  it("throws AI_REFUSAL when the model declines for a safety reason", async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined, candidates: [{ finishReason: "SAFETY" }] });
    await expect(askFinancialCoach(BASE_CTX, [], "anything")).rejects.toThrow("AI_REFUSAL");
  });

  it("throws AI_REFUSAL when the *prompt* is blocked before any candidate is generated (no finishReason to check)", async () => {
    // A real Gemini response for a prompt-level block has no candidates at
    // all — candidates?.[0]?.finishReason resolves to undefined here,
    // which throwIfBlocked must NOT treat as "no block" the way it
    // correctly does for an ordinary empty response. promptFeedback.blockReason
    // is the only signal present in this case.
    mockGenerateContent.mockResolvedValue({ text: undefined, candidates: undefined, promptFeedback: { blockReason: "SAFETY" } });
    await expect(askFinancialCoach(BASE_CTX, [], "anything")).rejects.toThrow("AI_REFUSAL");
  });

  it("does not treat MAX_TOKENS as a refusal — still returns whatever text came back", async () => {
    mockGenerateContent.mockResolvedValue({ text: "partial answer", candidates: [{ finishReason: "MAX_TOKENS" }] });
    const result = await askFinancialCoach(BASE_CTX, [], "anything");
    expect(result).toBe("partial answer");
  });

  it("returns an empty string rather than throwing when there's no text and no block", async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined, candidates: [{ finishReason: "STOP" }] });
    const result = await askFinancialCoach(BASE_CTX, [], "anything");
    expect(result).toBe("");
  });
});

describe("askPurchaseAdvisor", () => {
  it("sends only a text part when no image is attached", async () => {
    mockGenerateContent.mockResolvedValue({ text: "ok", candidates: [{ finishReason: "STOP" }] });
    await askPurchaseAdvisor(BASE_CTX, [], "a $400 couch");
    const call = mockGenerateContent.mock.calls[0][0];
    const lastTurn = call.contents[call.contents.length - 1];
    expect(lastTurn.parts).toHaveLength(1);
    expect(lastTurn.parts[0].text).toContain("a $400 couch");
  });

  it("puts the inlineData image part ahead of the text part when a photo is attached", async () => {
    mockGenerateContent.mockResolvedValue({ text: "ok", candidates: [{ finishReason: "STOP" }] });
    await askPurchaseAdvisor(BASE_CTX, [], "", { base64: "ZmFrZQ==", mediaType: "image/jpeg" });
    const call = mockGenerateContent.mock.calls[0][0];
    const lastTurn = call.contents[call.contents.length - 1];
    expect(lastTurn.parts).toHaveLength(2);
    expect(lastTurn.parts[0]).toEqual({ inlineData: { mimeType: "image/jpeg", data: "ZmFrZQ==" } });
    expect(lastTurn.parts[1].text).toContain("(see attached photo)");
  });

  it("throws AI_REFUSAL when the model declines", async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined, candidates: [{ finishReason: "PROHIBITED_CONTENT" }] });
    await expect(askPurchaseAdvisor(BASE_CTX, [], "anything")).rejects.toThrow("AI_REFUSAL");
  });
});

describe("suggestBudgetAmounts", () => {
  const CATEGORIES = [{ categoryId: "c1", categoryName: "Dining Out", avgMonthlySpend: 300, monthsWithData: 3, currentPlannedAmount: 250 }];

  it("parses a well-formed JSON response into the typed suggestion array", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ suggestions: [{ categoryId: "c1", suggestedAmount: 300, rationale: "matches your recent average" }] }),
      candidates: [{ finishReason: "STOP" }],
    });
    const result = await suggestBudgetAmounts(CATEGORIES);
    expect(result).toEqual([{ categoryId: "c1", suggestedAmount: 300, rationale: "matches your recent average" }]);
  });

  it("requests structured JSON output with a schema that has no top-level $schema key", async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ suggestions: [] }), candidates: [{ finishReason: "STOP" }] });
    await suggestBudgetAmounts(CATEGORIES);
    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.config.responseMimeType).toBe("application/json");
    expect(call.config.responseJsonSchema.type).toBe("object");
    expect(call.config.responseJsonSchema.$schema).toBeUndefined();
  });

  it("returns an empty array, not a throw, when the response isn't valid JSON", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not json at all", candidates: [{ finishReason: "STOP" }] });
    const result = await suggestBudgetAmounts(CATEGORIES);
    expect(result).toEqual([]);
  });

  it("returns an empty array when the JSON doesn't match the expected schema", async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ somethingElse: true }), candidates: [{ finishReason: "STOP" }] });
    const result = await suggestBudgetAmounts(CATEGORIES);
    expect(result).toEqual([]);
  });

  it("returns an empty array when there's no text at all", async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined, candidates: [{ finishReason: "STOP" }] });
    const result = await suggestBudgetAmounts(CATEGORIES);
    expect(result).toEqual([]);
  });

  it("throws AI_REFUSAL when the model declines", async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined, candidates: [{ finishReason: "SAFETY" }] });
    await expect(suggestBudgetAmounts(CATEGORIES)).rejects.toThrow("AI_REFUSAL");
  });
});
