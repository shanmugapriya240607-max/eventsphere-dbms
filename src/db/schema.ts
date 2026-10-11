import {
  boolean,
  date,
  datetime,
  index,
  int,
  mysqlTable,
  text,
  time,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 40 }).primaryKey(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    registerNumber: varchar("register_number", { length: 40 }),
    collegeName: varchar("college_name", { length: 160 }),
    department: varchar("department", { length: 100 }),
    yearOfStudy: int("year_of_study"),
    email: varchar("email", { length: 190 }).notNull(),
    mobileNumber: varchar("mobile_number", { length: 25 }),
    gender: varchar("gender", { length: 30 }),
    city: varchar("city", { length: 100 }),
    profilePhoto: varchar("profile_photo", { length: 500 }),
    emergencyContact: varchar("emergency_contact", { length: 25 }),
    foodPreference: varchar("food_preference", { length: 30 }),
    accommodationRequired: boolean("accommodation_required").default(false).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).default("student").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    verificationToken: varchar("verification_token", { length: 100 }),
    resetToken: varchar("reset_token", { length: 100 }),
    createdAt: datetime("created_at", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    registerIdx: uniqueIndex("users_register_number_idx").on(table.registerNumber),
  }),
);

export const venues = mysqlTable("venues", {
  id: varchar("id", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  location: varchar("location", { length: 180 }).notNull(),
  capacity: int("capacity").notNull(),
  status: varchar("status", { length: 20 }).default("available").notNull(),
}, (table) => ({ nameIdx: uniqueIndex("venues_name").on(table.name) }));

export const events = mysqlTable(
  "events",
  {
    id: varchar("id", { length: 40 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    description: text("description").notNull(),
    eventDate: date("event_date", { mode: "string" }).notNull(),
    startTime: varchar("start_time", { length: 20 }).notNull(),
    venue: varchar("venue", { length: 120 }).notNull(),
    venueId: varchar("venue_id", { length: 40 }).references(() => venues.id, { onDelete: "restrict" }),
    registrationDeadline: date("registration_deadline", { mode: "string" }).notNull(),
    availableSeats: int("available_seats").default(100).notNull(),
    rules: text("rules").notNull(),
    facultyCoordinator: varchar("faculty_coordinator", { length: 120 }).notNull(),
    studentCoordinator: varchar("student_coordinator", { length: 120 }).notNull(),
    prizeDetails: text("prize_details").notNull(),
    posterUrl: varchar("poster_url", { length: 500 }).notNull(),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    createdAt: datetime("created_at", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("events_slug_idx").on(table.slug),
  }),
);

export const eventSchedules = mysqlTable("event_schedules", {
  id: varchar("id", { length: 40 }).primaryKey(),
  eventId: varchar("event_id", { length: 40 }).notNull().references(() => events.id, { onDelete: "cascade" }),
  venueId: varchar("venue_id", { length: 40 }).notNull().references(() => venues.id, { onDelete: "restrict" }),
  scheduleDate: date("schedule_date", { mode: "string" }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
}, (table) => ({
  eventSlotIdx: uniqueIndex("uq_event_schedule").on(table.eventId, table.scheduleDate, table.startTime),
  venueSlotIdx: index("idx_schedule_venue_slot").on(table.venueId, table.scheduleDate, table.startTime, table.endTime),
}));

export const registrations = mysqlTable(
  "registrations",
  {
    id: varchar("id", { length: 40 }).primaryKey(),
    userId: varchar("user_id", { length: 40 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    eventId: varchar("event_id", { length: 40 }).notNull().references(() => events.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    confirmationCode: varchar("confirmation_code", { length: 40 }).notNull(),
    checkedIn: boolean("checked_in").default(false).notNull(),
    createdAt: datetime("created_at", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: datetime("updated_at", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    participantEventIdx: uniqueIndex("registrations_user_event_idx").on(table.userId, table.eventId),
  }),
);

export const attendance = mysqlTable("attendance", {
  id: varchar("id", { length: 40 }).primaryKey(),
  registrationId: varchar("registration_id", { length: 40 }).notNull().references(() => registrations.id, { onDelete: "cascade" }),
  markedBy: varchar("marked_by", { length: 40 }).notNull().references(() => users.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 20 }).notNull(),
  markedAt: datetime("marked_at", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({ registrationIdx: uniqueIndex("attendance_registration_id").on(table.registrationId) }));

export const announcements = mysqlTable("announcements", {
  id: varchar("id", { length: 40 }).primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  audience: varchar("audience", { length: 20 }).default("all").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal").notNull(),
  createdAt: datetime("created_at", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const certificates = mysqlTable("certificates", {
  id: varchar("id", { length: 40 }).primaryKey(),
  userId: varchar("user_id", { length: 40 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: varchar("event_id", { length: 40 }).notNull().references(() => events.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 40 }).default("Participation").notNull(),
  certificateNo: varchar("certificate_no", { length: 60 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  issuedAt: datetime("issued_at", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const coordinators = mysqlTable("coordinators", {
  id: varchar("id", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  role: varchar("role", { length: 60 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  email: varchar("email", { length: 190 }).notNull(),
  phone: varchar("phone", { length: 25 }).notNull(),
  eventId: varchar("event_id", { length: 40 }).references(() => events.id, { onDelete: "set null" }),
});

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type Coordinator = typeof coordinators.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type EventSchedule = typeof eventSchedules.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
