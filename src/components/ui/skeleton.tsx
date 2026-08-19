import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("erp-skeleton rounded-md", className)}
      {...props}
    />
  );
}