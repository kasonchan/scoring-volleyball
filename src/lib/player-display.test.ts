import { describe, expect, it } from "vitest";
import {
  isJerseyOnlyDisplayName,
  playerCourtNameLine,
  playerOptionLabel,
} from "@/lib/player-display";
import type { Player } from "@/lib/types";

const player = (name: string, jerseyNumber: number): Player => ({
  id: "p1",
  teamId: "t1",
  name,
  jerseyNumber,
  role: null,
});

describe("player-display", () => {
  it("treats empty, numeric, and hash-prefixed names as jersey-only", () => {
    expect(isJerseyOnlyDisplayName("", 7)).toBe(true);
    expect(isJerseyOnlyDisplayName("7", 7)).toBe(true);
    expect(isJerseyOnlyDisplayName("#7", 7)).toBe(true);
    expect(isJerseyOnlyDisplayName("Alex", 7)).toBe(false);
  });

  it("playerCourtNameLine hides redundant labels", () => {
    expect(playerCourtNameLine(player("#12", 12))).toBe("");
    expect(playerCourtNameLine(player("Sam", 12))).toBe("Sam");
  });

  it("playerOptionLabel avoids duplicate jersey prefixes", () => {
    expect(playerOptionLabel(player("#12", 12))).toBe("#12");
    expect(playerOptionLabel(player("Sam", 12))).toBe("#12 Sam");
  });
});
