import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Eye, ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeroBannerContent } from "@/components/site/HeroBanner";
import { uploadImage } from "@/lib/api";
import {
  HERO_BANNER_TYPES,
  HERO_BANNER_TYPE_LABELS,
  isBannerLive,
  useDeleteHeroBanner,
  useHeroBanners,
  useSaveHeroBanner,
  useToggleHeroBanner,
  type HeroBannerRow,
  type HeroBannerType,
} from "@/lib/marketing";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({
    meta: [
      { title: "Hero Banner — Crave Cartel Admin" },
      {
        name: "description",
        content:
          "Create, schedule and publish the homepage hero banner for launches, festival offers and combo promotions.",
      },
      { property: "og:title", content: "Hero Banner — Crave Cartel Admin" },
      {
        property: "og:description",
        content: "Control the homepage hero without touching any code.",
      },
    ],
  }),
  component: HeroBannerAdmin,
});

type FormState = {
  enabled: boolean;
  banner_type: HeroBannerType;
  title: string;
  subtitle: string;
  description: string;
  primary_button_text: string;
  primary_button_link: string;
  secondary_button_text: string;
  secondary_button_link: string;
  image_url: string | null;
  start_date: string;
  end_date: string;
  priority: string;
};

const EMPTY_FORM: FormState = {
  enabled: false,
  banner_type: "general",
  title: "",
  subtitle: "",
  description: "",
  primary_button_text: "Browse Menu",
  primary_button_link: "/menu",
  secondary_button_text: "Order Now",
  secondary_button_link: "/checkout",
  image_url: null,
  start_date: "",
  end_date: "",
  priority: "0",
};

/** timestamptz <-> value accepted by <input type="datetime-local"> */
function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function toPreview(form: FormState): HeroBannerRow {
  return {
    id: "preview",
    enabled: form.enabled,
    banner_type: form.banner_type,
    title: form.title || "Your headline goes here",
    subtitle: form.subtitle,
    description: form.description,
    primary_button_text: form.primary_button_text,
    primary_button_link: form.primary_button_link,
    secondary_button_text: form.secondary_button_text,
    secondary_button_link: form.secondary_button_link,
    image_url: form.image_url,
    start_date: fromLocalInput(form.start_date),
    end_date: fromLocalInput(form.end_date),
    priority: Number(form.priority) || 0,
    created_at: new Date().toISOString(),
  };
}

function HeroBannerAdmin() {
  const { data: banners, isLoading } = useHeroBanners();
  const saveBanner = useSaveHeroBanner();
  const toggleBanner = useToggleHeroBanner();
  const deleteBanner = useDeleteHeroBanner();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HeroBannerRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(banner: HeroBannerRow) {
    setEditing(banner);
    setForm({
      enabled: banner.enabled,
      banner_type: banner.banner_type,
      title: banner.title,
      subtitle: banner.subtitle,
      description: banner.description,
      primary_button_text: banner.primary_button_text,
      primary_button_link: banner.primary_button_link,
      secondary_button_text: banner.secondary_button_text,
      secondary_button_link: banner.secondary_button_link,
      image_url: banner.image_url,
      start_date: toLocalInput(banner.start_date),
      end_date: toLocalInput(banner.end_date),
      priority: String(banner.priority),
    });
    setOpen(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, form.image_url, "banners");
      update("image_url", url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast.error("A banner title is required.");
      return;
    }
    saveBanner.mutate(
      {
        id: editing?.id,
        enabled: form.enabled,
        banner_type: form.banner_type,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        primary_button_text: form.primary_button_text.trim(),
        primary_button_link: form.primary_button_link.trim(),
        secondary_button_text: form.secondary_button_text.trim(),
        secondary_button_link: form.secondary_button_link.trim(),
        image_url: form.image_url,
        start_date: fromLocalInput(form.start_date),
        end_date: fromLocalInput(form.end_date),
        priority: Number(form.priority) || 0,
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Banner updated" : "Banner created");
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save banner"),
      },
    );
  }

  return (
    <AdminShell
      title="Hero Banner"
      description="Publish a promotional homepage hero. Disable it and the default hero comes back instantly."
      actions={
        <Button variant="ember" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Banner
        </Button>
      }
    >
      <div className="rounded-3xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Only one banner can be live at a time — enabling a banner automatically disables the
          others. A banner outside its start/end window is skipped and the website falls back to the
          default hero.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-5 grid place-items-center rounded-3xl border border-border bg-card py-20">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (banners ?? []).length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
          <p className="font-display text-lg font-bold">No hero banners yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one to take over the homepage hero for a launch or an offer.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {(banners ?? []).map((b, i) => {
            const live = isBannerLive(b);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.25) }}
                className="overflow-hidden rounded-3xl border border-border bg-card"
              >
                <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 p-4">
                  <img
                    src={b.image_url || "/menu/hero-burger.jpg"}
                    alt={b.title}
                    className="h-24 w-full rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {HERO_BANNER_TYPE_LABELS[b.banner_type]}
                      </span>
                      <span
                        className={
                          live
                            ? "rounded-full bg-veg/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-veg"
                            : "rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                        }
                      >
                        {live ? "Live" : "Inactive"}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Priority {b.priority}
                      </span>
                    </div>
                    <p className="mt-2 truncate font-display text-lg font-bold">{b.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{b.subtitle}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <Switch
                      checked={b.enabled}
                      onCheckedChange={(v) =>
                        toggleBanner.mutate(
                          { id: b.id, enabled: v },
                          {
                            onError: (e) =>
                              toast.error(e instanceof Error ? e.message : "Update failed"),
                          },
                        )
                      }
                    />
                    Enabled
                  </label>
                  <div className="flex gap-2">
                    <Button variant="ghostline" size="sm" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="ghostline"
                      size="sm"
                      onClick={() => {
                        if (!window.confirm(`Delete banner "${b.title}"?`)) return;
                        deleteBanner.mutate(b.id, {
                          onSuccess: () => toast.success("Banner deleted"),
                          onError: (e) =>
                            toast.error(e instanceof Error ? e.message : "Delete failed"),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------ form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Hero Banner" : "New Hero Banner"}</DialogTitle>
            <DialogDescription>
              Everything below is rendered on the homepage hero. Leave a button label empty to hide
              that button.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Banner type</Label>
                <Select
                  value={form.banner_type}
                  onValueChange={(v) => update("banner_type", v as HeroBannerType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HERO_BANNER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {HERO_BANNER_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => update("priority", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Diwali Feast Box"
              />
            </div>

            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                placeholder="Flat 25% off till Sunday"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Short supporting line shown under the subtitle."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary button text</Label>
                <Input
                  value={form.primary_button_text}
                  onChange={(e) => update("primary_button_text", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary button link</Label>
                <Input
                  value={form.primary_button_link}
                  onChange={(e) => update("primary_button_link", e.target.value)}
                  placeholder="/menu"
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary button text</Label>
                <Input
                  value={form.secondary_button_text}
                  onChange={(e) => update("secondary_button_text", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary button link</Label>
                <Input
                  value={form.secondary_button_link}
                  onChange={(e) => update("secondary_button_link", e.target.value)}
                  placeholder="/checkout"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => update("start_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => update("end_date", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hero image</Label>
              <div className="flex items-center gap-3">
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Hero preview"
                    className="h-20 w-28 rounded-xl object-cover"
                  />
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {form.image_url ? "Replace image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <Switch checked={form.enabled} onCheckedChange={(v) => update("enabled", v)} />
              <span className="text-sm font-semibold">
                Enable this banner (disables any other live banner)
              </span>
            </label>

            <Button variant="ghostline" onClick={() => setPreviewing((p) => !p)}>
              <Eye className="h-4 w-4" /> {previewing ? "Hide preview" : "Preview banner"}
            </Button>

            {previewing && (
              <div className="overflow-hidden rounded-3xl border border-border bg-background py-8">
                <div className="pointer-events-none scale-[0.8] origin-top">
                  <HeroBannerContent banner={toPreview(form)} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghostline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="ember" onClick={handleSave} disabled={saveBanner.isPending}>
              {saveBanner.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
