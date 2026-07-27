import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStoreSettings, useSaveSettings, uploadImage } from "@/lib/api";
import {
  TIME_ZONES,
  formatTimeLabel,
  toMinutes,
  useStoreStatus,
  type OverrideMode,
} from "@/lib/store-status";
import { cn } from "@/lib/utils";

const OVERRIDES: { value: OverrideMode; label: string }[] = [
  { value: "auto", label: "Auto Mode" },
  { value: "open", label: "Force Open" },
  { value: "closed", label: "Force Closed" },
];

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Crave Cartel Admin" },
      {
        name: "description",
        content:
          "Update store details, WhatsApp number, opening hours, announcement banner and brand assets.",
      },
      { property: "og:title", content: "Settings — Crave Cartel Admin" },
      { property: "og:description", content: "Store profile and brand configuration." },
    ],
  }),
  component: SettingsPage,
});

type FormState = {
  store_name: string;
  whatsapp: string;
  phone: string;
  instagram_url: string;
  maps_url: string;
  address: string;
  announcement_text: string;
  announcement_enabled: boolean;
  logo_url: string | null;
  hero_banner_url: string | null;
};

function SettingsPage() {
  const { hours, setHours, isOpen, statusDetail } = useStoreStatus();
  const { data: settings } = useStoreSettings();
  const saveSettings = useSaveSettings();

  const [form, setForm] = useState<FormState | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (settings && !initialized) {
      setForm({
        store_name: settings.store_name,
        whatsapp: settings.whatsapp,
        phone: settings.phone,
        instagram_url: settings.instagram_url,
        maps_url: settings.maps_url,
        address: settings.address,
        announcement_text: settings.announcement_text,
        announcement_enabled: settings.announcement_enabled,
        logo_url: settings.logo_url,
        hero_banner_url: settings.hero_banner_url,
      });
      setInitialized(true);
    }
  }, [settings, initialized]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!form) return;
    saveSettings.mutate(form, {
      onSuccess: () => toast.success("Settings saved"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save settings"),
    });
  }

  async function handleUpload(kind: "logo_url" | "hero_banner_url", file: File) {
    const setUploading = kind === "logo_url" ? setUploadingLogo : setUploadingBanner;
    setUploading(true);
    try {
      const url = await uploadImage(file, form?.[kind] ?? null);
      update(kind, url);
      toast.success("Image uploaded — remember to Save changes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!form) {
    return (
      <AdminShell title="Settings" description="Store profile, contact links and branding">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Settings"
      description="Store profile, contact links and branding"
      actions={
        <Button variant="ember" size="sm" onClick={handleSave} disabled={saveSettings.isPending}>
          {saveSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Store details">
          <FieldRow
            label="Store name"
            value={form.store_name}
            onChange={(v) => update("store_name", v)}
          />
          <FieldRow
            label="WhatsApp number (digits only, with country code)"
            value={form.whatsapp}
            onChange={(v) => update("whatsapp", v.replace(/[^0-9]/g, ""))}
          />
          <FieldRow label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
          <FieldRow
            label="Instagram"
            value={form.instagram_url}
            onChange={(v) => update("instagram_url", v)}
          />
          <FieldRow
            label="Google Maps link"
            value={form.maps_url}
            onChange={(v) => update("maps_url", v)}
          />
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              rows={3}
              className="rounded-xl border-border bg-surface"
            />
          </div>
        </Card>

        <Card title="Kitchen hours">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Opening time</Label>
              <Input
                type="time"
                value={hours.openTime}
                onChange={(e) => setHours({ openTime: e.target.value })}
                className="h-11 rounded-xl border-border bg-surface"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Closing time</Label>
              <Input
                type="time"
                value={hours.closeTime}
                onChange={(e) => setHours({ closeTime: e.target.value })}
                className="h-11 rounded-xl border-border bg-surface"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Overnight hours are supported — {formatTimeLabel(hours.openTime)} to{" "}
            {formatTimeLabel(hours.closeTime)}
            {toMinutes(hours.closeTime) <= toMinutes(hours.openTime) ? " (next day)" : ""}.
          </p>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Time zone</Label>
            <Select value={hours.timeZone} onValueChange={(v) => setHours({ timeZone: v })}>
              <SelectTrigger className="h-11 rounded-xl border-border bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_ZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Manual override</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {OVERRIDES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setHours({ override: o.value })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-300",
                    hours.override === o.value
                      ? "border-primary bg-primary/12 text-primary"
                      : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Override always takes priority over the automatic schedule. Hours and overrides save
              instantly; other fields save with the button above.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Store is currently {isOpen ? "open" : "closed"}</p>
              <p className="text-xs text-muted-foreground">{statusDetail}</p>
            </div>
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                isOpen ? "bg-veg" : "bg-primary",
              )}
            />
          </div>
        </Card>

        <Card title="Announcement banner">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Message</Label>
            <div className="relative">
              <Megaphone className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-primary" />
              <Textarea
                value={form.announcement_text}
                onChange={(e) => update("announcement_text", e.target.value)}
                rows={3}
                className="rounded-xl border-border bg-surface pl-11"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Show banner on site</span>
            <Switch
              checked={form.announcement_enabled}
              onCheckedChange={(v) => update("announcement_enabled", v)}
            />
          </div>
        </Card>

        <Card title="Brand assets">
          <Upload
            label="Logo"
            hint="SVG or PNG · transparent · 512×512"
            imageUrl={form.logo_url}
            uploading={uploadingLogo}
            onFile={(f) => void handleUpload("logo_url", f)}
          />
          <Upload
            label="Hero banner"
            hint="JPG · 1600×900 or larger"
            imageUrl={form.hero_banner_url}
            uploading={uploadingBanner}
            onFile={(f) => void handleUpload("hero_banner_url", f)}
          />
        </Card>
      </div>
    </AdminShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function FieldRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border-border bg-surface"
      />
    </div>
  );
}

function Upload({
  label,
  hint,
  imageUrl,
  uploading,
  onFile,
}: {
  label: string;
  hint: string;
  imageUrl: string | null;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center transition-colors hover:border-primary/50">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
        {imageUrl && !uploading ? (
          <img
            src={imageUrl}
            alt={label}
            className="h-16 w-16 rounded-xl border border-border object-cover"
          />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-sm font-semibold">
          {uploading ? "Uploading…" : imageUrl ? "Click to replace" : "Click to upload"}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </label>
    </div>
  );
}
