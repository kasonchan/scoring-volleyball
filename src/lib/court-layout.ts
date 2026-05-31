import { Match, ServingTeam } from "./types";

export const LEFT_COURT_POSITIONS = [5, 4, 6, 3, 1, 2] as const;
export const RIGHT_COURT_POSITIONS = [2, 1, 3, 6, 4, 5] as const;

export type CourtTeamConfig = {
  team: ServingTeam;
  side: "left" | "right";
  teamId: string;
  teamName: string;
  color: "blue" | "teal";
  serving: boolean;
};

export function getCourtSwappedForMatch(m: Match): boolean {
  return m.sets?.find((s) => s.setNumber === m.currentSet)?.courtSwapped ?? false;
}

export function getCourtTeams(
  match: Match,
  courtSwapped: boolean
): readonly [CourtTeamConfig, CourtTeamConfig] {
  if (courtSwapped) {
    return [
      {
        team: "away",
        side: "left",
        teamId: match.awayTeamId,
        teamName: match.awayTeam?.name ?? "Away",
        color: "teal",
        serving: match.servingTeam === "away",
      },
      {
        team: "home",
        side: "right",
        teamId: match.homeTeamId,
        teamName: match.homeTeam?.name ?? "Home",
        color: "blue",
        serving: match.servingTeam === "home",
      },
    ] as const;
  }

  return [
    {
      team: "home",
      side: "left",
      teamId: match.homeTeamId,
      teamName: match.homeTeam?.name ?? "Home",
      color: "blue",
      serving: match.servingTeam === "home",
    },
    {
      team: "away",
      side: "right",
      teamId: match.awayTeamId,
      teamName: match.awayTeam?.name ?? "Away",
      color: "teal",
      serving: match.servingTeam === "away",
    },
  ] as const;
}
