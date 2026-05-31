import { Player, Substitution } from "./types";

export function isSetLibero(player: Player, setLiberoIds: string[]): boolean {
  return player.role === "libero" || setLiberoIds.includes(player.id);
}

export function buildSubstitutionPartnerMap(substitutions: Substitution[]): Map<string, string> {
  const pairs = new Map<string, string>();
  for (const sub of substitutions) {
    pairs.set(sub.playerOutId, sub.playerInId);
    pairs.set(sub.playerInId, sub.playerOutId);
  }
  return pairs;
}

export function getAllowedSubstitutesIn(
  playerOutId: string,
  benchPlayers: Player[],
  substitutions: Substitution[],
  setLiberoIds: string[] = []
): Player[] {
  const partners = buildSubstitutionPartnerMap(substitutions);
  const partner = partners.get(playerOutId);
  if (partner) {
    const matched = benchPlayers.find((p) => p.id === partner);
    return matched ? [matched] : [];
  }
  return benchPlayers.filter((p) => !partners.has(p.id) && !isSetLibero(p, setLiberoIds));
}
