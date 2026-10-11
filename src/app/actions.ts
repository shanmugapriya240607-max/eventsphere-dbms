"use server";

import { db } from "@/db";
import { announcements, events, registrations, users } from "@/db/schema";
import { clearSession, requireUser, setSession } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { hashPassword, makeId, makeToken, verifyPassword } from "@/lib/security";
import { and, eq, sql } from "drizzle-orm";
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
  const email = value(formData, "email").toLowerCase();
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
    yearOfStudy: Number(value(formData, "yearOfStudy") || 1),
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
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const role = value(formData, "role") || "student";
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
  const eventId = value(formData, "eventId");
  await db
    .insert(registrations)
    .values({
      id: makeId("reg"),
      userId: user.id,
      eventId,
      status: "pending",
      confirmationCode: `CC26-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    })
    .onDuplicateKeyUpdate({ set: { status: "pending", updatedAt: sql`CURRENT_TIMESTAMP` } });
  revalidatePath("/student/dashboard");
}

export async function cancelRegistrationAction(formData: FormData) {
  const user = await requireUser("student");
  if (!user) redirect("/login?error=Please sign in as a student.");
  const registrationId = value(formData, "registrationId");
  await db
    .update(registrations)
    .set({ status: "cancelled", updatedAt: sql`now()` })
    .where(and(eq(registrations.id, registrationId), eq(registrations.userId, user.id)));
  revalidatePath("/student/dashboard");
}

export async function saveEventAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?error=Admin access required.");
  const eventId = value(formData, "eventId");
  const name = value(formData, "name");
  const payload = {
    name,
    slug: slugify(name),
    category: value(formData, "category"),
    description: value(formData, "description"),
    eventDate: value(formData, "eventDate"),
    startTime: value(formData, "startTime"),
    venue: value(formData, "venue"),
    registrationDeadline: value(formData, "registrationDeadline"),
    availableSeats: Number(value(formData, "availableSeats") || 100),
    rules: value(formData, "rules"),
    facultyCoordinator: value(formData, "facultyCoordinator"),
    studentCoordinator: value(formData, "studentCoordinator"),
    prizeDetails: value(formData, "prizeDetails"),
    posterUrl: value(formData, "posterUrl") || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    status: value(formData, "status") || "open",
  };

  if (eventId) {
    await db.update(events).set(payload).where(eq(events.id, eventId));
  } else {
    await db.insert(events).values({ id: makeId("evt"), ...payload }).onDuplicateKeyUpdate({ set: { name } });
  }
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}

export async function deleteEventAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?error=Admin access required.");
  await db.delete(events).where(eq(events.id, value(formData, "eventId")));
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}

export async function updateRegistrationStatusAction(formData: FormData) {
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?error=Admin access required.");
  await db
    .update(registrations)
    .set({ status: value(formData, "status"), updatedAt: sql`now()` })
    .where(eq(registrations.id, value(formData, "registrationId")));
  revalidatePath("/admin/dashboard");
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
