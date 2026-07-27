import { useStoreStatus } from "@/lib/store-status";
import { cn } from "@/lib/utils";

export function StoreStatusBadge({ className }: { className?: string }) {
  const { isOpen, ready, statusTitle, statusDetail } = useStoreStatus();
  if (!ready) return null;

  return (
    <span
      className={cn(
        "flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-left",
        className,
      )}
      title={statusDetail}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {isOpen && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-veg opacity-70" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            isOpen ? "bg-veg" : "bg-primary",
          )}
        />
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block text-[11px] font-bold leading-none",
            isOpen ? "text-veg" : "text-primary",
          )}
        >
          {statusTitle}
        </span>
        <span className="block text-[10px] leading-none text-muted-foreground mt-0.5">
          {statusDetail}
        </span>
      </span>
    </span>
  );
}

export function StoreClosedBanner({ className }: { className?: string }) {
  const { isOpen, ready, closedMessage } = useStoreStatus();
  if (!ready || isOpen) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground/90",
        className,
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
      {closedMessage}
    </div>
  );
}
