import { db } from "@/db";
import { events } from "@/db/schema";
import { getUserFromRequest } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { getPublicEvents } from "@/lib/queries";
import { makeId } from "@/lib/security";
import { ValidationError, validateEventInput, validateId } from "@/lib/validation";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function slugify(input: string) { return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = await getPublicEvents(searchParams.get("q") ?? undefined, searchParams.get("category") ?? undefined);
  return NextResponse.json({ events: data });
}

export async function POST(request: NextRequest) {
  await ensureDatabase();
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = validateEventInput(await request.json());
    const id = makeId("evt");
    await db.insert(events).values({ id, ...body, slug: slugify(body.name) });
    const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not create event. The event name may already exist." }, { status: 409 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const raw = await request.json();
    const id = validateId(raw.id, "Event ID");
    const body = validateEventInput(raw);
    await db.update(events).set({ ...body, slug: slugify(body.name) }).where(eq(events.id, id));
    const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not update event." }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  let id: string;
  try { id = validateId(searchParams.get("id"), "Event ID"); } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid event ID." }, { status: 400 });
  }
  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, id)).limit(1);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  await db.delete(events).where(eq(events.id, id));
  return NextResponse.json({ ok: true });
}
