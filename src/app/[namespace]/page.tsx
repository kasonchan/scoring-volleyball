import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { namespaceAppPath } from "@/lib/namespace-paths";
import { getNamespaceBySlug } from "@/lib/namespaces";

export default async function NamespaceHomePage({
  params,
}: {
  params: Promise<{ namespace: string }>;
}) {
  const { namespace: slug } = await params;
  const ns = getNamespaceBySlug(slug);
  if (!ns) notFound();

  const base = namespaceAppPath(slug);

  return (
    <>
      <Nav namespaceSlug={slug} namespaceName={ns.name} />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {ns.name}
          </h1>
          {ns.description ? (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{ns.description}</p>
          ) : (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Volleyball scoring for this league or tournament.
            </p>
          )}
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`${base}/admin`} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Admin</h2>
              <p className="mt-2 text-slate-600">
                Create teams with players and jersey numbers, then schedule matches between teams.
              </p>
            </Card>
          </Link>

          <Link href={`${base}/scorer`} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Scorer</h2>
              <p className="mt-2 text-slate-600">
                Select a match, set team rotations, and enter live scores during the game.
              </p>
            </Card>
          </Link>

          <Link href={`${base}/referee`} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Referee</h2>
              <p className="mt-2 text-slate-600">
                Connect to a live match for a read-only court and score view.
              </p>
            </Card>
          </Link>

          <Link href={`${base}/spectator`} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Spectator</h2>
              <p className="mt-2 text-slate-600">
                Watch any match live with the full scorer view — read-only.
              </p>
            </Card>
          </Link>
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          <Link href="/" className="text-orange-600 hover:underline">
            ← All namespaces
          </Link>
        </p>
      </main>
    </>
  );
}
