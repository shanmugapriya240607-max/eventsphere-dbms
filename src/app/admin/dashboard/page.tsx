import { createAnnouncementAction, deleteEventAction, logoutAction, saveEventAction, updateRegistrationStatusAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/queries";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const sidebar = ["Dashboard", "Events", "Participants", "Registrations", "Announcements", "Certificates", "Reports", "Settings"];

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function Field({ name, placeholder, type = "text", defaultValue = "" }: { name: string; placeholder: string; type?: string; defaultValue?: string | number }) {
  return <input className="input" name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} required />;
}

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const admin = await requireUser("admin");
  if (!admin) redirect("/login?portal=admin&error=Please login as an administrator.");
  const data = await getAdminDashboardData();

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 lg:grid lg:grid-cols-[290px_1fr]">
      <aside className="sticky top-0 h-full bg-slate-950 p-6 text-white lg:min-h-screen">
        <Link href="/" className="flex items-center gap-3 font-black"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-slate-950">CC</span>Admin</Link>
        <nav className="mt-10 grid gap-2">
          {sidebar.map((item) => <a key={item} href={`#${item.toLowerCase()}`} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white">{item}</a>)}
          <form action={logoutAction}><button className="mt-4 w-full rounded-2xl bg-red-500/15 px-4 py-3 text-left text-sm font-bold text-red-200">Logout</button></form>
        </nav>
      </aside>

      <section className="p-5 md:p-8">
        {params?.error ? <div className="mb-5 rounded-2xl bg-red-50 p-4 font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-200">{params.error}</div> : null}
        {params?.success ? <div className="mb-5 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">{params.success}</div> : null}
        <div id="dashboard" className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl md:p-10">
          <p className="font-black uppercase tracking-[.2em] text-amber-300">Organizer Command Center</p>
          <div className="mt-3 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div><h1 className="text-4xl font-black md:text-6xl">Welcome, {admin.fullName}.</h1><p className="mt-3 max-w-2xl text-slate-300">Manage events, participants, approvals, announcements, certificates, and export-ready registration reports.</p></div>
            <Link href="/api/export/registrations" className="btn-primary">Export CSV</Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              [data.stats.students, "Students"], [data.events.length, "Events"], [data.stats.totalRegistrations, "Registrations"], [data.stats.pending, "Pending"], [data.stats.approved, "Approved"], [data.stats.rejected, "Rejected"],
            ].map(([value, label]) => <div key={label} className="rounded-3xl bg-white/10 p-4"><p className="text-3xl font-black text-blue-300">{value}</p><p className="text-xs font-bold uppercase text-slate-300">{label}</p></div>)}
          </div>
        </div>

        <section id="events" className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h2 className="text-2xl font-black">Events CRUD</h2><p className="text-slate-500">Add, edit, delete, and publish event posters/details.</p></div><span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">{data.events.length} events</span></div>
          <form action={saveEventAction} className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-5 dark:bg-slate-950 md:grid-cols-3">
            <Field name="name" placeholder="Event Name" defaultValue="New Innovation Challenge" />
            <Field name="category" placeholder="Category" defaultValue="Innovation" />
            <Field name="eventDate" placeholder="Date" type="date" defaultValue="2026-03-14" />
            <Field name="startTime" placeholder="Time" defaultValue="10:00 AM" />
            <Field name="venue" placeholder="Venue" defaultValue="Innovation Lab" />
            <Field name="registrationDeadline" placeholder="Deadline" type="date" defaultValue="2026-03-05" />
            <Field name="availableSeats" placeholder="Available Seats" type="number" defaultValue={120} />
            <Field name="facultyCoordinator" placeholder="Faculty Coordinator" defaultValue="Prof. New Coordinator" />
            <Field name="studentCoordinator" placeholder="Student Coordinator" defaultValue="Student Lead" />
            <input className="input md:col-span-3" name="posterUrl" placeholder="Event Poster URL" defaultValue="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80" />
            <textarea className="input md:col-span-3" name="description" placeholder="Description" defaultValue="A hands-on technical competition for creative problem solvers." required />
            <textarea className="input md:col-span-2" name="rules" placeholder="Rules" defaultValue="Report 30 minutes early. ID cards mandatory. Judges' decision is final." required />
            <input className="input" name="prizeDetails" placeholder="Prize Details" defaultValue="Winner ₹15,000 • Runner-up ₹7,500" required />
            <select className="input" name="status" defaultValue="open"><option>open</option><option>featured</option><option>closed</option></select>
            <button className="btn-primary md:col-span-2" type="submit">Add event</button>
          </form>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {data.events.map((event) => <div key={event.id} className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800"><div className="flex gap-4"><img src={event.posterUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" /><div><p className="text-xs font-black uppercase text-blue-600">{event.category}</p><h3 className="text-xl font-black">{event.name}</h3><p className="text-sm text-slate-500">{formatDate(event.eventDate)} • {event.venue} • {event.availableSeats} seats</p></div></div><form action={saveEventAction} className="mt-4 grid gap-2 md:grid-cols-2"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="posterUrl" value={event.posterUrl} /><input type="hidden" name="description" value={event.description} /><input type="hidden" name="rules" value={event.rules} /><input type="hidden" name="prizeDetails" value={event.prizeDetails} /><input type="hidden" name="facultyCoordinator" value={event.facultyCoordinator} /><input type="hidden" name="studentCoordinator" value={event.studentCoordinator} /><input className="input" name="name" defaultValue={event.name} /><input className="input" name="category" defaultValue={event.category} /><input className="input" name="eventDate" type="date" defaultValue={event.eventDate} /><input className="input" name="startTime" defaultValue={event.startTime} /><input className="input" name="venue" defaultValue={event.venue} /><input className="input" name="registrationDeadline" type="date" defaultValue={event.registrationDeadline} /><input className="input" name="availableSeats" type="number" defaultValue={event.availableSeats} /><select className="input" name="status" defaultValue={event.status}><option>open</option><option>featured</option><option>closed</option></select><button className="btn-secondary" type="submit">Save edits</button></form><form action={deleteEventAction} className="mt-2"><input type="hidden" name="eventId" value={event.id} /><button className="rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-700 dark:bg-red-500/10 dark:text-red-200">Delete event</button></form></div>)}
          </div>
        </section>

        <section id="participants" className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><h2 className="text-2xl font-black">Participants</h2><input className="input max-w-sm" placeholder="Search/filter participants (demo UI)" /></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-slate-500"><tr><th className="p-3">Name</th><th className="p-3">Register No</th><th className="p-3">College</th><th className="p-3">Department</th><th className="p-3">Email</th><th className="p-3">Food</th></tr></thead><tbody>{data.participants.map((user) => <tr key={user.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-bold">{user.fullName}</td><td className="p-3">{user.registerNumber}</td><td className="p-3">{user.collegeName}</td><td className="p-3">{user.department}</td><td className="p-3">{user.email}</td><td className="p-3">{user.foodPreference}</td></tr>)}</tbody></table></div>
        </section>

        <section id="registrations" className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900">
          <h2 className="text-2xl font-black">Registration approvals</h2>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-slate-500"><tr><th className="p-3">Participant</th><th className="p-3">Event</th><th className="p-3">Code</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{data.registrations.map(({ registration, user, event }) => <tr key={registration.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3"><p className="font-bold">{user.fullName}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="p-3 font-bold">{event.name}</td><td className="p-3 font-mono">{registration.confirmationCode}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase dark:bg-slate-800">{registration.status}</span></td><td className="p-3"><div className="flex gap-2"><form action={updateRegistrationStatusAction}><input type="hidden" name="registrationId" value={registration.id} /><input type="hidden" name="status" value="approved" /><button className="rounded-full bg-emerald-50 px-3 py-2 font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">Approve</button></form><form action={updateRegistrationStatusAction}><input type="hidden" name="registrationId" value={registration.id} /><input type="hidden" name="status" value="rejected" /><button className="rounded-full bg-red-50 px-3 py-2 font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">Reject</button></form></div></td></tr>)}</tbody></table></div>
        </section>

        <section id="announcements" className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <form action={createAnnouncementAction} className="rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900"><h2 className="text-2xl font-black">Send announcement</h2><div className="mt-5 grid gap-3"><input className="input" name="title" placeholder="Title" required /><textarea className="input" name="message" placeholder="Message" required /><select className="input" name="audience"><option value="all">All</option><option value="students">Students</option><option value="admin">Admin</option></select><select className="input" name="priority"><option>normal</option><option>high</option><option>urgent</option></select><button className="btn-primary" type="submit">Publish announcement</button></div></form>
          <div className="rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900"><h2 className="text-2xl font-black">Recent announcements</h2><div className="mt-5 grid gap-3">{data.announcements.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-black">{item.title}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message}</p></div>)}</div></div>
        </section>

        <section id="certificates" className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900"><h2 className="text-2xl font-black">Certificates</h2><p className="mt-3 text-slate-600 dark:text-slate-300">Participation certificates are generated for approved and verified attendees. Demo certificates are pre-seeded for approved registrations and visible in student dashboards.</p></section>
        <section id="reports" className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900"><h2 className="text-2xl font-black">Reports & Analytics</h2><p className="mt-3 text-slate-600 dark:text-slate-300">Use the CSV export for Excel/Sheets analysis. Dashboard cards provide registration analytics by status, participants, and event count.</p><Link href="/api/export/registrations" className="btn-primary mt-5">Download registrations CSV</Link></section>
        <section id="settings" className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900"><h2 className="text-2xl font-black">Settings</h2><p className="mt-3 text-slate-600 dark:text-slate-300">Secure sessions are persisted in HTTP-only cookies. Admin-only actions are protected server-side by role checks.</p></section>
      </section>
    </main>
  );
}
