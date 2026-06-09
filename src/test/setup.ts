import "./mock-cookies";
import fs from "fs";
import path from "path";

process.env.SESSION_SECRET = "test-session-secret";

/** Load `.env.test` (gitignored) so local `npm test` can use shared DB credentials. */
function loadEnvTest(): void {
  const file = path.join(process.cwd(), ".env.test");
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvTest();

// Defaults when not set (e.g. CI uses workflow env; local uses .env.test or these)
process.env.MYSQL_HOST ??=
  "db-mysql-lon1-00139-do-user-364407-0.j.db.ondigitalocean.com";
process.env.MYSQL_PORT ??= "25060";
process.env.MYSQL_USER ??= "doadmin";
process.env.MYSQL_PASSWORD ??= "";
process.env.MYSQL_DATABASE ??= "defaultdb";
process.env.MYSQL_SSL ??= "true";
process.env.MYSQL_SSL_REJECT_UNAUTHORIZED ??= "false";
