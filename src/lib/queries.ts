import { db } from "@/db";
import { announcements, attendance, certificates, coordinators, eventSchedules, events, registrations, users, venues } from "@/db/schema";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { ensureDatabase } from "./bootstrap";

export async function getSiteStats() {
  await ensureDatabase();
  const [stats] = await db
    .select({
      students: sql<number>`cast(count(distinct case when ${users.role} = 'student' then ${users.id} end) as unsigned)`,
      events: sql<number>`cast(count(distinct ${events.id}) as unsigned)`,
      registrations: sql<number>`cast(count(distinct ${registrations.id}) as unsigned)`,
      approved: sql<number>`cast(count(distinct case when ${registrations.status} = 'approved' then ${registrations.id} end) as unsigned)`,
    })
    .from(users)
    .leftJoin(registrations, eq(users.id, registrations.userId))
    .leftJoin(events, sql`true`);
  return stats ?? { students: 0, events: 0, registrations: 0, approved: 0 };
}

export async function getPublicEvents(search?: string, category?: string) {
  await ensureDatabase();
  const filters = [];
  if (search) filters.push(or(like(events.name, `%${search}%`), like(events.description, `%${search}%`)));
  if (category && category !== "All") filters.push(eq(events.category, category));
  return db
    .select()
    .from(events)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(events.eventDate), asc(events.startTime));
}

export async function getPublicPageData() {
  await ensureDatabase();
  const [stats, eventList, announcementList, coordinatorList] = await Promise.all([
    getSiteStats(),
    db.select().from(events).orderBy(asc(events.eventDate), asc(events.startTime)).limit(8),
    db.select().from(announcements).where(or(eq(announcements.audience, "all"), eq(announcements.audience, "students"))).orderBy(desc(announcements.createdAt)).limit(4),
    db.select().from(coordinators).orderBy(asc(coordinators.role)).limit(8),
  ]);
  return { stats, events: eventList, announcements: announcementList, coordinators: coordinatorList };
}

export async function getStudentDashboardData(userId: string) {
  await ensureDatabase();
  const [myRegistrations, allEvents, announcementList, certList] = await Promise.all([
    db
      .select({ registration: registrations, event: events })
      .from(registrations)
      .innerJoin(events, eq(events.id, registrations.eventId))
      .where(eq(registrations.userId, userId))
      .orderBy(desc(registrations.createdAt)),
    db.select().from(events).orderBy(asc(events.eventDate), asc(events.startTime)),
    db
      .select()
      .from(announcements)
      .where(or(eq(announcements.audience, "all"), eq(announcements.audience, "students")))
      .orderBy(desc(announcements.createdAt))
      .limit(8),
    db
      .select({ certificate: certificates, event: events })
      .from(certificates)
      .innerJoin(events, eq(events.id, certificates.eventId))
      .where(eq(certificates.userId, userId))
      .orderBy(desc(certificates.issuedAt)),
  ]);
  return { myRegistrations, allEvents, announcements: announcementList, certificates: certList };
}

export async function getAdminDashboardData(participantSearch?: string) {
  await ensureDatabase();
  const [stats] = await db
    .select({
      students: sql<number>`cast(count(distinct case when ${users.role} = 'student' then ${users.id} end) as unsigned)`,
      admins: sql<number>`cast(count(distinct case when ${users.role} = 'admin' then ${users.id} end) as unsigned)`,
      totalRegistrations: sql<number>`cast(count(distinct ${registrations.id}) as unsigned)`,
      pending: sql<number>`cast(count(distinct case when ${registrations.status} = 'pending' then ${registrations.id} end) as unsigned)`,
      approved: sql<number>`cast(count(distinct case when ${registrations.status} = 'approved' then ${registrations.id} end) as unsigned)`,
      rejected: sql<number>`cast(count(distinct case when ${registrations.status} = 'rejected' then ${registrations.id} end) as unsigned)`,
      present: sql<number>`cast(count(distinct case when ${attendance.status} = 'present' then ${attendance.id} end) as unsigned)`,
    })
    .from(users)
    .leftJoin(registrations, eq(users.id, registrations.userId))
    .leftJoin(attendance, eq(attendance.registrationId, registrations.id));

  const participantFilter = participantSearch
    ? and(eq(users.role, "student"), or(like(users.fullName, `%${participantSearch}%`), like(users.email, `%${participantSearch}%`), like(users.registerNumber, `%${participantSearch}%`), like(users.department, `%${participantSearch}%`)))
    : eq(users.role, "student");

  const [eventList, participantList, registrationList, announcementList, venueList, scheduleList, attendanceSummary] = await Promise.all([
    db.select().from(events).orderBy(asc(events.eventDate), asc(events.startTime)),
    db.select().from(users).where(participantFilter).orderBy(desc(users.createdAt)).limit(50),
    db
      .select({ registration: registrations, user: users, event: events, attendance })
      .from(registrations)
      .innerJoin(users, eq(users.id, registrations.userId))
      .innerJoin(events, eq(events.id, registrations.eventId))
      .leftJoin(attendance, eq(attendance.registrationId, registrations.id))
      .orderBy(desc(registrations.createdAt))
      .limit(80),
    db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(10),
    db.select().from(venues).orderBy(asc(venues.name)),
    db.select({ schedule: eventSchedules, event: events, venue: venues }).from(eventSchedules)
      .innerJoin(events, eq(events.id, eventSchedules.eventId)).innerJoin(venues, eq(venues.id, eventSchedules.venueId))
      .orderBy(asc(eventSchedules.scheduleDate), asc(eventSchedules.startTime)),
    db.select({
      eventId: events.id,
      eventName: events.name,
      registered: sql<number>`cast(count(distinct ${registrations.id}) as unsigned)`,
      marked: sql<number>`cast(count(distinct ${attendance.id}) as unsigned)`,
      present: sql<number>`cast(count(distinct case when ${attendance.status} = 'present' then ${attendance.id} end) as unsigned)`,
      absent: sql<number>`cast(count(distinct case when ${attendance.status} = 'absent' then ${attendance.id} end) as unsigned)`,
    }).from(events).leftJoin(registrations, eq(registrations.eventId, events.id))
      .leftJoin(attendance, eq(attendance.registrationId, registrations.id)).groupBy(events.id, events.name).orderBy(asc(events.name)),
  ]);

  return {
    stats: stats ?? { students: 0, admins: 0, totalRegistrations: 0, pending: 0, approved: 0, rejected: 0, present: 0 },
    events: eventList,
    participants: participantList,
    registrations: registrationList,
    announcements: announcementList,
    venues: venueList,
    schedules: scheduleList,
    attendanceSummary,
  };
}

export async function getRegistrationExportRows() {
  await ensureDatabase();
  return db
    .select({
      registrationId: registrations.id,
      confirmationCode: registrations.confirmationCode,
      status: registrations.status,
      registeredAt: registrations.createdAt,
      fullName: users.fullName,
      registerNumber: users.registerNumber,
      email: users.email,
      mobileNumber: users.mobileNumber,
      collegeName: users.collegeName,
      department: users.department,
      eventName: events.name,
      eventDate: events.eventDate,
      venue: events.venue,
    })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .orderBy(desc(registrations.createdAt));
}
