import { cn } from "@/lib/cn";
import { statusBadgeTone, type BadgeTone } from "@/lib/admin/labels";

export function AdminBadge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium leading-4",
        statusBadgeTone(tone),
        className,
      )}
    >
      {children}
    </span>
  );
}