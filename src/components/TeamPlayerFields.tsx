"use client";

import { Button } from "@/components/ui";
import { PLAYER_ROLE_LABELS, PlayerRole } from "@/lib/types";

export interface PlayerRow {
  id?: string;
  name: string;
  jerseyNumber: string;
  role: PlayerRole | null;
}

export const emptyPlayerRow = (): PlayerRow => ({
  name: "",
  jerseyNumber: "",
  role: null,
});

const EXCLUSIVE_ROLES: PlayerRole[] = ["team_captain", "game_captain"];

interface TeamPlayerFieldsProps {
  players: PlayerRow[];
  onChange: (players: PlayerRow[]) => void;
}

export function TeamPlayerFields({ players, onChange }: TeamPlayerFieldsProps) {
  function addPlayer() {
    onChange([...players, emptyPlayerRow()]);
  }

  function removePlayer(index: number) {
    onChange(players.filter((_, i) => i !== index));
  }

  function updatePlayer(index: number, field: keyof PlayerRow, value: string) {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function updateRole(index: number, role: PlayerRole | null) {
    const updated = players.map((p) => ({ ...p }));
    if (role && EXCLUSIVE_ROLES.includes(role)) {
      for (let i = 0; i < updated.length; i++) {
        if (i !== index && updated[i].role === role) {
          updated[i] = { ...updated[i], role: null };
        }
      }
    }
    updated[index] = { ...updated[index], role };
    onChange(updated);
  }

  function isRoleTaken(role: PlayerRole, currentIndex: number) {
    if (!EXCLUSIVE_ROLES.includes(role)) return false;
    return players.some((p, i) => i !== currentIndex && p.role === role);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">Players</label>
        <Button type="button" variant="secondary" onClick={addPlayer}>
          + Add Player
        </Button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Assign one Team Captain and one Game Captain per team. Multiple players can be Libero.
      </p>
      <div className="space-y-3">
        {players.map((player, index) => (
          <div key={player.id ?? index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={player.name}
              onChange={(e) => updatePlayer(index, "name", e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Player name"
            />
            <input
              type="number"
              min="0"
              max="99"
              value={player.jerseyNumber}
              onChange={(e) => updatePlayer(index, "jerseyNumber", e.target.value)}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="#"
            />
            <select
              value={player.role ?? ""}
              onChange={(e) =>
                updateRole(index, e.target.value ? (e.target.value as PlayerRole) : null)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none sm:w-40"
            >
              <option value=""></option>
              {(Object.keys(PLAYER_ROLE_LABELS) as PlayerRole[]).map((role) => (
                <option key={role} value={role} disabled={isRoleTaken(role, index)}>
                  {PLAYER_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            {players.length > 1 && (
              <button
                type="button"
                onClick={() => removePlayer(index)}
                className="rounded-lg px-2 text-slate-400 hover:bg-red-50 hover:text-red-500 sm:self-center"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function playerRowsToPayload(players: PlayerRow[]) {
  return players
    .filter((p) => p.name.trim())
    .map((p) => ({
      ...(p.id ? { id: p.id } : {}),
      name: p.name.trim(),
      jerseyNumber: parseInt(p.jerseyNumber, 10),
      role: p.role,
    }));
}
