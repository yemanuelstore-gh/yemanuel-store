-- Expose the app schema to PostgREST so app.* functions can be invoked via
-- RPC from the application (business calendar, document numbering, audit
-- log, RLS helpers).
--
-- Previously only the public schema was exposed: rpc calls to app functions
-- (e.g. next_document_number, write_audit_log) failed silently and callers
-- fell back to timestamps or no-ops. This migration tightens grants first,
-- then exposes the schema.

-- No app function may be callable by the public/anonymous role.
do $$
declare
  r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
  loop
    execute format('revoke execute on function app.%I(%s) from public', r.proname, r.args);
    execute format('grant execute on function app.%I(%s) to service_role', r.proname, r.args);
  end loop;
end
$$;

-- The two RLS helpers the application intentionally calls with the
-- authenticated role.
revoke execute on function app.has_permission(text) from public;
grant execute on function app.has_permission(text) to authenticated;

revoke execute on function app.current_customer_id() from public;
grant execute on function app.current_customer_id() to authenticated;

-- Allow PostgREST to resolve the app schema and reload its schema cache.
grant usage on schema app to authenticator;
alter role authenticator set pgrst.db_schemas = 'public, app';
notify pgrst, 'reload config';