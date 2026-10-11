import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required (example: mysql://eventsphere:change_me@127.0.0.1:3306/eventsphere_db)");
}

const globalForDb = globalThis as typeof globalThis & {
  __eventSphereMySqlPool?: mysql.Pool;
};

export const pool = globalForDb.__eventSphereMySqlPool ?? mysql.createPool({
  uri: databaseUrl,
  connectionLimit: 10,
  enableKeepAlive: true,
  timezone: "Z",
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__eventSphereMySqlPool = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });
