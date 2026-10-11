import { db } from "@/db";
import { events } from "@/db/schema";
import { getUserFromRequest } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { getPublicEvents } from "@/lib/queries";
import { makeId } from "@/lib/security";
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
  const body = await request.json();
  const id = makeId("evt");
  await db.insert(events).values({ id, slug: slugify(body.name), status: "open", ...body });
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return NextResponse.json({ event }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json();
  await db.update(events).set({ ...body, slug: body.name ? slugify(body.name) : undefined }).where(eq(events.id, body.id));
  const [event] = await db.select().from(events).where(eq(events.id, body.id)).limit(1);
  return NextResponse.json({ event });
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  await db.delete(events).where(eq(events.id, searchParams.get("id") ?? ""));
  return NextResponse.json({ ok: true });
}
