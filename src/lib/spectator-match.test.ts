import { describe, expect, it } from "vitest";
import { redactMatchForSpectator } from "@/lib/spectator-match";
import type { Match } from "@/lib/types";

describe("spectator-match", () => {
  it("redactMatchForSpectator replaces player names with jersey labels", () => {
    const match: Match = {
      id: "m1",
      namespaceId: "ns1",
      homeTeamId: "t1",
      awayTeamId: "t2",
      locationId: null,
      scheduledAt: null,
      status: "in_progress",
      servingTeam: "home",
      currentSet: 1,
      createdAt: "2026-01-01T00:00:00Z",
      homeTeam: {
        id: "t1",
        namespaceId: "ns1",
        name: "Eagles",
        createdAt: "2026-01-01T00:00:00Z",
        players: [{ id: "p1", teamId: "t1", name: "Alice Secret", jerseyNumber: 7, role: null }],
      },
      rotations: [
        {
          id: "r1",
          matchId: "m1",
          teamId: "t1",
          setNumber: 1,
          position: 1,
          playerId: "p1",
          player: { id: "p1", teamId: "t1", name: "Alice Secret", jerseyNumber: 7, role: null },
        },
      ],
    };

    const redacted = redactMatchForSpectator(match);
    expect(redacted.homeTeam?.players?.[0]?.name).toBe("#7");
    expect(redacted.rotations?.[0]?.player?.name).toBe("#7");
    expect(redacted.homeTeam?.name).toBe("Eagles");
  });
});
