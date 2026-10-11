import { loginAction } from "@/app/actions";
import Link from "next/link";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string; portal?: string }> }) {
  const params = await searchParams;
  const portal = params?.portal === "admin" ? "admin" : "student";
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6 py-10 dark:bg-slate-950">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-slate-900 lg:grid-cols-[.9fr_1.1fr]">
        <div className="bg-slate-950 p-8 text-white md:p-12">
          <Link href="/" className="font-bold text-blue-200">← CodeCraze 2026</Link>
          <h1 className="mt-16 text-4xl font-black sm:text-6xl">Secure portal login.</h1>
          <p className="mt-5 text-slate-300">JWT sessions, secure password hashing, email verification checks, and role-based routing for students and admins.</p>
          <div className="mt-8 rounded-3xl bg-white/10 p-5 text-sm text-slate-200">
            <p className="font-black text-amber-300">Demo credentials</p>
            <p className="mt-2">Student: student@eventsphere.edu / EventSphere@2026</p>
            <p>Admin: admin@eventsphere.edu / EventSphere@2026</p>
          </div>
        </div>
        <div className="p-8 md:p-12">
          {params?.error ? <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-200">{params.error}</div> : null}
          {params?.success ? <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">{params.success}</div> : null}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <Link className={`rounded-2xl p-3 text-center font-black ${portal === "student" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`} href="/login">Student Login</Link>
            <Link className={`rounded-2xl p-3 text-center font-black ${portal === "admin" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`} href="/login?portal=admin">Admin Login</Link>
          </div>
          <form action={loginAction} className="grid gap-4">
            <input type="hidden" name="role" value={portal} />
            <label className="grid gap-2 text-sm font-bold">Email Address<input className="input" name="email" type="email" required defaultValue={portal === "admin" ? "admin@eventsphere.edu" : "student@eventsphere.edu"} /></label>
            <label className="grid gap-2 text-sm font-bold">Password<input className="input" name="password" type="password" required defaultValue="EventSphere@2026" /></label>
            <button className="btn-primary mt-2" type="submit">Login to {portal === "admin" ? "Admin Panel" : "Student Dashboard"}</button>
          </form>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link href="/forgot-password">Forgot password?</Link>
            <Link href="/register" className="text-blue-600">Create student account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
