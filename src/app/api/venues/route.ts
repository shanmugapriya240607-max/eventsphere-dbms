import { db } from "@/db";
import { venues } from "@/db/schema";
import { getUserFromRequest } from "@/lib/auth";
import { deleteVenue, ManagementError, saveVenue } from "@/lib/event-management";
import { ValidationError } from "@/lib/validation";
import { asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function failure(error: unknown) {
  if (error instanceof ManagementError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: "Venue operation failed." }, { status: 500 });
}

export async function GET() {
  return NextResponse.json({ venues: await db.select().from(venues).orderBy(asc(venues.name)) });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try { return NextResponse.json({ venue: await saveVenue(await request.json()) }, { status: 201 }); } catch (error) { return failure(error); }
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try { return NextResponse.json({ venue: await saveVenue(await request.json()) }); } catch (error) { return failure(error); }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try { return NextResponse.json({ deleted: await deleteVenue(new URL(request.url).searchParams.get("id")) }); } catch (error) { return failure(error); }
}
