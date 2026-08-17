import { isAllowedStoreImage } from "@/lib/image-config";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PosCatalogueItem } from "@/lib/pos/types";
import { PosIcon } from "./pos-icons";

export function ProductTile({
  item,
  onAdd,
}: {
  item: PosCatalogueItem;
  onAdd: (item: PosCatalogueItem) => void;
}) {
  const outOfStock = item.available <= 0;

  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      disabled={outOfStock}
      title={
        outOfStock
          ? `${item.productName} — out of stock`
          : `Add ${item.productName} to the sale`
      }
      className={cn(
        "group flex flex-col overflow-hidden rounded-md border border-line bg-white text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy",
        outOfStock
          ? "cursor-not-allowed opacity-60"
          : "hover:border-navy/40 hover:shadow-soft",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-line/30">
        {item.imageUrl && isAllowedStoreImage(item.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-faint">
            <PosIcon name="image" className="h-6 w-6" />
          </div>
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-navy/70 px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-ivory">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-1.5">
        <span className="line-clamp-1 text-[11px] font-medium leading-4 text-ink">
          {item.productName}
        </span>
        <span className="text-[10px] leading-3 text-ink-faint">
          {item.variantName}
          {item.sku ? ` · ${item.sku}` : ""}
        </span>
        <span className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold tabular-nums text-navy">
            {formatGHS(item.price)}
          </span>
          {item.salePrice !== null && (
            <span className="text-[10px] tabular-nums text-ink-faint line-through">
              {formatGHS(item.salePrice)}
            </span>
          )}
        </span>
        <span
          className={cn(
            "text-[10px] tabular-nums",
            outOfStock ? "text-danger" : "text-ink-faint",
          )}
        >
          {outOfStock ? "Unavailable" : `In stock: ${item.available}`}
        </span>
      </div>
    </button>
  );
}