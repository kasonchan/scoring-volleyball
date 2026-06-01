import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { namespaceAppPath } from "@/lib/namespace-paths";
import {
  DEFAULT_NAMESPACE_SLUG,
  getDefaultNamespace,
  getNamespacesForHomepage,
} from "@/lib/namespaces";

export const dynamic = "force-dynamic";

export default function Home() {
  const namespaces = getNamespacesForHomepage();
  const defaultNamespace = getDefaultNamespace();
  const defaultHref = namespaceAppPath(DEFAULT_NAMESPACE_SLUG);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-12">
        {defaultNamespace ? (
          <div className="mb-8 flex justify-center">
            <Link
              href={defaultHref}
              className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-700"
            >
              Open {defaultNamespace.name} scoring
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : null}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Volleyball Online Scoring
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Manage teams, schedule matches, and score live games with rotation tracking — organized
            by namespace for each league or tournament.
          </p>
        </div>

        <section className="mx-auto mb-16 max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">What you can do</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <h3 className="font-semibold text-slate-900">Admin</h3>
              <p className="mt-2 text-sm text-slate-600">
                Create teams with players and jersey numbers, add venues, and schedule matches
                between teams.
              </p>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900">Scorer</h3>
              <p className="mt-2 text-sm text-slate-600">
                Select a match, set rotations, and run live scoring — points, subs, timeouts, libero
                changes, and unified set history.
              </p>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900">Referee</h3>
              <p className="mt-2 text-sm text-slate-600">
                Connect to a live match for a read-only court and scoreboard, with optional
                fit-screen layout and team-side swap for viewing.
              </p>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900">Spectator</h3>
              <p className="mt-2 text-sm text-slate-600">
                Watch any match with the full live view — rosters, court, scoreboard, and set
                history — read-only.
              </p>
            </Card>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Each namespace includes Admin, Scorer, Referee, and Spectator. Pick a namespace below
            to get started.
          </p>
        </section>

        <section>
          <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Namespaces</h2>
          {namespaces.length === 0 ? (
            <p className="text-center text-slate-500">No namespaces configured yet.</p>
          ) : (
            <div className="mx-auto grid max-w-3xl gap-4">
              {namespaces.map((ns) => (
                <Link key={ns.id} href={namespaceAppPath(ns.slug)} className="group">
                  <Card className="transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 group-hover:text-orange-600">
                          {ns.name}
                          {ns.slug === DEFAULT_NAMESPACE_SLUG ? (
                            <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                              Default
                            </span>
                          ) : null}
                        </h3>
                        {ns.description ? (
                          <p className="mt-1 text-slate-600">{ns.description}</p>
                        ) : (
                          <p className="mt-1 text-slate-500">/{ns.slug}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-orange-600 group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
