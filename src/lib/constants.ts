/** Default namespace slug; keep free of DB imports (used by next.config). */
export const DEFAULT_NAMESPACE_SLUG = "global";

/** Public namespace slug (open league / tournament scoring). */
export const PUBLIC_NAMESPACE_SLUG = "public";

/** Namespace all users are auto-joined to on signup and session sync. */
export const AUTO_JOIN_NAMESPACE_SLUG = PUBLIC_NAMESPACE_SLUG;

/** Legacy Haikyu namespace slug (optional separate league). */
export const HAIKYU_NAMESPACE_SLUG = "haikyu";

/** HTTP header sent by the client to scope API requests to a namespace. */
export const NAMESPACE_SLUG_HEADER = "x-namespace-slug";
