import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type PageContainerProps = ComponentProps<"div"> & {
  padded?: boolean;
};

export function PageContainer({
  padded = true,
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1440px]",
        padded && "px-4 py-5 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}