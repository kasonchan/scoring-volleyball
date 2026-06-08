import type { PoolOptions } from "mysql2/promise";

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

  const sslFlag = (process.env.MYSQL_SSL ?? "").toLowerCase();
  const ssl =
    sslFlag === "1" || sslFlag === "true"
      ? {
          rejectUnauthorized:
            (process.env.MYSQL_SSL_REJECT_UNAUTHORIZED ?? "true").toLowerCase() !==
            "false",
        }
      : undefined;

  return {
    host,
    port,
    user,
    password,
    database,
    ssl,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE ?? 10),
    timezone: "Z",
    dateStrings: true,
  };
}
