import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ChefHat,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Loader2,
  Package,
  PlusSquare,
  Settings,
  Shapes,
  UtensilsCrossed,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Orders", to: "/admin/orders", icon: ListOrdered },
  { label: "Sales Entry", to: "/admin/sales-entry", icon: PlusSquare },
  { label: "Inventory", to: "/admin/inventory", icon: Package },
  { label: "Recipes", to: "/admin/recipes", icon: ChefHat },
  { label: "Reports", to: "/admin/reports", icon: BarChart3 },
  { label: "Menu", to: "/admin/menu", icon: UtensilsCrossed },
  { label: "Categories", to: "/admin/categories", icon: Shapes },
  { label: "Settings", to: "/admin/settings", icon: Settings },
] as const;

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!session || !isAdmin)) {
      void navigate({ to: "/admin/login" });
    }
  }, [loading, session, isAdmin, navigate]);

  if (loading || !session || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-sidebar lg:flex lg:h-screen lg:flex-col lg:sticky lg:top-0">
        <div className="px-5 py-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-300",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <n.icon className="h-4 w-4 shrink-0" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <button
            onClick={() => {
              void signOut().then(() => navigate({ to: "/admin/login" }));
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="no-scrollbar sticky top-0 z-40 flex gap-2 overflow-x-auto border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                pathname === n.to
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
          <button
            onClick={() => {
              void signOut().then(() => navigate({ to: "/admin/login" }));
            }}
            className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            Sign out
          </button>
        </div>

        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-4 py-6 sm:px-8">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
            {description && (
              <p className="mt-1 truncate text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions}
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
