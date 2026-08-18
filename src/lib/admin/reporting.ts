import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { BadgeTone } from "@/lib/admin/labels";

/**
 * Shared helpers for the Receivables, Payables and Reports modules.
 *
 * Aggregations that already exist as app.* SQL functions are called through
 * `reportRpc` (SECURITY INVOKER, so RLS and per-module permissions apply).
 * Where no server-side aggregate exists (per-product rollups, aging buckets,
 * HR headcounts) this module provides `fetchAllPaged`, which pages through
 * the PostgREST 1,000-row cap so app-side aggregation is exact at any data
 * volume instead of silently truncated.
 */

type RpcResult<T> = { ok: true; data: T } | { ok: false };

export async function reportRpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<RpcResult<T>> {
  try {
    const client = await createClient();
    const { data, error } = await client.schema("app").rpc(name, args);
    if (error) {
      console.error(
        `[reporting] RPC ${name} failed: code=${error.code} message=${error.message} details=${error.details ?? ""} hint=${error.hint ?? ""}`,
      );
      return { ok: false };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    console.error(`[reporting] RPC ${name} threw:`, err);
    return { ok: false };
  }
}

/**
 * dashboard_inventory_trend internally calls app.business_start_date(),
 * which is granted to service_role only (migration 20260817030000), so the
 * call runs with the service client, bypassing RLS. Server-side only; the
 * UI renders it only when the staff member has inventory.read. This mirrors
 * the documented precedent in src/lib/admin/dashboard.ts.
 */
export async function serviceReportRpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<RpcResult<T>> {
  try {
    const service = createServiceClient();
    const { data, error } = await service.schema("app").rpc(name, args);
    if (error) {
      console.error(
        `[reporting] RPC ${name} failed (service): code=${error.code} message=${error.message}`,
      );
      return { ok: false };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    console.error(`[reporting] RPC ${name} threw (service):`, err);
    return { ok: false };
  }
}

export function take<T>(result: RpcResult<T>): T | null {
  return result.ok ? result.data : null;
}

/** Format a Date as YYYY-MM-DD (UTC), matching the app's date conventions. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Fetch every row of a query by walking pages of `pageSize`, so app-side
 * aggregation is exact beyond the PostgREST default 1,000-row cap.
 *
 * `fetcher` must build a fresh query each call (supabase builders are
 * stateful) and apply the given range window before returning.
 */
export async function fetchAllPaged<T>(
  fetcher: (rangeFrom: number, rangeTo: number) => PromiseLike<{ data: unknown }>,
  pageSize = 1000,
  maxPages = 50,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetcher(page * pageSize, page * pageSize + pageSize - 1);
    if (!result) return rows;
    const batch = (result.data ?? []) as unknown as T[];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
  return rows;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days elapsed between a timestamp and now (never negative). */
export function ageInDays(createdAt: string, now: Date): number {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((now.getTime() - created) / DAY_MS));
}

export type AgingBucket = "current" | "days_31_60" | "days_61_90" | "over_90";

export function agingBucketFor(ageDays: number): AgingBucket {
  if (ageDays <= 30) return "current";
  if (ageDays <= 60) return "days_31_60";
  if (ageDays <= 90) return "days_61_90";
  return "over_90";
}

export function agingBucketLabel(bucket: AgingBucket): string {
  switch (bucket) {
    case "current":
      return "Current (0–30 days)";
    case "days_31_60":
      return "31–60 days";
    case "days_61_90":
      return "61–90 days";
    case "over_90":
      return "Over 90 days";
  }
}

export function agingBucketTone(bucket: AgingBucket): BadgeTone {
  switch (bucket) {
    case "current":
      return "neutral";
    case "days_31_60":
      return "warning";
    case "days_61_90":
      return "warning";
    case "over_90":
      return "danger";
  }
}

/** "2026-08-01" (RPC month) or "2026-08-18" (day) -> "2026-08" month key. */
export function monthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** "2026-08" -> "Aug 2026". */
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** "2026-08-18" -> "18 Aug". */
export function shortDayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return day;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** ISO timestamp -> "18 Aug 2026" for compact report tables. */
export function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}