import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5", className)}>
      <img
        src="/logo.png"
        alt="Crave Cartel Logo"
        className="h-13 w-13 rounded-xl object-cover transition-transform duration-300 group-hover:rotate-6"
      />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-[15px] font-extrabold tracking-tight">
            Crave Cartel
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Cloud Kitchen
          </span>
        </span>
      )}
    </Link>
  );
}
