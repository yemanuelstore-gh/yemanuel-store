/**
 * Yemanuel Store business calendar.
 *
 * Single authoritative definition of the store's operating calendar, used by
 * every report, KPI, business-day calculation and (later) historical data
 * generation:
 *
 * - First operating day: Monday 17 January 2022.
 * - Operating days: Monday through Saturday.
 * - Sunday: closed (non-operating).
 * - Ghana is on UTC+0 with no daylight saving time, so all calendar math is
 *   performed in UTC.
 *
 * The same rules are mirrored in SQL (app.* functions in migration
 * 20260817020000_business_calendar.sql) so database-side logic stays aligned.
 */

export const BUSINESS_START_DATE = new Date(Date.UTC(2022, 0, 17));

const SUNDAY = 0;
const SATURDAY = 6;

export function addDaysUtc(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

export function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

export function isBusinessDay(date: Date): boolean {
  return date.getUTCDay() !== SUNDAY;
}

export function isOperatingDay(date: Date): boolean {
  return isBusinessDay(date);
}

export function isClosedDay(date: Date): boolean {
  return date.getUTCDay() === SUNDAY;
}

export function nextBusinessDay(date: Date): Date {
  let cursor = addDaysUtc(date, 1);
  while (!isBusinessDay(cursor)) {
    cursor = addDaysUtc(cursor, 1);
  }
  return cursor;
}

export function previousBusinessDay(date: Date): Date {
  let cursor = addDaysUtc(date, -1);
  while (!isBusinessDay(cursor)) {
    cursor = addDaysUtc(cursor, -1);
  }
  return cursor;
}

export function getPreviousBusinessDay(date: Date): Date {
  return previousBusinessDay(date);
}

export function countBusinessDays(start: Date, end: Date): number {
  const from =
    startOfDayUtc(start) < BUSINESS_START_DATE ? BUSINESS_START_DATE : startOfDayUtc(start);
  const to = startOfDayUtc(end);
  if (to < from) return 0;
  let count = 0;
  let cursor = from;
  while (cursor <= to) {
    if (isBusinessDay(cursor)) count += 1;
    cursor = addDaysUtc(cursor, 1);
  }
  return count;
}

export function businessDayNumber(date: Date): number {
  return countBusinessDays(BUSINESS_START_DATE, date);
}

export type DayRange = {
  start: Date;
  end: Date;
};

/**
 * Business week runs Monday 00:00 to Saturday 23:59:59.999 (UTC). Sundays
 * belong to the business week that just ended.
 */
export function getBusinessWeekRange(date: Date): DayRange {
  const day = date.getUTCDay();
  const daysBackToMonday = day === SUNDAY ? SATURDAY : day - 1;
  const monday = startOfDayUtc(addDaysUtc(date, -daysBackToMonday));
  return { start: monday, end: endOfDayUtc(addDaysUtc(monday, 5)) };
}

export function getMonthRange(date: Date): DayRange {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start, end: endOfDayUtc(end) };
}

export function getYearRange(date: Date): DayRange {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), 11, 31));
  return { start, end: endOfDayUtc(end) };
}

export function businessDayAverage(total: number, start: Date, end: Date): number {
  const days = countBusinessDays(start, end);
  return days === 0 ? 0 : total / days;
}