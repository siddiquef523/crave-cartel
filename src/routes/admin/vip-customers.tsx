import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useVipCustomers,
  useSaveVipCustomer,
  useToggleVipCustomer,
  useDeleteVipCustomer,
  normalisePhone,
  isValidPhone,
  VIP_DISCOUNT_PERCENT,
  type VipCustomerRow,
} from "@/lib/vip";

export const Route = createFileRoute("/admin/vip-customers")({
  head: () => ({
    meta: [
      { title: "VIP Customers — Crave Cartel Admin" },
      {
        name: "description",
        content: `Saved mobile numbers that always get a ${VIP_DISCOUNT_PERCENT}% lifetime discount at checkout.`,
      },
      { property: "og:title", content: "VIP Customers — Crave Cartel Admin" },
      {
        property: "og:description",
        content: "Manage lifetime VIP discount mobile numbers.",
      },
    ],
  }),
  component: VipCustomersPage,
});

const PAGE_SIZE = 10;

function VipCustomersPage() {
  const { data: rows = [], isLoading } = useVipCustomers();
  const saveVip = useSaveVipCustomer();
  const toggleVip = useToggleVipCustomer();
  const deleteVip = useDeleteVipCustomer();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VipCustomerRow | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    const digits = normalisePhone(q);
    return rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q) ||
        (digits.length > 0 && r.phone.includes(digits)),
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeCount = rows.filter((r) => r.enabled).length;

  function openCreate() {
    setEditing(null);
    setPhone("");
    setName("");
    setNotes("");
    setEnabled(true);
    setOpen(true);
  }

  function openEdit(row: VipCustomerRow) {
    setEditing(row);
    setPhone(row.phone);
    setName(row.name ?? "");
    setNotes(row.notes ?? "");
    setEnabled(row.enabled);
    setOpen(true);
  }

  function handleSave() {
    if (!isValidPhone(phone)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }
    const digits = normalisePhone(phone);
    const duplicate = rows.find((r) => r.phone === digits && r.id !== editing?.id);
    if (duplicate) {
      toast.error("This mobile number is already a VIP customer.");
      return;
    }

    saveVip.mutate(
      { id: editing?.id, phone: digits, name, notes, enabled },
      {
        onSuccess: () => {
          toast.success(editing ? "VIP customer updated" : "VIP customer added");
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save VIP customer"),
      },
    );
  }

  async function handleDelete(row: VipCustomerRow) {
    if (!confirm(`Remove ${row.name || row.phone} from the VIP list?`)) return;
    setDeletingId(row.id);
    try {
      await deleteVip.mutateAsync(row.id);
      toast.success("VIP customer removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove VIP customer");
    } finally {
      setDeletingId(null);
    }
  }

  function handleToggle(row: VipCustomerRow, next: boolean) {
    toggleVip.mutate(
      { id: row.id, enabled: next },
      {
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update status"),
      },
    );
  }

  return (
    <AdminShell
      title="VIP Customers"
      description={`Saved mobile numbers always get ${VIP_DISCOUNT_PERCENT}% off — for life`}
      actions={
        <Button variant="ember" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add VIP number
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="VIP numbers" value={String(rows.length)} />
        <Kpi label="Active" value={String(activeCount)} />
        <Kpi label="Lifetime discount" value={`${VIP_DISCOUNT_PERCENT}%`} />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <Label htmlFor="vip-search">Search</Label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="vip-search"
            className="pl-9"
            placeholder="Name, mobile number or note"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Mobile number</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created at</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    No VIP customers yet
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-3 font-semibold">
                    <span className="flex items-center gap-2">
                      <Crown className="h-4 w-4 shrink-0 text-primary" />
                      {r.name || "—"}
                    </span>
                    {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">{r.phone}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-veg">
                    {VIP_DISCOUNT_PERCENT}%
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Switch
                        checked={r.enabled}
                        onCheckedChange={(v) => handleToggle(r, v)}
                        aria-label="Toggle VIP status"
                      />
                      <span className="text-xs font-semibold text-muted-foreground">
                        {r.enabled ? "Active" : "Disabled"}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center justify-end gap-2">
                      <Button variant="ghostline" size="sm" onClick={() => openEdit(r)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r)}
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {pageCount} · {filtered.length} number
            {filtered.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit VIP customer" : "Add VIP customer"}</DialogTitle>
            <DialogDescription>
              This mobile number gets {VIP_DISCOUNT_PERCENT}% off every order until you remove it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="vip-phone">Mobile number</Label>
              <Input
                id="vip-phone"
                inputMode="tel"
                className="mt-1.5"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vip-name">Customer name (optional)</Label>
              <Input
                id="vip-name"
                className="mt-1.5"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vip-notes">Notes (optional)</Label>
              <Textarea
                id="vip-notes"
                className="mt-1.5"
                rows={3}
                placeholder="Why this customer is a VIP"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Active</p>
                <p className="text-xs text-muted-foreground">
                  Disabled numbers stop receiving the discount.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="ember" disabled={saveVip.isPending} onClick={handleSave}>
              {saveVip.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add VIP number"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-3 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}
