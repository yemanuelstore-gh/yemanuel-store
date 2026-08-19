import { Alert } from "@/components/ui/alert";

export function NoAccess({ module }: { module: string }) {
  return (
    <Alert variant="info" title="No access">
      You do not have permission to view {module}. Contact the store
      administrator if you believe this is a mistake.
    </Alert>
  );
}