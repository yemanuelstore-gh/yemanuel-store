-- Business calendar — single authoritative definition of Yemanuel Store's
-- operating calendar, mirrored from src/lib/business-calendar.ts so that
-- database-side logic (reporting, KPI aggregation, historical data
-- generation) applies the exact same rules.
--
-- First operating day: Monday 17 January 2022.
-- Operating days: Monday through Saturday.
-- Sunday: closed (non-operating).
-- Ghana is on UTC+0 without daylight saving time, so UTC is used throughout.

create or replace function app.business_start_date()
returns timestamptz
language sql
immutable
as $$
  select timestamptz '2022-01-17 00:00:00+00'
$$;

create or replace function app.is_business_day(d timestamptz)
returns boolean
language sql
immutable
as $$
  select extract(isodow from d at time zone 'UTC') between 1 and 6
$$;

create or replace function app.next_business_day(d timestamptz)
returns timestamptz
language plpgsql
immutable
as $$
declare
  cursor_d timestamptz := d + interval '1 day';
begin
  while not app.is_business_day(cursor_d) loop
    cursor_d := cursor_d + interval '1 day';
  end loop;
  return cursor_d;
end
$$;

create or replace function app.previous_business_day(d timestamptz)
returns timestamptz
language plpgsql
immutable
as $$
declare
  cursor_d timestamptz := d - interval '1 day';
begin
  while not app.is_business_day(cursor_d) loop
    cursor_d := cursor_d - interval '1 day';
  end loop;
  return cursor_d;
end
$$;

create or replace function app.business_days_between(start_d timestamptz, end_d timestamptz)
returns integer
language plpgsql
immutable
as $$
declare
  from_d date := greatest(start_d::date, (app.business_start_date())::date);
  to_d date := end_d::date;
  cursor_d date := from_d;
  total integer := 0;
begin
  while cursor_d <= to_d loop
    if app.is_business_day(cursor_d::timestamptz) then
      total := total + 1;
    end if;
    cursor_d := cursor_d + 1;
  end loop;
  return total;
end
$$;