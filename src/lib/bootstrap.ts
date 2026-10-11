/* Legacy PostgreSQL request-time bootstrap (kept in Git history; disabled during MySQL migration).
// @ts-nocheck
import { db, pool } from "@/db";
import { announcements, certificates, coordinators, events, registrations, users } from "@/db/schema";
import { sql } from "drizzle-orm";
import { hashPassword, makeId, makeToken } from "./security";

let bootstrapPromise: Promise<void> | null = null;

const eventTemplates = [
  ["Coding Contest", "Programming", "A high-speed algorithmic programming contest with ICPC-style problems and real-time judging."],
  ["48-Hour Hackathon", "Hackathon", "Build impactful products around education, sustainability, health tech, and smart campuses."],
  ["Paper Presentation", "Research", "Present original technical papers to faculty experts and industry reviewers."],
  ["Debugging Challenge", "Programming", "Trace, isolate, and fix tricky bugs across C, Java, Python, and JavaScript."],
  ["Web Development Challenge", "Development", "Design and ship a responsive full-stack web experience under time pressure."],
  ["AI & ML Quiz", "Artificial Intelligence", "A fast-paced quiz on neural networks, GenAI, data science, and responsible AI."],
  ["UI/UX Design Competition", "Design", "Create a user-centered product prototype with strong visual storytelling."],
  ["Technical Quiz", "Quiz", "Battle through rounds covering networks, DBMS, OS, cloud, security, and emerging tech."],
  ["Robotics Challenge", "Robotics", "Program autonomous bots to solve navigation and object-handling missions."],
  ["Cloud Native Workshop", "Workshop", "Hands-on sessions covering containers, CI/CD, observability, and cloud deployment."],
  ["Cybersecurity CTF", "Security", "Capture flags by exploiting vulnerable apps, crypto puzzles, forensics, and OSINT."],
  ["IoT Innovation Expo", "IoT", "Prototype sensor-driven systems for smart homes, farms, labs, and transport."],
  ["Data Visualization Sprint", "Data", "Convert real-world datasets into clear, interactive dashboards and insight stories."],
  ["AR/VR Experience Lab", "Workshop", "Explore immersive interaction design using augmented and virtual reality workflows."],
  ["App Development Jam", "Mobile", "Build a useful Android or cross-platform app with delightful onboarding."],
  ["Blockchain Ideathon", "Web3", "Design practical decentralized solutions with strong feasibility and ethics."],
  ["Startup Pitch Arena", "Innovation", "Pitch technical startup ideas to mentors with market, product, and demo clarity."],
  ["DevOps Relay", "Infrastructure", "Compete in team challenges around automation, scripting, deployments, and recovery."],
  ["Electronics Circuit Hunt", "Electronics", "Solve circuit clues, component puzzles, and rapid prototyping tasks."],
  ["Women in Tech Forum", "Community", "A panel and networking forum celebrating leadership, inclusion, and technical excellence."],
] as const;

const posters = [
  "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function createTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      full_name text NOT NULL,
      register_number text,
      college_name text,
      department text,
      year_of_study integer,
      email text NOT NULL,
      mobile_number text,
      gender text,
      city text,
      profile_photo text,
      emergency_contact text,
      food_preference text,
      accommodation_required boolean NOT NULL DEFAULT false,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'student',
      email_verified boolean NOT NULL DEFAULT false,
      verification_token text,
      reset_token text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
    CREATE UNIQUE INDEX IF NOT EXISTS users_register_number_idx ON users(register_number) WHERE register_number IS NOT NULL;

    CREATE TABLE IF NOT EXISTS events (
      id text PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL,
      category text NOT NULL,
      description text NOT NULL,
      event_date date NOT NULL,
      start_time text NOT NULL,
      venue text NOT NULL,
      registration_deadline date NOT NULL,
      available_seats integer NOT NULL DEFAULT 100,
      rules text NOT NULL,
      faculty_coordinator text NOT NULL,
      student_coordinator text NOT NULL,
      prize_details text NOT NULL,
      poster_url text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS events_slug_idx ON events(slug);

    CREATE TABLE IF NOT EXISTS registrations (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'pending',
      confirmation_code text NOT NULL,
      checked_in boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS registrations_user_event_idx ON registrations(user_id, event_id);

    CREATE TABLE IF NOT EXISTS announcements (
      id text PRIMARY KEY,
      title text NOT NULL,
      message text NOT NULL,
      audience text NOT NULL DEFAULT 'all',
      priority text NOT NULL DEFAULT 'normal',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      type text NOT NULL DEFAULT 'Participation',
      certificate_no text NOT NULL,
      file_url text NOT NULL,
      issued_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS coordinators (
      id text PRIMARY KEY,
      name text NOT NULL,
      role text NOT NULL,
      department text NOT NULL,
      email text NOT NULL,
      phone text NOT NULL,
      event_id text REFERENCES events(id) ON DELETE SET NULL
    );
  `);
}

async function seedData() {
  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)::int` }).from(users);
  if (totalUsers > 20) return;

  const demoHash = hashPassword("CodeCraze@2026");
  const adminId = "admin_codecraze";
  await db.insert(users).values({
    id: adminId,
    fullName: "Dr. Kavya Raman",
    registerNumber: null,
    collegeName: "CodeCraze Organizing Committee",
    department: "Computer Science",
    yearOfStudy: null,
    email: "admin@codecraze.edu",
    mobileNumber: "+91 90000 26026",
    gender: "Female",
    city: "Chennai",
    profilePhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    emergencyContact: "+91 90000 26000",
    foodPreference: "Veg",
    accommodationRequired: false,
    passwordHash: demoHash,
    role: "admin",
    emailVerified: true,
  }).onConflictDoNothing();

  const departments = ["CSE", "IT", "ECE", "EEE", "AI&DS", "Mechanical", "Civil", "Mechatronics"];
  const cities = ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Bengaluru", "Pune", "Hyderabad"];
  const studentRows = Array.from({ length: 100 }, (_, index) => {
    const n = index + 1;
    return {
      id: `stu_${String(n).padStart(3, "0")}`,
      fullName: `Demo Student ${String(n).padStart(3, "0")}`,
      registerNumber: `CC26${String(1000 + n)}`,
      collegeName: n % 4 === 0 ? "National Engineering College" : n % 4 === 1 ? "Riverstone Institute of Technology" : n % 4 === 2 ? "Metro College of Engineering" : "Sri Veda Technical Campus",
      department: departments[index % departments.length],
      yearOfStudy: (index % 4) + 1,
      email: `student${String(n).padStart(3, "0")}@demo.edu`,
      mobileNumber: `+91 98${String(70000000 + n).slice(0, 8)}`,
      gender: index % 3 === 0 ? "Female" : index % 3 === 1 ? "Male" : "Prefer not to say",
      city: cities[index % cities.length],
      profilePhoto: `https://api.dicebear.com/9.x/initials/svg?seed=CodeCraze%20Student%20${n}`,
      emergencyContact: `+91 97${String(60000000 + n).slice(0, 8)}`,
      foodPreference: index % 5 === 0 ? "Non-Veg" : "Veg",
      accommodationRequired: index % 6 === 0,
      passwordHash: demoHash,
      role: "student",
      emailVerified: true,
    };
  });
  await db.insert(users).values(studentRows).onConflictDoNothing();

  const eventRows = eventTemplates.map(([name, category, description], index) => ({
    id: `evt_${String(index + 1).padStart(2, "0")}`,
    name,
    slug: slugify(name),
    category,
    description,
    eventDate: `2026-03-${String(12 + (index % 3)).padStart(2, "0")}`,
    startTime: `${String(9 + (index % 7)).padStart(2, "0")}:00 ${index % 2 === 0 ? "AM" : "PM"}`,
    venue: index % 4 === 0 ? "Main Auditorium" : index % 4 === 1 ? "Innovation Lab" : index % 4 === 2 ? "Seminar Hall A" : "Research Block",
    registrationDeadline: "2026-03-05",
    availableSeats: 60 + (index % 6) * 20,
    rules: "Teams must report 30 minutes early. College ID is mandatory. Plagiarism or malpractice leads to disqualification. Judges' decisions are final.",
    facultyCoordinator: ["Prof. Arjun Menon", "Dr. Nisha Verma", "Prof. Sanjay Iyer", "Dr. Meera Krishnan"][index % 4],
    studentCoordinator: ["Aadhav S", "Priya N", "Rahul V", "Nandhini K", "Irfan M"][index % 5],
    prizeDetails: `Winner ₹${10 + (index % 5) * 5},000 • Runner-up ₹${5 + (index % 4) * 3},000 • Certificates for finalists`,
    posterUrl: posters[index % posters.length],
    status: index % 9 === 0 ? "featured" : "open",
  }));
  await db.insert(events).values(eventRows).onConflictDoNothing();

  const coordinatorRows = eventRows.flatMap((event, index) => [
    {
      id: `coord_f_${index + 1}`,
      name: event.facultyCoordinator,
      role: "Faculty Coordinator",
      department: departments[index % departments.length],
      email: `${event.facultyCoordinator.toLowerCase().replace(/[^a-z]+/g, ".")}@codecraze.edu`,
      phone: `+91 80${String(10000000 + index).slice(0, 8)}`,
      eventId: event.id,
    },
    {
      id: `coord_s_${index + 1}`,
      name: event.studentCoordinator,
      role: "Student Coordinator",
      department: departments[(index + 2) % departments.length],
      email: `${event.studentCoordinator.toLowerCase().replace(/[^a-z]+/g, ".")}@student.codecraze.edu`,
      phone: `+91 81${String(20000000 + index).slice(0, 8)}`,
      eventId: event.id,
    },
  ]);
  await db.insert(coordinators).values(coordinatorRows).onConflictDoNothing();

  const registrationRows = [];
  for (let student = 1; student <= 100; student += 1) {
    const eventCount = student % 5 === 0 ? 5 : student % 3 === 0 ? 4 : 3;
    for (let slot = 0; slot < eventCount; slot += 1) {
      const eventIndex = (student * 3 + slot * 7) % 20;
      registrationRows.push({
        id: `reg_${String(student).padStart(3, "0")}_${String(slot).padStart(2, "0")}`,
        userId: `stu_${String(student).padStart(3, "0")}`,
        eventId: `evt_${String(eventIndex + 1).padStart(2, "0")}`,
        status: slot === 0 ? "approved" : slot === 1 && student % 7 === 0 ? "rejected" : slot === 2 && student % 11 === 0 ? "cancelled" : "pending",
        confirmationCode: `CC26-${String(student).padStart(3, "0")}-${String(eventIndex + 1).padStart(2, "0")}`,
      });
    }
  }
  await db.insert(registrations).values(registrationRows).onConflictDoNothing();

  const announcementRows = [
    ["Registrations are open", "Early bird registration for CodeCraze 2026 is live. Reserve your seats before 5 March 2026.", "all", "high"],
    ["Bring college ID cards", "Participants must carry valid college identification during check-in and certificate collection.", "students", "normal"],
    ["Hackathon theme reveal", "Hackathon problem statements will be revealed during the inauguration in the Main Auditorium.", "students", "high"],
    ["Volunteer briefing", "All student coordinators should attend the volunteer briefing at 4 PM in Seminar Hall B.", "admin", "normal"],
    ["Certificate portal update", "Digital participation certificates will be available after attendance verification.", "all", "normal"],
  ].map(([title, message, audience, priority], index) => ({
    id: `ann_${index + 1}`,
    title,
    message,
    audience,
    priority,
  }));
  await db.insert(announcements).values(announcementRows).onConflictDoNothing();

  const certificateRows = registrationRows
    .filter((registration) => registration.status === "approved")
    .slice(0, 90)
    .map((registration, index) => ({
      id: `cert_${String(index + 1).padStart(3, "0")}`,
      userId: registration.userId,
      eventId: registration.eventId,
      type: index % 9 === 0 ? "Winner" : "Participation",
      certificateNo: `CC26-CERT-${String(index + 1).padStart(4, "0")}`,
      fileUrl: `/certificates/CC26-CERT-${String(index + 1).padStart(4, "0")}.pdf`,
    }));
  await db.insert(certificates).values(certificateRows).onConflictDoNothing();

  await db.update(users).set({ verificationToken: makeToken() }).where(sql`role = 'student' AND verification_token IS NULL`);
}

export async function ensureDatabase() {
  bootstrapPromise ??= (async () => {
    await pool.query("SELECT 1");
  })();
  await bootstrapPromise;
}
*/

import { pool } from "@/db";

let mysqlConnectionPromise: Promise<void> | null = null;

/** Verify MySQL once per server process. Run `npm run db:init` to create and seed the schema. */
export async function ensureDatabase() {
  mysqlConnectionPromise ??= pool.query("SELECT 1").then(() => undefined).catch((error) => {
    mysqlConnectionPromise = null;
    throw error;
  });
  await mysqlConnectionPromise;
}
