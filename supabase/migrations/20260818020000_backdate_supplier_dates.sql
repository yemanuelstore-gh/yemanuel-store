-- Backdate the 85 live suppliers' creation timestamps to the historical
-- opening day (2022-01-17) so they align with the seeded transaction period.
--
-- The suppliers were created through the store app on 2026-08-18, but the
-- historical dataset (20260818010000_historical_transactions.sql) references
-- them for purchases dating back to 2022-01-17. Their created_at must sit at
-- or before the earliest referenced transaction.
--
-- Targets only suppliers created on/after 2026-08-18 (the 85 live ones);
-- idempotent — re-running is a no-op.

set search_path = public, extensions;

update public.suppliers
set created_at = '2022-01-17T00:00:00Z',
    updated_at = '2022-01-17T00:00:00Z'
where created_at >= '2026-08-18T00:00:00Z';