import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

/**
 * Append an audit-log entry. Writes go through the service-role client
 * because app.write_audit_log is granted to service_role only; the actor
 * is passed explicitly so the entry is attributed to the signed-in staff
 * member. Audit failures never break the primary operation.
 */
export async function writeAuditLog(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isServiceConfigured()) return;
  try {
    const service = createServiceClient();
    await service.schema("app").rpc("write_audit_log", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_metadata: metadata ?? null,
      p_actor_id: actorId,
    });
  } catch {
    // Audit logging is best-effort.
  }
}