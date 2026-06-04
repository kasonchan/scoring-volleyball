import type { Player } from "@/lib/types";

/** True when the stored name adds no info beyond the jersey number. */
export function isJerseyOnlyDisplayName(name: string, jerseyNumber: number): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (trimmed === String(jerseyNumber)) return true;
  if (trimmed === `#${jerseyNumber}`) return true;
  return false;
}

export function playerJerseyLabel(jerseyNumber: number): string {
  return `#${jerseyNumber}`;
}

/** Second line on court cells — omit when redundant with the jersey line above. */
export function playerCourtNameLine(player: Player | undefined | null): string {
  if (!player) return "";
  if (isJerseyOnlyDisplayName(player.name, player.jerseyNumber)) return "";
  return player.name.trim();
}

/** Dropdown / list label: `#12 Alex` or `#12` when no distinct name. */
export function playerOptionLabel(player: Player): string {
  const name = playerCourtNameLine(player);
  return name
    ? `${playerJerseyLabel(player.jerseyNumber)} ${name}`
    : playerJerseyLabel(player.jerseyNumber);
}
