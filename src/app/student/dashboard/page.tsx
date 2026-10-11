import { cancelRegistrationAction, logoutAction, registerForEventAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/queries";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const sidebar = ["Dashboard", "My Profile", "Browse Events", "My Registrations", "Event Schedule", "Notifications", "Certificates", "Settings"];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function statusClass(status: string) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200";
  if (status === "rejected") return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-200";
  if (status === "cancelled") return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-100";
}

export default async function StudentDashboardPage({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const user = await requireUser("student");
  if (!user) redirect("/login?error=Please login as a student.");
  const data = await getStudentDashboardData(user.id);
  const registeredEventIds = new Map(data.myRegistrations.map((row) => [row.event.id, row.registration]));
  const approvedCount = data.myRegistrations.filter((row) => row.registration.status === "approved").length;
  const daysLeft = 0;

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="sticky top-0 h-full bg-slate-950 p-6 text-white lg:min-h-screen">
        <Link href="/" className="flex items-center gap-3 font-black"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600">CC</span>CodeCraze</Link>
        <nav className="mt-10 grid gap-2">
          {sidebar.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white">{item}</a>)}
          <form action={logoutAction}><button className="mt-4 w-full rounded-2xl bg-red-500/15 px-4 py-3 text-left text-sm font-bold text-red-200">Logout</button></form>
        </nav>
      </aside>

      <section className="p-5 md:p-8">
        {params?.error ? <div className="mb-5 rounded-2xl bg-red-50 p-4 font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-200">{params.error}</div> : null}
        {params?.success ? <div className="mb-5 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">{params.success}</div> : null}
        <div id="dashboard" className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl md:p-10">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <p className="font-black uppercase tracking-[.2em] text-amber-300">Student Dashboard</p>
              <h1 className="mt-3 text-4xl font-black md:text-6xl">Welcome, {user.fullName.split(" ")[0]}.</h1>
              <p className="mt-3 max-w-2xl text-slate-300">Manage your CodeCraze 2026 profile, registrations, confirmations, announcements, and certificates.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-3xl bg-white/10 p-4"><p className="text-3xl font-black text-blue-300">{data.myRegistrations.length}</p><p className="text-xs font-bold uppercase text-slate-300">Registered</p></div>
              <div className="rounded-3xl bg-white/10 p-4"><p className="text-3xl font-black text-emerald-300">{approvedCount}</p><p className="text-xs font-bold uppercase text-slate-300">Approved</p></div>
              <div className="rounded-3xl bg-white/10 p-4"><p className="text-3xl font-black text-amber-300">{daysLeft}</p><p className="text-xs font-bold uppercase text-slate-300">Days left</p></div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3"><a className="btn-primary" href="#browse-events">Browse events</a><a className="btn-secondary" href="#my-registrations">My registrations</a><a className="btn-secondary" href="#certificates">Certificates</a></div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          <section id="my-profile" className="glass-card rounded-[2rem] p-6">
            <h2 className="text-2xl font-black">My Profile</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                ["Register No.", user.registerNumber],
                ["College", user.collegeName],
                ["Department", user.department],
                ["Year", user.yearOfStudy ? `${user.yearOfStudy}` : "-"],
                ["Email", user.email],
                ["Mobile", user.mobileNumber],
                ["Food", user.foodPreference],
                ["Accommodation", user.accommodationRequired ? "Required" : "Not required"],
                ["Verification", user.emailVerified ? "Verified" : "Pending"],
              ].map(([label, val]) => <div key={label} className="rounded-2xl bg-white/70 p-4 text-sm dark:bg-slate-900/70"><p className="font-bold text-slate-500">{label}</p><p className="mt-1 font-black">{val}</p></div>)}
            </div>
          </section>

          <section id="notifications" className="glass-card rounded-[2rem] p-6">
            <h2 className="text-2xl font-black">Latest announcements</h2>
            <div className="mt-5 grid gap-3">
              {data.announcements.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-black">{item.title}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message}</p></div>)}
            </div>
          </section>
        </div>

        <section id="my-registrations" className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-black">My Registrations</h2><span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold dark:bg-slate-800">Status updates in real time</span></div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-slate-500"><tr><th className="p-3">Event</th><th className="p-3">Date</th><th className="p-3">Code</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
              <tbody>
                {data.myRegistrations.map(({ registration, event }) => (
                  <tr key={registration.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3 font-bold">{event.name}</td><td className="p-3">{formatDate(event.eventDate)}</td><td className="p-3 font-mono">{registration.confirmationCode}</td><td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(registration.status)}`}>{registration.status}</span></td>
                    <td className="flex gap-2 p-3"><a className="rounded-full bg-blue-50 px-3 py-2 font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200" href={`/api/registrations/confirmation?id=${registration.id}`}>Download</a><form action={cancelRegistrationAction}><input type="hidden" name="registrationId" value={registration.id} /><button className="rounded-full bg-red-50 px-3 py-2 font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">Cancel</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.myRegistrations.length === 0 ? <p className="mt-6 rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No registrations yet. Browse events below and reserve your seats.</p> : null}
        </section>

        <section id="browse-events" className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900">
          <h2 className="text-2xl font-black">Browse Events</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {data.allEvents.map((event) => {
              const current = registeredEventIds.get(event.id);
              return <article key={event.id} className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800"><p className="text-xs font-black uppercase text-blue-600">{event.category}</p><h3 className="mt-2 text-xl font-black">{event.name}</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{event.description}</p><p className="mt-4 text-sm font-bold">{formatDate(event.eventDate)} • {event.startTime} • {event.venue}</p><p className="mt-2 text-sm text-slate-500">Deadline: {formatDate(event.registrationDeadline)} • Seats: {event.availableSeats}</p>{current ? <span className={`mt-5 inline-flex rounded-full px-4 py-2 text-xs font-black uppercase ${statusClass(current.status)}`}>{current.status}</span> : <form action={registerForEventAction} className="mt-5"><input type="hidden" name="eventId" value={event.id} /><button className="btn-primary w-full">Register</button></form>}</article>;
            })}
          </div>
        </section>

        <section id="certificates" className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900">
          <h2 className="text-2xl font-black">Certificates</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.certificates.map(({ certificate, event }) => <div key={certificate.id} className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10"><p className="text-xs font-black uppercase text-amber-700 dark:text-amber-200">{certificate.type}</p><h3 className="mt-2 font-black">{event.name}</h3><p className="mt-2 font-mono text-sm">{certificate.certificateNo}</p><a href={certificate.fileUrl} className="mt-4 inline-flex font-bold text-blue-600">Download certificate</a></div>)}
          </div>
          {data.certificates.length === 0 ? <p className="mt-5 text-slate-500">Certificates will appear after event completion and admin verification.</p> : null}
        </section>
      </section>
    </main>
  );
}
