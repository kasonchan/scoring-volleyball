/** Default namespace slug; keep free of DB imports (used by next.config). */
export const DEFAULT_NAMESPACE_SLUG = "public";

/** Legacy Haikyu namespace slug (optional separate league). */
export const HAIKYU_NAMESPACE_SLUG = "haikyu";

/** HTTP header sent by the client to scope API requests to a namespace. */
export const NAMESPACE_SLUG_HEADER = "x-namespace-slug";
