import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { logActivityEvent } from "@/lib/activity";
import { isUuid } from "@/lib/validate";
import { WEDDING_COUNTDOWN_CHALLENGE_TYPE } from "@/lib/challenges";

// Personal/Shared choice at join time, same convention as POST /api/goals'
// own `shared` flag (see that route's design-note comment): never trusts a
// client-supplied partnershipId, always resolves the writer's own real
// active membership server-side via findActiveMembership(), and rejects
// `shared: true` outright (rather than silently downgrading to personal)
// when the writer genuinely has no Partnership.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id: challengeId } = await params;
  if (!isUuid(challengeId)) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 });
  }

  let body: { shared?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (body.shared !== undefined && typeof body.shared !== "boolean") {
    return NextResponse.json({ error: "shared must be a boolean" }, { status: 400 });
  }
  const wantsShared = body.shared === true;

  try {
    const result = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);

      const challengeResult = await client.query(`select id, type, name from challenges where id = $1`, [challengeId]);
      const challenge = challengeResult.rows[0];
      if (!challenge) {
        return { kind: "notFound" as const };
      }

      // A countdown to a shared event only makes sense for a couple
      // counting it down together — joining it personally (no Partnership
      // in the picture at all) would leave progress permanently stuck at
      // 0%, since computeWeddingCountdownProgress has no wedding_date to
      // work from outside a Partnership's own wedding_details row.
      if (challenge.type === WEDDING_COUNTDOWN_CHALLENGE_TYPE && !wantsShared) {
        return { kind: "weddingNeedsShared" as const };
      }

      let partnershipId: string | null = null;
      if (wantsShared) {
        const membership = await findActiveMembership(userId, client);
        if (!membership) {
          return { kind: "needsPartnership" as const };
        }
        partnershipId = membership.partnership_id;
      }

      const insertResult = wantsShared
        ? await client.query(
            `insert into challenge_participations (challenge_id, partnership_id)
             values ($1, $2)
             on conflict (challenge_id, partnership_id) where partnership_id is not null
             do nothing
             returning id, progress_percent::float8 as progress_percent, completed_at::text as completed_at, joined_at::text as joined_at`,
            [challengeId, partnershipId]
          )
        : await client.query(
            `insert into challenge_participations (challenge_id, user_id)
             values ($1, $2)
             on conflict (challenge_id, user_id) where partnership_id is null
             do nothing
             returning id, progress_percent::float8 as progress_percent, completed_at::text as completed_at, joined_at::text as joined_at`,
            [challengeId, userId]
          );

      // No row back means this challenge was already joined (not a race to
      // resolve — ON CONFLICT DO NOTHING is the correct outcome, re-joining
      // something you've already joined should just succeed idempotently,
      // not error) — fall back to the existing row.
      const participation =
        insertResult.rows[0] ??
        (
          await (wantsShared
            ? client.query(
                `select id, progress_percent::float8 as progress_percent, completed_at::text as completed_at, joined_at::text as joined_at
                 from challenge_participations where challenge_id = $1 and partnership_id = $2`,
                [challengeId, partnershipId]
              )
            : client.query(
                `select id, progress_percent::float8 as progress_percent, completed_at::text as completed_at, joined_at::text as joined_at
                 from challenge_participations where challenge_id = $1 and user_id = $2`,
                [challengeId, userId]
              ))
        ).rows[0];

      return {
        kind: "joined" as const,
        partnershipId,
        challengeName: challenge.name as string,
        participation: {
          id: participation.id as string,
          challengeId,
          type: challenge.type as string,
          challengeName: challenge.name as string,
          shared: wantsShared,
          progressPercent: participation.progress_percent as number,
          completedAt: participation.completed_at as string | null,
          joinedAt: participation.joined_at as string,
        },
      };
    });

    if (result.kind === "notFound") {
      return NextResponse.json({ error: "That challenge doesn't exist." }, { status: 404 });
    }
    if (result.kind === "weddingNeedsShared") {
      return NextResponse.json(
        { error: "Wedding Countdown is a shared challenge — join it with your partner." },
        { status: 400 }
      );
    }
    if (result.kind === "needsPartnership") {
      return NextResponse.json(
        { error: "You need a Partnership to join a challenge together — invite a partner first, or join personally." },
        { status: 400 }
      );
    }

    // logActivityEvent runs in its own separate transaction/connection —
    // same reasoning as every other call site in this app (see that
    // function's own comment) — so it fires only after the join above has
    // already committed, never from inside withUserContext's callback.
    if (result.partnershipId) {
      void logActivityEvent(userId, result.partnershipId, "challenge_joined", { challengeName: result.challengeName });
    }

    return NextResponse.json(result.participation);
  } catch (err) {
    console.error("POST /api/challenges/[id]/join failed", err);
    return NextResponse.json({ error: "Couldn't join that challenge." }, { status: 500 });
  }
}
