import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Staff sign in — Admin Portal",
};

function MonogramMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full border border-gold/50 bg-gradient-to-br from-navy via-navy-dark to-navy-dark shadow-lifted ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-3 h-10 w-10 rounded-full bg-gold/25 blur-xl"
      />
      <span className="relative font-display text-xl font-medium italic tracking-tight text-gold">
        Y
      </span>
    </span>
  );
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 7h12l1 13H5L6 7Z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 3v18h18" />
      <path d="m7 15 4-5 3 3 5-6" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const features = [
  { icon: BagIcon, title: "Orders & sales", note: "Process orders, issues and returns" },
  { icon: BoxIcon, title: "Inventory & stock", note: "Track stock with a full ledger" },
  { icon: UsersIcon, title: "Staff & roles", note: "Control who does what" },
  { icon: ChartIcon, title: "Reports & insights", note: "Know your numbers in real time" },
];

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-ivory lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy-dark lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(760px 480px at 88% 6%, rgb(201 162 39 / 0.16), transparent 65%), radial-gradient(620px 420px at 4% 96%, rgb(201 162 39 / 0.09), transparent 60%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(248 246 241 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(248 246 241 / 0.045) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
        />

        <div className="relative flex items-center gap-3.5">
          <MonogramMark className="h-12 w-12" />
          <div>
            <p className="font-display text-lg font-medium tracking-tight text-ivory">
              Yemanuel<span className="text-gold">.</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/80">
              Admin Portal
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
            Staff only
          </span>
          <h1 className="mt-4 text-balance font-display text-3xl font-medium leading-[1.1] tracking-tight text-ivory xl:text-4xl">
            Command your store,{" "}
            <em className="italic text-gold">anytime, anywhere.</em>
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ivory/65">
            Everything Yemanuel Store runs on — sales, stock, staff and
            reports — in one secure workspace.
          </p>

          <ul className="mt-8 space-y-4">
            {features.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gold/25 bg-gold/10 text-gold">
                  <feature.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ivory">{feature.title}</p>
                  <p className="text-xs leading-5 text-ivory/55">{feature.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-ivory/45">
          <span className="inline-flex items-center gap-1.5">
            <ShieldIcon className="h-3.5 w-3.5 text-gold/70" />
            Protected access — authorized staff only
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-ivory/20" />
          <span>© {new Date().getFullYear()} Yemanuel Store · Accra, Ghana</span>
        </div>
      </aside>

      <section className="relative flex items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(560px 340px at 100% 0%, rgb(201 162 39 / 0.07), transparent 60%)",
          }}
        />

        <div className="relative w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <MonogramMark className="h-10 w-10" />
            <div>
              <p className="font-display text-lg font-medium tracking-tight text-navy">
                Yemanuel<span className="text-gold">.</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
                Admin Portal
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to store
          </Link>

          <div className="relative mt-4 overflow-hidden rounded-xl border border-line bg-paper shadow-lifted">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
            />
            <div className="p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
                Welcome back
              </p>
              <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">
                Staff sign in
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-ink-soft">
                Sign in with your Yemanuel Store staff account.
              </p>

              <div className="mt-6">
                <AdminLoginForm />
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-ink-soft">
            Customer shopping account?{" "}
            <Link
              href="/login"
              className="font-semibold text-navy transition-colors hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              Sign in to the store
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}