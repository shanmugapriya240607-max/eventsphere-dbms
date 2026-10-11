import { db } from "@/db";
import { users } from "@/db/schema";
import { setSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/security";
import { ValidationError, validateEmail, validateRole } from "@/lib/validation";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = validateEmail(body.email);
    const role = validateRole(body.role);
    if (typeof body.password !== "string" || !body.password) throw new ValidationError("Password is required.");
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.role !== role || !verifyPassword(body.password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials for the selected portal." }, { status: 401 });
    }
    if (!user.emailVerified) return NextResponse.json({ error: "Email verification is required." }, { status: 403 });
    await setSession(user);
    return NextResponse.json({ user: { id: user.id, name: user.fullName, email: user.email, role: user.role } });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
