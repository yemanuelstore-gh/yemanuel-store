import { AdminBadge } from "@/components/admin/admin-badge";
import { quotationStatusLabel, type QuotationStatus } from "@/lib/admin/quotations";
import { quotationStatusTone } from "@/lib/admin/labels";

export function QuotationBadge({ status }: { status: QuotationStatus }) {
  return (
    <AdminBadge tone={quotationStatusTone(status)}>
      {quotationStatusLabel(status)}
    </AdminBadge>
  );
}