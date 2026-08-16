import { cn } from "@/lib/cn";
import type { StatusTone } from "@/lib/status";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-line/50 text-ink-soft",
  progress: "bg-gold-soft text-gold-dark",
  active: "bg-navy-soft text-navy",
  done: "bg-navy text-ivory",
  muted: "bg-line/50 text-ink-faint",
  danger: "bg-danger-soft text-danger",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}