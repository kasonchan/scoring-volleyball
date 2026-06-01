import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { namespaceAppPath } from "@/lib/namespace-paths";

interface NavProps {
  namespaceSlug?: string;
  namespaceName?: string;
}

export function Nav({ namespaceSlug, namespaceName }: NavProps = {}) {
  const inNamespace = Boolean(namespaceSlug);
  const base = namespaceSlug ? namespaceAppPath(namespaceSlug) : "";

  const adminHref = inNamespace ? `${base}/admin` : "/";
  const scorerHref = inNamespace ? `${base}/scorer` : "/";
  const refereeHref = inNamespace ? `${base}/referee` : "/";
  const spectatorHref = inNamespace ? `${base}/spectator` : "/";

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={inNamespace ? base : "/"} className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white text-sm">
            VB
          </span>
          <span>
            Volleyball Scoring
            {namespaceName ? (
              <span className="ml-2 font-normal text-slate-500">· {namespaceName}</span>
            ) : null}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {inNamespace ? (
            <nav className="flex items-center gap-1">
              <Link
                href={adminHref}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Admin
              </Link>
              <Link
                href={scorerHref}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Scorer
              </Link>
              <Link
                href={refereeHref}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Referee
              </Link>
              <Link
                href={spectatorHref}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Spectator
              </Link>
            </nav>
          ) : (
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Home
            </Link>
          )}
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
