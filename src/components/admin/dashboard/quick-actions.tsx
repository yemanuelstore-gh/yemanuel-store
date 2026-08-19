import Link from "next/link";
import { ContentSection } from "@/components/admin/content-section";
import { Icon, type IconName } from "@/components/ui/icons";

export type QuickAction = {
  label: string;
  href: string;
  icon: IconName;
};

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null;

  return (
    <ContentSection
      className="mt-4"
      title="Quick Actions"
      description="Fast access to common operational tasks"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-2.5 rounded-md border border-erp-border bg-white px-3 py-2.5 text-left transition-colors hover:border-erp-gold hover:bg-erp-canvas/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-erp-border bg-erp-canvas text-erp-text-secondary transition-colors group-hover:border-erp-gold/40 group-hover:text-erp-navy">
              <Icon name={action.icon} size={14} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-erp-text">
                {action.label}
              </span>
              <span className="block truncate text-[10px] text-erp-text-muted">
                {action.href.replace(/^\/admin/, "") || "/"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </ContentSection>
  );
}