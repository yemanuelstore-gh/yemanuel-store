import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Supabase Setup",
};

export const dynamic = "force-dynamic";

function maskSecret(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 8)}${"•".repeat(12)}`;
}

export default function SupabaseSetupPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const rows = [
    {
      variable: "NEXT_PUBLIC_SUPABASE_URL",
      configured: Boolean(url),
      value: url ? new URL(url).host : "",
    },
    {
      variable: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      configured: Boolean(anonKey),
      value: maskSecret(anonKey),
    },
    {
      variable: "SUPABASE_SERVICE_ROLE_KEY",
      configured: Boolean(serviceRoleKey),
      value: "",
    },
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-zinc-900">
      <Link
        href="/admin"
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        ← Back to admin
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Supabase configuration
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Developer-facing status page. Values are masked and secrets are never
        rendered. Public variables reflect the values available at build time.
      </p>
      <Card className="mt-6 divide-y divide-zinc-100">
        {rows.map((row) => (
          <div
            key={row.variable}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-zinc-800">
                {row.variable}
              </p>
              {row.value ? (
                <p className="mt-0.5 font-mono text-xs text-zinc-500">
                  {row.value}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-zinc-400">Not displayed</p>
              )}
            </div>
            <Badge variant={row.configured ? "success" : "warning"}>
              {row.configured ? "Configured" : "Missing"}
            </Badge>
          </div>
        ))}
      </Card>
      <p className="mt-4 text-xs text-zinc-500">
        Copy <code className="font-mono">.env.example</code> to{" "}
        <code className="font-mono">.env.local</code> and restart the
        development server after changing environment variables.
      </p>
    </div>
  );
}