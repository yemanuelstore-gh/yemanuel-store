import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/storefront/button-link";
import { cn } from "@/lib/cn";

export type EmptyCatalogueStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function EmptyCatalogueState({
  title = "Products are being prepared",
  description = "Fashion and electronics are being curated for the store. Check back soon as the shelves fill up.",
  className,
}: EmptyCatalogueStateProps) {
  return (
    <Card className={cn("p-10 text-center lg:p-14", className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-soft">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-navy"
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
        {description}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/shop" size="sm">
          Browse the shop
        </ButtonLink>
        <ButtonLink href="/shop" variant="secondary" size="sm">
          Explore categories
        </ButtonLink>
      </div>
    </Card>
  );
}