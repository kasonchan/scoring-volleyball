import { Rally } from "./types";

export function isRallyInProgress(
  rallies: Rally[],
  homeScore: number,
  awayScore: number
): boolean {
  if (rallies.length === 0) return false;
  const latest = rallies[rallies.length - 1];
  return latest.homeScore === homeScore && latest.awayScore === awayScore;
}

export function needsRallyStart(
  rallies: Rally[],
  homeScore: number,
  awayScore: number
): boolean {
  return !isRallyInProgress(rallies, homeScore, awayScore);
}
