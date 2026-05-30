"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Button, Card, PageHeader } from "@/components/ui";

interface PlayerRow {
  name: string;
  jerseyNumber: string;
}

export default function NewTeamPage() {
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([
    { name: "", jerseyNumber: "" },
    { name: "", jerseyNumber: "" },
    { name: "", jerseyNumber: "" },
    { name: "", jerseyNumber: "" },
    { name: "", jerseyNumber: "" },
    { name: "", jerseyNumber: "" },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function addPlayer() {
    setPlayers([...players, { name: "", jerseyNumber: "" }]);
  }

  function removePlayer(index: number) {
    setPlayers(players.filter((_, i) => i !== index));
  }

  function updatePlayer(index: number, field: keyof PlayerRow, value: string) {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validPlayers = players
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        jerseyNumber: parseInt(p.jerseyNumber, 10),
      }));

    if (validPlayers.some((p) => isNaN(p.jerseyNumber))) {
      setError("All players must have a valid jersey number");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, players: validPlayers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = "/admin/teams";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
        <PageHeader
          title="Create Team"
          description="Enter the team name and roster with jersey numbers."
        />

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Team Name</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g. Thunder Volleyball"
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Players</label>
                <Button type="button" variant="secondary" onClick={addPlayer}>
                  + Add Player
                </Button>
              </div>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <div key={index} className="flex gap-3">
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
                    {players.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlayer(index)}
                        className="rounded-lg px-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Team"}
              </Button>
              <Link href="/admin/teams">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </main>
    </>
  );
}
