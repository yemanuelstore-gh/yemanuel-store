"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const fieldClasses =
  "h-8 w-full rounded-md border border-line-strong bg-white px-2.5 text-[13px] text-ink placeholder:text-ink-faint transition-colors focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25 disabled:cursor-not-allowed disabled:bg-line/40 disabled:text-ink-faint";

export function Field({
  label,
  htmlFor,
  required,
  children,
  hint,
}: {
  label?: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft"
        >
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-[11px] leading-4 text-ink-faint">{hint}</p>}
    </div>
  );
}

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={cn(fieldClasses, props.className)} />;
}

export function TextArea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(fieldClasses, "h-auto min-h-20 py-2", props.className)}
    />
  );
}

export function Select(props: ComponentProps<"select">) {
  return (
    <select {...props} className={cn(fieldClasses, "pr-7", props.className)} />
  );
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 rounded border-line-strong accent-navy"
      />
      {label}
    </label>
  );
}

export function FormActions({
  submitLabel,
  pendingLabel,
  cancelHref,
  pending,
}: {
  submitLabel: string;
  pendingLabel: string;
  cancelHref?: string;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-line pt-4">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-8 items-center rounded-md bg-navy px-3.5 text-xs font-semibold text-white transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
      {cancelHref && (
        <Link
          href={cancelHref}
          className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
        >
          Cancel
        </Link>
      )}
    </div>
  );
}

export type ActionResult = {
  ok: boolean;
  message: string;
};

export function ActionForm({
  action,
  submitLabel,
  pendingLabel,
  cancelHref,
  className,
  children,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  pendingLabel: string;
  cancelHref?: string;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: true, message: "" });
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.message !== "") {
      messageRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [state.message]);

  return (
    <form action={formAction} className={className}>
      {children}
      {state.message !== "" && (
        <p
          ref={messageRef}
          role={state.ok ? "status" : "alert"}
          className={cn(
            "mb-3 rounded-md border px-3 py-2 text-xs leading-5",
            state.ok
              ? "border-line bg-navy-soft/60 text-navy"
              : "border-danger/30 bg-danger-soft text-danger",
          )}
        >
          {state.message}
        </p>
      )}
      <FormActions
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
        cancelHref={cancelHref}
        pending={pending}
      />
    </form>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-ink">{title}</h1>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-ink-soft">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const classes = {
    primary:
      "bg-navy text-white hover:bg-navy-dark focus-visible:outline-navy",
    secondary:
      "border border-line-strong bg-white text-ink hover:bg-line/40 focus-visible:outline-navy",
    danger:
      "bg-danger text-white hover:bg-danger-dark focus-visible:outline-danger",
  }[variant];
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-8 items-center rounded-md px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        classes,
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SearchForm({
  placeholder,
  initialValue,
  extraFields,
}: {
  placeholder: string;
  initialValue: string;
  extraFields?: ReactNode;
}) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-center gap-2"
      role="search"
    >
      {extraFields}
      <input
        type="search"
        name="q"
        defaultValue={initialValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(fieldClasses, "w-56")}
      />
      <button
        type="submit"
        className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
      >
        Search
      </button>
    </form>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams = new URLSearchParams(),
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams?: URLSearchParams;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-xs text-ink-soft">
        {total === 0 ? "No records" : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "inline-flex h-7 items-center rounded-md border border-line-strong bg-white px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40",
            page <= 1 && "pointer-events-none opacity-40",
          )}
        >
          Previous
        </Link>
        <span className="px-1 text-xs text-ink-soft">
          Page {page} of {totalPages}
        </span>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(
            "inline-flex h-7 items-center rounded-md border border-line-strong bg-white px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40",
            page >= totalPages && "pointer-events-none opacity-40",
          )}
        >
          Next
        </Link>
      </div>
    </div>
  );
}

export function AdminEmptyState({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-ink-soft">{message}</p>
      {actionHref && actionLabel && (
        <AdminButtonLink href={actionHref} className="mt-4">
          {actionLabel}
        </AdminButtonLink>
      )}
    </div>
  );
}

export function InlineSubmitForm({
  action,
  label,
  pendingLabel,
  variant = "danger",
  children,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: true, message: "" });
  const classes = {
    primary: "bg-navy text-white hover:bg-navy-dark",
    secondary:
      "border border-line-strong bg-white text-ink-soft hover:bg-line/40 hover:text-ink",
    danger: "border border-danger/30 bg-white text-danger hover:bg-danger-soft",
  }[variant];
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      {children}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-50",
          classes,
        )}
      >
        {pending ? pendingLabel : label}
      </button>
      {state.message !== "" && (
        <span
          role={state.ok ? "status" : "alert"}
          className={cn("text-[11px]", state.ok ? "text-navy" : "text-danger")}
        >
          {state.message}
        </span>
      )}
    </form>
  );
}

export function AdminTable({
  head,
  children,
}: {
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-line-strong bg-line/30">{head}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-soft",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-3 py-2 align-middle", className)}>
      {children}
    </td>
  );
}

export function DataRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-1.5">
      <dt className="text-xs font-medium text-ink-faint">{label}</dt>
      <dd className="text-right text-[13px] font-medium text-ink">{value}</dd>
    </div>
  );
}