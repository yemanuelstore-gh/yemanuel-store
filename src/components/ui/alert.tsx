import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icons";

export type AlertVariant = "info" | "success" | "warning" | "danger";

const variantClasses: Record<AlertVariant, { box: string; icon: IconName }> = {
  info: { box: "border-erp-info/30 bg-erp-info-soft text-erp-info", icon: "info" },
  success: { box: "border-erp-success/30 bg-erp-success-soft text-erp-success", icon: "check" },
  warning: { box: "border-erp-warning/30 bg-erp-warning-soft text-erp-warning", icon: "alert" },
  danger: { box: "border-erp-cancelled/30 bg-erp-cancelled-soft text-erp-cancelled", icon: "cancel" },
};

export type AlertProps = ComponentProps<"div"> & {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
  ...props
}: AlertProps) {
  const styles = variantClasses[variant];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-[13px]",
        styles.box,
        className,
      )}
      {...props}
    >
      <Icon name={styles.icon} size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && "mt-0.5", "leading-relaxed")}>{children}</div>
      </div>
    </div>
  );
}