import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [databaseRows] = await connection.query<mysql.RowDataPacket[]>("SELECT DATABASE() AS databaseName");
    const databaseName = String(databaseRows[0]?.databaseName ?? "");
    if (databaseName !== "eventsphere_db") throw new Error(`Expected database eventsphere_db, received ${databaseName || "none"}.`);

    const [tables] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
      [databaseName],
    );
    const [foreignKeys] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ?",
      [databaseName],
    );
    const [triggers] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?",
      [databaseName],
    );
    const [indexes] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND INDEX_NAME <> 'PRIMARY' ORDER BY TABLE_NAME, INDEX_NAME",
      [databaseName],
    );
    const [eventRows] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS total FROM events");
    const [userRows] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS total FROM users");
    const [venueRows] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS total FROM venues");
    const [scheduleRows] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS total FROM event_schedules");

    let overlapRejected = false;
    try {
      await connection.query(
        "INSERT INTO event_schedules (id, event_id, venue_id, schedule_date, start_time, end_time) VALUES ('verify_overlap', 'evt_hackathon', 'venue_auditorium', '2026-11-14', '10:00:00', '11:00:00')",
      );
      await connection.query("DELETE FROM event_schedules WHERE id = 'verify_overlap'");
    } catch (error: unknown) {
      overlapRejected = error instanceof Error && error.message.includes("Venue is already booked");
    }

    if (!overlapRejected) throw new Error("Venue-overlap trigger did not reject a conflicting schedule.");

    console.log(JSON.stringify({
      database: databaseName,
      tables: tables.filter((row) => row.TABLE_TYPE === "BASE TABLE").map((row) => row.TABLE_NAME),
      views: tables.filter((row) => row.TABLE_TYPE === "VIEW").map((row) => row.TABLE_NAME),
      foreignKeys: Number(foreignKeys[0]?.total ?? 0),
      indexes: indexes.map((row) => `${row.TABLE_NAME}.${row.INDEX_NAME}`),
      triggers: triggers.map((row) => row.TRIGGER_NAME),
      overlapTriggerTest: "passed",
      seedCounts: {
        events: Number(eventRows[0]?.total ?? 0),
        users: Number(userRows[0]?.total ?? 0),
        venues: Number(venueRows[0]?.total ?? 0),
        schedules: Number(scheduleRows[0]?.total ?? 0),
      },
    }, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database verification failed.");
  process.exitCode = 1;
});
