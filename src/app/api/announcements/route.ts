import { db } from "@/db";
import { announcements } from "@/db/schema";
import { getUserFromRequest } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { makeId } from "@/lib/security";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  await ensureDatabase();
  const data = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  return NextResponse.json({ announcements: data });
}

export async function POST(request: NextRequest) {
  await ensureDatabase();
  const user = await getUserFromRequest(request);
  if (user?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json();
  const id = makeId("ann");
  await db.insert(announcements).values({ id, title: body.title, message: body.message, audience: body.audience ?? "all", priority: body.priority ?? "normal" });
  const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  return NextResponse.json({ announcement }, { status: 201 });
}
