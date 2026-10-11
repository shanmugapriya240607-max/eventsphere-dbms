import { db } from "@/db";
import { eventSchedules, events, venues } from "@/db/schema";
import { getUserFromRequest } from "@/lib/auth";
import { deleteSchedule, ManagementError, saveSchedule } from "@/lib/event-management";
import { ValidationError } from "@/lib/validation";
import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function failure(error: unknown) {
  if (error instanceof ManagementError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: "Schedule operation failed." }, { status: 500 });
}

export async function GET() {
  const rows = await db.select({ schedule: eventSchedules, event: events, venue: venues }).from(eventSchedules)
    .innerJoin(events, eq(events.id, eventSchedules.eventId)).innerJoin(venues, eq(venues.id, eventSchedules.venueId))
    .orderBy(asc(eventSchedules.scheduleDate), asc(eventSchedules.startTime));
  return NextResponse.json({ schedules: rows });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try { return NextResponse.json({ schedule: await saveSchedule(await request.json()) }, { status: 201 }); } catch (error) { return failure(error); }
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try { return NextResponse.json({ schedule: await saveSchedule(await request.json()) }); } catch (error) { return failure(error); }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try { return NextResponse.json({ deleted: await deleteSchedule(new URL(request.url).searchParams.get("id")) }); } catch (error) { return failure(error); }
}
