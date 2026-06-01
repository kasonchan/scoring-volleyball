import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white text-sm">
            VB
          </span>
          Volleyball Scoring
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/admin"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Admin
          </Link>
          <Link
            href="/scorer"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Scorer
          </Link>
          <Link
            href="/referee"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Referee
          </Link>
          <Link
            href="/spectator"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Spectator
          </Link>
        </nav>
      </div>
    </header>
  );
}
