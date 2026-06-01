"use client";

import { useNamespacePaths } from "@/hooks/use-namespace";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NamespaceNav } from "@/components/NamespaceNav";
import {
  MatchFormFields,
  matchFormValuesToPayload,
  matchToFormValues,
} from "@/components/MatchFormFields";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { Location, Match, Team, formatMatchDateTime } from "@/lib/types";

export default function EditMatchPage() {
  const { api, app } = useNamespacePaths();
  const params = useParams();
  const matchId = params.id as string;
  const [teams, setTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [formValues, setFormValues] = useState(matchToFormValues({
    homeTeamId: "",
    awayTeamId: "",
    locationId: null,
    scheduledAt: null,
  }));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(api("/teams")).then((r) => r.json()),
      fetch(api("/locations")).then((r) => r.json()),
      fetch(api(`/matches/${matchId}`)).then((r) => {
        if (!r.ok) throw new Error("Match not found");
        return r.json();
      }),
    ])
      .then(([t, l, m]) => {
        setTeams(t);
        setLocations(l);
        setMatch(m);
        setFormValues(matchToFormValues(m));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [matchId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(api(`/matches/${matchId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matchFormValuesToPayload(formValues)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = "/admin/matches";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update match");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <NamespaceNav />
        <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
          <p className="text-slate-500">Loading match...</p>
        </main>
      </>
    );
  }

  if (!match) {
    return (
      <>
        <NamespaceNav />
        <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
          <p className="text-red-600">{error || "Match not found"}</p>
          <Link href={app("/admin/matches")} className="mt-4 inline-block text-orange-600 hover:underline">
            ← Back to matches
          </Link>
        </main>
      </>
    );
  }

  const canEdit = match.status === "scheduled";

  return (
    <>
      <NamespaceNav />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
        <PageHeader
          title="Edit Match"
          description="Update teams, location, and date/time for this match."
        />

        <Card>
          {!canEdit ? (
            <div>
              <p className="text-slate-600">
                This match cannot be edited because scoring has already started.
              </p>
              <div className="mt-3">
                <Badge color="orange">{match.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                {match.homeTeam?.name} vs {match.awayTeam?.name}
              </p>
              {formatMatchDateTime(match.scheduledAt) && (
                <p className="mt-1 text-sm text-slate-500">
                  {formatMatchDateTime(match.scheduledAt)}
                </p>
              )}
              {match.location && (
                <p className="mt-1 text-sm text-slate-500">{match.location.name}</p>
              )}
              <Link href={app("/admin/matches")} className="mt-6 inline-block">
                <Button variant="secondary">Back to Matches</Button>
              </Link>
            </div>
          ) : teams.length < 2 ? (
            <p className="text-slate-600">
              You need at least 2 teams.{" "}
              <Link href={app("/admin/teams/new")} className="text-orange-600 hover:underline">
                Create teams first
              </Link>
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <MatchFormFields
                teams={teams}
                locations={locations}
                values={formValues}
                onChange={setFormValues}
              />

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Link href={app("/admin/matches")}>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </Card>
      </main>
    </>
  );
}
