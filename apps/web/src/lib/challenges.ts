// Community Challenges (PRD §12.13, SE-76) — the 5 challenge types this app
// can honestly compute progress for today, because they map onto data it
// already tracks (goals, wedding_details). "No-Spend Weekend" and "Date
// Night Savings" are PRD-named challenges deliberately left unbuilt — they
// need their own behavior-tracking logic (a zero-spend-window check against
// transaction history; a dedicated small savings sub-goal) that doesn't
// exist anywhere in this app yet, not a gap silently papered over.
export const GOAL_BASED_CHALLENGE_TYPES = ["emergency_fund", "house_down_payment", "debt_free", "vacation_savings"] as const;
export type GoalBasedChallengeType = (typeof GOAL_BASED_CHALLENGE_TYPES)[number];

export const WEDDING_COUNTDOWN_CHALLENGE_TYPE = "wedding_countdown";

export const CHALLENGE_TYPES = [...GOAL_BASED_CHALLENGE_TYPES, WEDDING_COUNTDOWN_CHALLENGE_TYPE] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

// Maps a challenge's type to the goals.goal_type it tracks progress
// against — distinct vocabularies (a challenge is a PRD-named thing you
// join; a goal_type is this schema's own, slightly different set, e.g.
// "house" not "house_down_payment") kept deliberately separate rather than
// reusing goal_type strings directly as challenge types.
export const CHALLENGE_GOAL_TYPE: Record<GoalBasedChallengeType, string> = {
  emergency_fund: "emergency_fund",
  house_down_payment: "house",
  debt_free: "debt_payoff",
  vacation_savings: "vacation",
};

export function isGoalBasedChallengeType(type: string): type is GoalBasedChallengeType {
  return (GOAL_BASED_CHALLENGE_TYPES as readonly string[]).includes(type);
}

// Relative only, per the schema's own column comment (progress_percent,
// 0001_init.sql) — this function only ever sees/returns a percentage, never
// the dollar amounts it was computed from, so there's no raw-balance value
// for a caller to accidentally leak further up the stack.
export function computeGoalBasedProgress(totalContributed: number, targetAmount: number): number {
  if (!(targetAmount > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((totalContributed / targetAmount) * 100)));
}

// A countdown, not a savings target — progress is how much of the time
// between joining and the wedding date has elapsed. No weddingDate yet
// (Wedding Mode never started, or no date set) means nothing to count down
// to: 0%, same "honest absence over a fabricated number" posture as every
// other not-yet-real figure in this app, rather than guessing a reasonable-
// looking default. A wedding date already in the past at join time (joining
// after the big day) reads as already complete — 100%, not an error.
export function computeWeddingCountdownProgress(joinedAt: Date, weddingDate: Date | null, now: Date = new Date()): number {
  if (!weddingDate) return 0;
  const totalMs = weddingDate.getTime() - joinedAt.getTime();
  if (totalMs <= 0) return 100;
  const elapsedMs = now.getTime() - joinedAt.getTime();
  return Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
}
