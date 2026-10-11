import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required. Copy .env.template to .env.local and set MySQL credentials.");

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/";
  const connection = await mysql.createConnection({ uri: adminUrl.toString(), multipleStatements: true });
  try {
    const schema = await readFile(path.join(process.cwd(), "database", "schema.sql"), "utf8");
    for (const statement of schema.split(/^-- statement\s*$/m).map((part) => part.trim()).filter(Boolean)) {
      await connection.query(statement);
    }
    const seed = await readFile(path.join(process.cwd(), "database", "seed.sql"), "utf8");
    await connection.query(seed);
    const [rows] = await connection.query("SELECT COUNT(*) AS eventCount FROM events");
    console.log("EventSphere MySQL schema and seed completed:", rows);
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database initialization failed.");
  process.exitCode = 1;
});
