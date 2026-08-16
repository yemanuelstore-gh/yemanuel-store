import Link from "next/link";

export function UnauthorizedPage({
  title = "Access denied",
  message = "You do not have permission to view this section. Contact a store administrator if you believe this is a mistake.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-danger-soft">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-danger"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="mt-4 text-base font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-xs leading-5 text-ink-soft">{message}</p>
        <Link
          href="/admin"
          className="mt-6 inline-flex h-8 items-center rounded-md bg-navy px-4 text-xs font-semibold text-white transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export function NotStaffPage() {
  return (
    <UnauthorizedPage
      title="Staff access only"
      message="This area is reserved for Yemanuel Store staff. Sign out of your customer account and sign in with a staff account to continue."
    />
  );
}