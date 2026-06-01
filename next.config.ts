import type { NextConfig } from "next";
import { HAIKYU_NAMESPACE_SLUG } from "./src/lib/constants";

const haikyu = HAIKYU_NAMESPACE_SLUG;

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  async redirects() {
    const legacyPaths = ["admin", "scorer", "referee", "spectator"];
    const appRedirects = legacyPaths.flatMap((section) => [
      {
        source: `/${section}`,
        destination: `/${haikyu}/${section}`,
        permanent: false,
      },
      {
        source: `/${section}/:path*`,
        destination: `/${haikyu}/${section}/:path*`,
        permanent: false,
      },
    ]);
    const apiRedirects = ["teams", "matches", "locations"].flatMap((resource) => [
      {
        source: `/api/${resource}`,
        destination: `/api/${haikyu}/${resource}`,
        permanent: false,
      },
      {
        source: `/api/${resource}/:path*`,
        destination: `/api/${haikyu}/${resource}/:path*`,
        permanent: false,
      },
    ]);
    return [...appRedirects, ...apiRedirects];
  },
};

export default nextConfig;
