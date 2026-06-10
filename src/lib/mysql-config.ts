import fs from "fs";
import path from "path";
import type { PoolOptions } from "mysql2/promise";

function buildSslOptions(): PoolOptions["ssl"] | undefined {
  const sslFlag = (process.env.MYSQL_SSL ?? "").toLowerCase();
  if (sslFlag !== "1" && sslFlag !== "true") return undefined;

  const caPath = process.env.MYSQL_SSL_CA?.trim();
  if (caPath) {
    const resolved = path.isAbsolute(caPath) ? caPath : path.join(process.cwd(), caPath);
    if (fs.existsSync(resolved)) {
      return {
        ca: fs.readFileSync(resolved),
        rejectUnauthorized: true,
      };
    }
  }

  // Managed providers (e.g. DigitalOcean) often use a CA chain Node does not trust
  // unless MYSQL_SSL_CA is provided. Default to allowing the connection with TLS.
  const rejectUnauthorized =
    (process.env.MYSQL_SSL_REJECT_UNAUTHORIZED ?? "false").toLowerCase() === "true";

  return { rejectUnauthorized };
}

/** MySQL connection settings (VPC private host, managed DB, or local). */
export function getMysqlPoolOptions(): PoolOptions {
  const host =
    process.env.MYSQL_HOST ?? process.env.DATABASE_HOST ?? "127.0.0.1";
  const port = Number(
    process.env.MYSQL_PORT ?? process.env.DATABASE_PORT ?? 3306
  );
  const user = process.env.MYSQL_USER ?? process.env.DATABASE_USER ?? "root";
  const password =
    process.env.MYSQL_PASSWORD ?? process.env.DATABASE_PASSWORD ?? "";
  const database =
    process.env.MYSQL_DATABASE ?? process.env.DATABASE_NAME ?? "volleyball";

  const ssl = buildSslOptions();

  return {
    host,
    port,
    user,
    password,
    database,
    ssl,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE ?? 10),
    connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT ?? 30_000),
    timezone: "Z",
    dateStrings: true,
  };
}
