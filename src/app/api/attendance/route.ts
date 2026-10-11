import { db } from "@/db";
import { attendance, events, registrations, users } from "@/db/schema";
import { getUserFromRequest } from "@/lib/auth";
import { ManagementError, markAttendance } from "@/lib/event-management";
import { ValidationError } from "@/lib/validation";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const rows = await db.select({ attendance, registration: registrations, participant: users, event: events }).from(attendance)
    .innerJoin(registrations, eq(registrations.id, attendance.registrationId))
    .innerJoin(users, eq(users.id, registrations.userId)).innerJoin(events, eq(events.id, registrations.eventId))
    .orderBy(desc(attendance.markedAt));
  return NextResponse.json({ attendance: rows });
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const body = await request.json();
    return NextResponse.json({ attendance: await markAttendance(user.id, body.registrationId, body.status) });
  } catch (error) {
    if (error instanceof ManagementError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Attendance update failed." }, { status: 500 });
  }
}
