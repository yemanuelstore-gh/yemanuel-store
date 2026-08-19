"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icons";

export type DialogProps = ComponentProps<"div"> & {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  width?: "sm" | "md" | "lg";
  children: ReactNode;
};

const widthClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  width = "md",
  children,
  className,
  ...props
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="erp-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-erp-navy-deep/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={cn(
          "erp-pop-in mt-8 w-full rounded-lg border border-erp-border bg-white shadow-erp-panel sm:mt-0",
          widthClasses[width],
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-erp-border px-5 py-4">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold text-erp-text">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-erp-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-erp-text-muted transition-colors hover:bg-erp-canvas hover:text-erp-text"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}