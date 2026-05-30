"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { Team, PLAYER_ROLE_LABELS } from "@/lib/types";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then(setTeams)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete team "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    setTeams((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <PageHeader
          title="Teams"
          description="Manage team rosters created for scoring."
          action={
            <Link href="/admin/teams/new">
              <Button>+ New Team</Button>
            </Link>
          }
        />

        {loading ? (
          <p className="text-slate-500">Loading teams...</p>
        ) : teams.length === 0 ? (
          <Card className="text-center">
            <p className="text-slate-600">No teams yet.</p>
            <Link href="/admin/teams/new" className="mt-4 inline-block">
              <Button>Create your first team</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <Card key={team.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{team.name}</h2>
                    <Badge color="blue">{team.players?.length ?? 0} players</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/teams/${team.id}/edit`}>
                      <Button variant="secondary">Edit</Button>
                    </Link>
                    <Button variant="danger" onClick={() => handleDelete(team.id, team.name)}>
                      Delete
                    </Button>
                  </div>
                </div>
                {team.players && team.players.length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {team.players.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                          {p.jerseyNumber}
                        </span>
                        <span className="text-slate-800">{p.name}</span>
                        {p.role && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                            {PLAYER_ROLE_LABELS[p.role]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to Admin
          </Link>
        </div>
      </main>
    </>
  );
}
