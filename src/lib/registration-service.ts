import { pool } from "@/db";
import { makeId } from "./security";
import { validateId } from "./validation";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export class RegistrationError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "RegistrationError";
  }
}

type EventLockRow = RowDataPacket & { id: string; available_seats: number; status: string; registration_deadline: string };
type RegistrationLockRow = RowDataPacket & { id: string; status: string; event_id: string; user_id: string };

export async function createRegistration(userId: string, rawEventId: unknown) {
  const eventId = validateId(rawEventId, "Event ID");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [eventRows] = await connection.query<EventLockRow[]>(
      "SELECT id, available_seats, status, registration_deadline FROM events WHERE id = ? FOR UPDATE",
      [eventId],
    );
    const event = eventRows[0];
    if (!event) throw new RegistrationError("Event not found.", 404);
    if (!["open", "featured"].includes(event.status)) throw new RegistrationError("Registration is closed for this event.", 409);
    if (String(event.registration_deadline) < new Date().toISOString().slice(0, 10)) {
      throw new RegistrationError("The registration deadline has passed.", 409);
    }

    const [existingRows] = await connection.query<RegistrationLockRow[]>(
      "SELECT id, status, event_id, user_id FROM registrations WHERE user_id = ? AND event_id = ? FOR UPDATE",
      [userId, eventId],
    );
    const existing = existingRows[0];
    if (existing && existing.status !== "cancelled" && existing.status !== "rejected") {
      throw new RegistrationError("You are already registered for this event.", 409);
    }
    if (event.available_seats < 1) throw new RegistrationError("This event is full.", 409);

    const id = existing?.id ?? makeId("reg");
    if (existing) {
      await connection.execute(
        "UPDATE registrations SET status = 'pending', checked_in = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id],
      );
    } else {
      const confirmationCode = `ES-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
      await connection.execute(
        "INSERT INTO registrations (id, user_id, event_id, status, confirmation_code) VALUES (?, ?, ?, 'pending', ?)",
        [id, userId, eventId, confirmationCode],
      );
    }
    await connection.execute("UPDATE events SET available_seats = available_seats - 1 WHERE id = ?", [eventId]);
    await connection.commit();
    return { id, eventId, status: "pending" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelRegistration(userId: string, rawRegistrationId: unknown) {
  const registrationId = validateId(rawRegistrationId, "Registration ID");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RegistrationLockRow[]>(
      "SELECT id, status, event_id, user_id FROM registrations WHERE id = ? FOR UPDATE",
      [registrationId],
    );
    const registration = rows[0];
    if (!registration || registration.user_id !== userId) throw new RegistrationError("Registration not found.", 404);
    if (registration.status === "cancelled" || registration.status === "rejected") {
      throw new RegistrationError("This registration is already inactive.", 409);
    }
    await connection.execute("UPDATE events SET available_seats = available_seats + 1 WHERE id = ?", [registration.event_id]);
    await connection.execute(
      "UPDATE registrations SET status = 'cancelled', checked_in = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [registrationId],
    );
    await connection.commit();
    return { id: registrationId, status: "cancelled" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setRegistrationStatus(rawRegistrationId: unknown, rawStatus: unknown) {
  const registrationId = validateId(rawRegistrationId, "Registration ID");
  if (rawStatus !== "approved" && rawStatus !== "rejected") throw new RegistrationError("Invalid registration status.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RegistrationLockRow[]>(
      "SELECT id, status, event_id, user_id FROM registrations WHERE id = ? FOR UPDATE",
      [registrationId],
    );
    const registration = rows[0];
    if (!registration) throw new RegistrationError("Registration not found.", 404);
    if (registration.status === "cancelled") throw new RegistrationError("Cancelled registrations must be resubmitted by the student.", 409);
    if (registration.status !== "rejected" && rawStatus === "rejected") {
      await connection.execute("UPDATE events SET available_seats = available_seats + 1 WHERE id = ?", [registration.event_id]);
    } else if (registration.status === "rejected" && rawStatus === "approved") {
      const [result] = await connection.execute<ResultSetHeader>(
        "UPDATE events SET available_seats = available_seats - 1 WHERE id = ? AND available_seats > 0",
        [registration.event_id],
      );
      if (result.affectedRows !== 1) throw new RegistrationError("This event is full.", 409);
    }
    await connection.execute("UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [rawStatus, registrationId]);
    await connection.commit();
    return { id: registrationId, status: rawStatus };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
