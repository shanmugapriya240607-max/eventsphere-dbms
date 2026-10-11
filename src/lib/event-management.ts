import { db, pool } from "@/db";
import { attendance, eventSchedules, events, registrations, venues } from "@/db/schema";
import { makeId } from "./security";
import { validateId, ValidationError } from "./validation";
import { eq, sql } from "drizzle-orm";

export class ManagementError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "ManagementError";
  }
}

function required(input: unknown, label: string, max = 180) {
  if (typeof input !== "string" || !input.trim()) throw new ValidationError(`${label} is required.`);
  const value = input.trim();
  if (value.length > max) throw new ValidationError(`${label} is too long.`);
  return value;
}

export function validateVenueInput(input: Record<string, unknown>) {
  const capacity = Number(input.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) throw new ValidationError("Venue capacity must be between 1 and 100000.");
  const status = required(input.status ?? "available", "Venue status", 20);
  if (!["available", "maintenance", "inactive"].includes(status)) throw new ValidationError("Select a valid venue status.");
  return { name: required(input.name, "Venue name", 120), location: required(input.location, "Location"), capacity, status };
}

export async function saveVenue(input: Record<string, unknown>) {
  const values = validateVenueInput(input);
  const id = input.id ? validateId(input.id, "Venue ID") : makeId("venue");
  try {
    if (input.id) await db.update(venues).set(values).where(eq(venues.id, id));
    else await db.insert(venues).values({ id, ...values });
  } catch {
    throw new ManagementError("Could not save venue. Venue names must be unique.", 409);
  }
  return { id, ...values };
}

export async function deleteVenue(rawId: unknown) {
  const id = validateId(rawId, "Venue ID");
  try {
    await db.delete(venues).where(eq(venues.id, id));
  } catch {
    throw new ManagementError("This venue is allocated to an event or schedule and cannot be deleted.", 409);
  }
  return { id };
}

export function validateScheduleInput(input: Record<string, unknown>) {
  const eventId = validateId(input.eventId, "Event ID");
  const venueId = validateId(input.venueId, "Venue ID");
  const scheduleDate = required(input.scheduleDate, "Schedule date", 10);
  const startTime = required(input.startTime, "Start time", 8);
  const endTime = required(input.endTime, "End time", 8);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)) throw new ValidationError("Schedule date is invalid.");
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(startTime) || !/^\d{2}:\d{2}(:\d{2})?$/.test(endTime)) throw new ValidationError("Schedule times are invalid.");
  if (startTime >= endTime) throw new ValidationError("End time must be after start time.");
  return { eventId, venueId, scheduleDate, startTime, endTime };
}

export async function saveSchedule(input: Record<string, unknown>) {
  const values = validateScheduleInput(input);
  const id = input.id ? validateId(input.id, "Schedule ID") : makeId("schedule");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (input.id) {
      await connection.execute(
        "UPDATE event_schedules SET event_id = ?, venue_id = ?, schedule_date = ?, start_time = ?, end_time = ? WHERE id = ?",
        [values.eventId, values.venueId, values.scheduleDate, values.startTime, values.endTime, id],
      );
    } else {
      await connection.execute(
        "INSERT INTO event_schedules (id, event_id, venue_id, schedule_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)",
        [id, values.eventId, values.venueId, values.scheduleDate, values.startTime, values.endTime],
      );
    }
    const [venue] = await db.select().from(venues).where(eq(venues.id, values.venueId)).limit(1);
    if (!venue) throw new ManagementError("Venue not found.", 404);
    await connection.execute("UPDATE events SET venue_id = ?, venue = ?, event_date = ?, start_time = ? WHERE id = ?", [values.venueId, venue.name, values.scheduleDate, values.startTime.slice(0, 5), values.eventId]);
    await connection.commit();
    return { id, ...values };
  } catch (error) {
    await connection.rollback();
    if (error instanceof ManagementError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Venue is already booked")) throw new ManagementError("Schedule conflict: this venue is already booked during the selected time.", 409);
    throw new ManagementError("Could not save schedule. Check the event, venue, date, and time values.", 409);
  } finally {
    connection.release();
  }
}

export async function deleteSchedule(rawId: unknown) {
  const id = validateId(rawId, "Schedule ID");
  await db.delete(eventSchedules).where(eq(eventSchedules.id, id));
  return { id };
}

export async function markAttendance(adminId: string, rawRegistrationId: unknown, rawStatus: unknown) {
  const registrationId = validateId(rawRegistrationId, "Registration ID");
  if (rawStatus !== "present" && rawStatus !== "absent") throw new ValidationError("Attendance status must be present or absent.");
  const [registration] = await db.select().from(registrations).where(eq(registrations.id, registrationId)).limit(1);
  if (!registration) throw new ManagementError("Registration not found.", 404);
  if (registration.status !== "approved") throw new ManagementError("Attendance can only be marked for approved registrations.", 409);
  const id = makeId("attendance");
  await db.insert(attendance).values({ id, registrationId, markedBy: adminId, status: rawStatus })
    .onDuplicateKeyUpdate({ set: { markedBy: adminId, status: rawStatus, markedAt: sql`CURRENT_TIMESTAMP` } });
  await db.update(registrations).set({ checkedIn: rawStatus === "present" }).where(eq(registrations.id, registrationId));
  return { registrationId, status: rawStatus };
}
