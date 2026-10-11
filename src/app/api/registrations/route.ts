import { getUserFromRequest } from "@/lib/auth";
import { getAdminDashboardData, getStudentDashboardData } from "@/lib/queries";
import { cancelRegistration, createRegistration, RegistrationError, setRegistrationStatus } from "@/lib/registration-service";
import { ValidationError } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "admin") return NextResponse.json({ registrations: (await getAdminDashboardData()).registrations });
  return NextResponse.json({ registrations: (await getStudentDashboardData(user.id)).myRegistrations });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "student") return NextResponse.json({ error: "Student access required" }, { status: 403 });
  try {
    const body = await request.json();
    return NextResponse.json({ registration: await createRegistration(user.id, body.eventId) }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const registration = user.role === "admin"
      ? await setRegistrationStatus(body.id, body.status)
      : await cancelRegistration(user.id, body.id);
    return NextResponse.json({ registration });
  } catch (error) {
    if (error instanceof RegistrationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Registration update failed." }, { status: 500 });
  }
}
