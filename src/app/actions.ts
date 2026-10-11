"use server";

import { db } from "@/db";
import { announcements, events, registrations, users } from "@/db/schema";
import { clearSession, requireUser, setSession } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { hashPassword, makeId, makeToken, verifyPassword } from "@/lib/security";
import { cancelRegistration, createRegistration, RegistrationError, setRegistrationStatus } from "@/lib/registration-service";
import { deleteSchedule, deleteVenue, ManagementError, markAttendance, saveSchedule, saveVenue } from "@/lib/event-management";
import { ValidationError, validateEmail, validateEventInput, validateId, validateRole } from "@/lib/validation";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function go(path: string, type: "success" | "error", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export async function signUpAction(formData: FormData) {
  await ensureDatabase();
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");
  let email: string;
  try { email = validateEmail(value(formData, "email")); } catch (error) { go("/register", "error", error instanceof Error ? error.message : "Invalid email."); }
  const registerNumber = value(formData, "registerNumber").toUpperCase();

  if (!formData.get("terms")) go("/register", "error", "Please accept the terms and conditions.");
  if (password.length < 8) go("/register", "error", "Password must contain at least 8 characters.");
  if (password !== confirmPassword) go("/register", "error", "Passwords do not match.");

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.email} = ${email} OR ${users.registerNumber} = ${registerNumber}`)
    .limit(1);
  if (existing) go("/register", "error", "An account already exists for this email or register number.");

  const token = makeToken();
  await db.insert(users).values({
    id: makeId("usr"),
    fullName: value(formData, "fullName"),
    registerNumber,
    collegeName: value(formData, "collegeName"),
    department: value(formData, "department"),
    yearOfStudy: Math.min(6, Math.max(1, Number(value(formData, "yearOfStudy") || 1))),
    email,
    mobileNumber: value(formData, "mobileNumber"),
    gender: value(formData, "gender"),
    city: value(formData, "city"),
    profilePhoto: value(formData, "profilePhoto") || null,
    emergencyContact: value(formData, "emergencyContact"),
    foodPreference: value(formData, "foodPreference"),
    accommodationRequired: formData.get("accommodationRequired") === "on",
    passwordHash: hashPassword(password),
    role: "student",
    emailVerified: false,
    verificationToken: token,
  });

  revalidatePath("/");
  redirect(`/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
}

export async function verifyEmailAction(formData: FormData) {
  await ensureDatabase();
  const token = value(formData, "token");
  if (!token) go("/verify-email", "error", "Verification token is missing.");
  const [user] = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
  if (!user) go("/verify-email", "error", "Invalid or expired verification link.");
  await db.update(users).set({ emailVerified: true, verificationToken: null }).where(eq(users.id, user.id));
  go("/login", "success", "Email verified. You can now sign in.");
}

export async function loginAction(formData: FormData) {
  await ensureDatabase();
  let email: string;
  let role: "student" | "admin";
  try {
    email = validateEmail(value(formData, "email"));
    role = validateRole(value(formData, "role") || "student");
  } catch (error) {
    go("/login", "error", error instanceof Error ? error.message : "Invalid login details.");
  }
  const password = value(formData, "password");
  if (!password) go("/login", "error", "Password is required.");
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || user.role !== role || !verifyPassword(password, user.passwordHash)) {
    go("/login", "error", "Invalid credentials for the selected portal.");
  }
  if (!user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}&error=${encodeURIComponent("Please verify your email before logging in.")}`);
  }
  await setSession(user);
  redirect(user.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login?success=Logged out securely.");
}

export async function forgotPasswordAction(formData: FormData) {
  await ensureDatabase();
  const email = value(formData, "email").toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) go("/forgot-password", "success", "If the email exists, a reset link has been generated.");
  const token = makeToken();
  await db.update(users).set({ resetToken: token }).where(eq(users.id, user.id));
  redirect(`/forgot-password?token=${encodeURIComponent(token)}&success=${encodeURIComponent("Demo reset token generated. Set a new password below.")}`);
}

export async function resetPasswordAction(formData: FormData) {
  await ensureDatabase();
  const token = value(formData, "token");
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");
  if (password.length < 8 || password !== confirmPassword) go("/forgot-password", "error", "Passwords must match and contain at least 8 characters.");
  const [user] = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  if (!user) go("/forgot-password", "error", "Invalid reset token.");
  await db.update(users).set({ passwordHash: hashPassword(password), resetToken: null }).where(eq(users.id, user.id));
  go("/login", "success", "Password updated. Please sign in.");
}

export async function registerForEventAction(formData: FormData) {
  const user = await requireUser("student");
  if (!user) redirect("/login?error=Please sign in as a student.");
  try {
    await createRegistration(user.id, value(formData, "eventId"));
  } catch (error) {
    go("/student/dashboard", "error", error instanceof Error ? error.message : "Registration failed.");
  }
  go("/student/dashboard", "success", "Registration submitted successfully.");
}

export async function cancelRegistrationAction(formData: FormData) {
  const user = await requireUser("student");
  if (!user) redirect("/login?error=Please sign in as a student.");
  try {
    await cancelRegistration(user.id, value(formData, "registrationId"));
  } catch (error) {
    go("/student/dashboard", "error", error instanceof Error ? error.message : "Cancellation failed.");
  }
  go("/student/dashboard", "success", "Registration cancelled.");
}

export async function saveEventAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?error=Admin access required.");
  let eventId: string;
  let payload;
  try {
    eventId = value(formData, "eventId") ? validateId(value(formData, "eventId"), "Event ID") : "";
    payload = validateEventInput(Object.fromEntries(formData.entries()));
  } catch (error) {
    go("/admin/dashboard", "error", error instanceof Error ? error.message : "Invalid event details.");
  }
  const eventValues = { ...payload, slug: slugify(payload.name) };

  try {
    if (eventId) await db.update(events).set(eventValues).where(eq(events.id, eventId));
    else await db.insert(events).values({ id: makeId("evt"), ...eventValues });
  } catch {
    go("/admin/dashboard", "error", "Could not save the event. Ensure its name and slug are unique.");
  }
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
  go("/admin/dashboard", "success", eventId ? "Event updated." : "Event created.");
}

export async function deleteEventAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?error=Admin access required.");
  const eventId = validateId(value(formData, "eventId"), "Event ID");
  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
  go("/admin/dashboard", "success", "Event deleted.");
}

export async function updateRegistrationStatusAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?error=Admin access required.");
  try {
    await setRegistrationStatus(value(formData, "registrationId"), value(formData, "status"));
  } catch (error) {
    go("/admin/dashboard", "error", error instanceof Error ? error.message : "Status update failed.");
  }
  go("/admin/dashboard", "success", "Registration status updated.");
}

export async function createAnnouncementAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?error=Admin access required.");
  await db.insert(announcements).values({
    id: makeId("ann"),
    title: value(formData, "title"),
    message: value(formData, "message"),
    audience: value(formData, "audience") || "all",
    priority: value(formData, "priority") || "normal",
  });
  revalidatePath("/admin/dashboard");
  revalidatePath("/student/dashboard");
}

export async function saveVenueAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?portal=admin&error=Admin access required.");
  try {
    await saveVenue(Object.fromEntries(formData.entries()));
  } catch (error) {
    go("/admin/dashboard", "error", error instanceof Error ? error.message : "Venue operation failed.");
  }
  revalidatePath("/admin/dashboard");
  go("/admin/dashboard", "success", value(formData, "id") ? "Venue updated." : "Venue created.");
}

export async function deleteVenueAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?portal=admin&error=Admin access required.");
  try { await deleteVenue(value(formData, "id")); } catch (error) {
    go("/admin/dashboard", "error", error instanceof Error ? error.message : "Venue deletion failed.");
  }
  revalidatePath("/admin/dashboard");
  go("/admin/dashboard", "success", "Venue deleted.");
}

export async function saveScheduleAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?portal=admin&error=Admin access required.");
  try { await saveSchedule(Object.fromEntries(formData.entries())); } catch (error) {
    go("/admin/dashboard", "error", error instanceof Error ? error.message : "Schedule operation failed.");
  }
  revalidatePath("/admin/dashboard");
  revalidatePath("/events");
  go("/admin/dashboard", "success", value(formData, "id") ? "Schedule updated." : "Venue allocated successfully.");
}

export async function deleteScheduleAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?portal=admin&error=Admin access required.");
  await deleteSchedule(value(formData, "id"));
  revalidatePath("/admin/dashboard");
  go("/admin/dashboard", "success", "Schedule removed.");
}

export async function markAttendanceAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?portal=admin&error=Admin access required.");
  try { await markAttendance(admin.id, value(formData, "registrationId"), value(formData, "status")); } catch (error) {
    go("/admin/dashboard", "error", error instanceof Error ? error.message : "Attendance update failed.");
  }
  revalidatePath("/admin/dashboard");
  go("/admin/dashboard", "success", "Attendance saved.");
}
