# Noivos Documentation

This directory is the source of truth for the Noivos product and engineering org, built one document at a time per the founder-approved Documentation Roadmap (see `PROJECT_MEMORY.md`). Documentation precedes implementation — nothing in `apps/` or `packages/` should be built ahead of its corresponding approved doc here.

**Re-sequenced 2026-08-02 ("fast-track to code"):** the founder chose to prioritize the 5 documents that actually gate engineering work, then start building, rather than completing the full original 18-document sequence first. Marketing Website, Admin Dashboard, Analytics, Testing Strategy, Launch Strategy, Business Plan, and Investor Documentation are deferred — not skipped — to run later or in parallel with early engineering. See `PROJECT_MEMORY.md` §12 for the reasoning.

**Engineering-blocking docs (current focus):**
1. Product Requirements Document — `02 Product Requirements/PRD.md` ✅ drafted, open questions resolved, awaiting final sign-off
2. Brand Guidelines — `03 UX/Brand Guidelines.md` ✅ drafted (v2.0), awaiting approval
3. UX/UI Blueprint — `03 UX/UX-UI Blueprint.md` ✅ drafted, awaiting approval
4. Design System — `03 UX/Design System.md` ✅ drafted, awaiting approval (1 item — glow-based elevation — flagged for visual validation)
5. Database Architecture — `04 Database/Database Architecture.md` ✅ drafted, awaiting approval (2 items — deletion grace period, Plaid encryption approach — flagged pending confirmation)
6. Backend Architecture — `07 Backend/Backend Architecture.md` ✅ drafted, awaiting approval (2 items — client/Supabase access pattern, Inngest vs. Trigger.dev — flagged pending confirmation)
7. API Documentation — `05 API/API Documentation.md` ✅ drafted, awaiting approval
8. AI Architecture — `06 AI/AI Architecture.md` ✅ drafted, awaiting approval (model version deliberately left unpinned — see doc §8)
9. Security Architecture — `12 Security/Security Architecture.md` ✅ drafted — **baseline only, by design**; full compliance pass (SOC 2, pen testing, incident-response plan) explicitly deferred to before public launch
10. Infrastructure — not started (expected to be quick — Supabase/Vercel/Expo are already chosen; not one of the 5 fast-track docs, can be picked up alongside early engineering)
11. Frontend Architecture — `08 Frontend/Frontend Architecture.md` ✅ drafted, awaiting approval

**Fast-track list complete.** All 5 documents that gate writing application code are drafted. Infrastructure (10) wasn't part of that 5 — it gates *deploying*, not coding — and can be picked up quickly alongside early engineering rather than blocking the start.

**Deferred — not blocking engineering, to run later or in parallel:**
12. Marketing Website
13. Admin Dashboard
14. Analytics
15. Testing Strategy
16. Launch Strategy
17. Business Plan
18. Investor Documentation

See `../PROJECT_MEMORY.md` for the permanent record of every approved decision, open question, risk, and assumption. Always check it before starting new work.
