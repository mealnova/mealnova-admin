"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Zod schema ────────────────────────────────────────────────────────────────

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color (e.g. #245945)");

const brandSchema = z.object({
  siteName: z.string().min(1, "Required"),
  tagline: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  address: z.string().min(1, "Required"),
  fssaiNumber: z.string(),
  gstin: z.string(),
  bankName: z.string(),
  bankAccount: z.string(),
  bankIfsc: z.string(),
  bankUpi: z.string(),
  colorPrimary500: hexColor,
  colorPrimary600: hexColor,
  colorPrimary400: hexColor,
  colorPrimary100: hexColor,
  colorPrimary50: hexColor,
  colorSecondary500: hexColor,
  colorSecondary600: hexColor,
  colorSecondary100: hexColor,
  colorSecondary50: hexColor,
  colorDarkPanelFrom: hexColor,
  colorDarkPanelTo: hexColor,
  colorFooterBg: hexColor,
  colorSurface: hexColor,
  colorSurfaceCard: hexColor,
  colorTextPrimary: hexColor,
  colorTextSecondary: hexColor,
  colorTextMuted: hexColor,
  fontDisplay: z.string().min(1),
  fontBody: z.string().min(1),
});

type BrandFormData = z.infer<typeof brandSchema>;

// ── Default values ────────────────────────────────────────────────────────────

const DEFAULTS: BrandFormData = {
  siteName: "",
  tagline: "",
  phone: "",
  email: "",
  address: "",
  fssaiNumber: "",
  gstin: "",
  bankName: "",
  bankAccount: "",
  bankIfsc: "",
  bankUpi: "",
  colorPrimary500: "#245945",
  colorPrimary600: "#1d4838",
  colorPrimary400: "#5a9f84",
  colorPrimary100: "#e8f2ec",
  colorPrimary50: "#f0f7f3",
  colorSecondary500: "#ad6f3e",
  colorSecondary600: "#8a572f",
  colorSecondary100: "#f5ead8",
  colorSecondary50: "#faf4eb",
  colorDarkPanelFrom: "#1e6f4e",
  colorDarkPanelTo: "#259963",
  colorFooterBg: "#1a3d2b",
  colorSurface: "#faf8f4",
  colorSurfaceCard: "#fffdf8",
  colorTextPrimary: "#101819",
  colorTextSecondary: "#475359",
  colorTextMuted: "#6f7b80",
  fontDisplay: "Instrument Serif",
  fontBody: "Manrope",
};

// ── Helper: colour field ──────────────────────────────────────────────────────

function ColorField({
  name,
  label,
  control,
  error,
}: {
  name: keyof BrandFormData;
  label: string;
  control: ReturnType<typeof useForm<BrandFormData>>["control"];
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={field.value as string}
              onChange={(e) => field.onChange(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-white p-0.5"
            />
            <Input
              value={field.value as string}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder="#000000"
              className="font-mono w-32"
            />
          </div>
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Helper: text field ────────────────────────────────────────────────────────

function TextField({
  name,
  label,
  placeholder,
  type = "text",
  control,
  error,
  colSpan,
}: {
  name: keyof BrandFormData;
  label: string;
  placeholder?: string;
  type?: string;
  control: ReturnType<typeof useForm<BrandFormData>>["control"];
  error?: string;
  colSpan?: "full";
}) {
  return (
    <div className={cn("space-y-1.5", colSpan === "full" && "col-span-2")}>
      <label className="text-sm font-medium text-text-primary">{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            {...field}
            value={field.value as string}
            type={type}
            placeholder={placeholder}
          />
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Skeleton placeholder ──────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BrandSettingsPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["brand-settings"],
    queryFn: () => apiGet<BrandFormData>("/content/brand-settings"),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings, reset]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data: BrandFormData) =>
      apiPatch("/content/brand-settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-settings"] });
      toast.success("Brand settings saved");
    },
    onError: (err: Error) =>
      toast.error("Save failed", { description: err.message }),
  });

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="p-6 max-w-4xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Brand Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Controls everything visible on the public website — company name, colors, fonts.
        </p>
      </div>

      <form onSubmit={handleSubmit((data) => save(data))}>
        <TabsPrimitive.Root defaultValue="identity">
          {/* Tab list */}
          <TabsPrimitive.List className="flex gap-1 rounded-xl border border-border bg-surface p-1 mb-6">
            {(
              [
                { value: "identity", label: "Identity" },
                { value: "colors", label: "Colors" },
                { value: "typography", label: "Typography" },
              ] as const
            ).map((tab) => (
              <TabsPrimitive.Trigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  "text-text-secondary hover:text-text-primary",
                  "data-[state=active]:bg-brand-500 data-[state=active]:text-white"
                )}
              >
                {tab.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          {/* ── Identity tab ── */}
          <TabsPrimitive.Content value="identity">
            <Card>
              <CardHeader>
                <CardTitle>Site Identity</CardTitle>
                <CardDescription>
                  Company name, contact details, and invoice identity shown across the website, emails, and invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <TextField
                  control={control}
                  name="siteName"
                  label="Site Name"
                  placeholder="Brand name"
                  error={errors.siteName?.message}
                />
                <TextField
                  control={control}
                  name="tagline"
                  label="Tagline"
                  placeholder="Your brand tagline"
                  error={errors.tagline?.message}
                />
                <TextField
                  control={control}
                  name="phone"
                  label="Phone"
                  placeholder="Enter primary phone number"
                  type="tel"
                  error={errors.phone?.message}
                />
                <TextField
                  control={control}
                  name="email"
                  label="Email"
                  placeholder="hello@brand.com"
                  type="email"
                  error={errors.email?.message}
                />
                <TextField
                  control={control}
                  name="fssaiNumber"
                  label="FSSAI License Number"
                  placeholder="14-digit license number"
                  error={errors.fssaiNumber?.message}
                />
                <TextField
                  control={control}
                  name="gstin"
                  label="GSTIN"
                  placeholder="15-character GSTIN"
                  error={errors.gstin?.message}
                />
                <TextField
                  control={control}
                  name="address"
                  label="Address"
                  placeholder="Business address"
                  colSpan="full"
                  error={errors.address?.message}
                />
                <TextField
                  control={control}
                  name="bankName"
                  label="Bank Name"
                  placeholder="Primary settlement bank"
                  error={errors.bankName?.message}
                />
                <TextField
                  control={control}
                  name="bankAccount"
                  label="Bank Account"
                  placeholder="Account number"
                  error={errors.bankAccount?.message}
                />
                <TextField
                  control={control}
                  name="bankIfsc"
                  label="Bank IFSC"
                  placeholder="IFSC code"
                  error={errors.bankIfsc?.message}
                />
                <TextField
                  control={control}
                  name="bankUpi"
                  label="UPI ID"
                  placeholder="payments@upi"
                  error={errors.bankUpi?.message}
                />
              </CardContent>
            </Card>
          </TabsPrimitive.Content>

          {/* ── Colors tab ── */}
          <TabsPrimitive.Content value="colors">
            <div className="space-y-4">
              {/* Primary */}
              <Card>
                <CardHeader>
                  <CardTitle>Primary Colors</CardTitle>
                  <CardDescription>Brand green palette — buttons, links, active states.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <ColorField control={control} name="colorPrimary500" label="Primary 500 (Main)" error={errors.colorPrimary500?.message} />
                  <ColorField control={control} name="colorPrimary600" label="Primary 600 (Dark)" error={errors.colorPrimary600?.message} />
                  <ColorField control={control} name="colorPrimary400" label="Primary 400 (Light)" error={errors.colorPrimary400?.message} />
                  <ColorField control={control} name="colorPrimary100" label="Primary 100 (Tint)" error={errors.colorPrimary100?.message} />
                  <ColorField control={control} name="colorPrimary50" label="Primary 50 (Subtle)" error={errors.colorPrimary50?.message} />
                </CardContent>
              </Card>

              {/* Secondary */}
              <Card>
                <CardHeader>
                  <CardTitle>Secondary Colors</CardTitle>
                  <CardDescription>Warm brown accent — badges, highlights, decorative elements.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <ColorField control={control} name="colorSecondary500" label="Secondary 500 (Main)" error={errors.colorSecondary500?.message} />
                  <ColorField control={control} name="colorSecondary600" label="Secondary 600 (Dark)" error={errors.colorSecondary600?.message} />
                  <ColorField control={control} name="colorSecondary100" label="Secondary 100 (Tint)" error={errors.colorSecondary100?.message} />
                  <ColorField control={control} name="colorSecondary50" label="Secondary 50 (Subtle)" error={errors.colorSecondary50?.message} />
                </CardContent>
              </Card>

              {/* Dark panel & footer */}
              <Card>
                <CardHeader>
                  <CardTitle>Dark Panel &amp; Footer</CardTitle>
                  <CardDescription>Gradient start/end for hero panels and footer background.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <ColorField control={control} name="colorDarkPanelFrom" label="Dark Panel From" error={errors.colorDarkPanelFrom?.message} />
                  <ColorField control={control} name="colorDarkPanelTo" label="Dark Panel To" error={errors.colorDarkPanelTo?.message} />
                  <ColorField control={control} name="colorFooterBg" label="Footer Background" error={errors.colorFooterBg?.message} />
                </CardContent>
              </Card>

              {/* Surfaces */}
              <Card>
                <CardHeader>
                  <CardTitle>Surfaces</CardTitle>
                  <CardDescription>Page and card background colors.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <ColorField control={control} name="colorSurface" label="Page Surface" error={errors.colorSurface?.message} />
                  <ColorField control={control} name="colorSurfaceCard" label="Card Surface" error={errors.colorSurfaceCard?.message} />
                </CardContent>
              </Card>

              {/* Text */}
              <Card>
                <CardHeader>
                  <CardTitle>Text Colors</CardTitle>
                  <CardDescription>Typography hierarchy for body copy across the website.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <ColorField control={control} name="colorTextPrimary" label="Text Primary" error={errors.colorTextPrimary?.message} />
                  <ColorField control={control} name="colorTextSecondary" label="Text Secondary" error={errors.colorTextSecondary?.message} />
                  <ColorField control={control} name="colorTextMuted" label="Text Muted" error={errors.colorTextMuted?.message} />
                </CardContent>
              </Card>
            </div>
          </TabsPrimitive.Content>

          {/* ── Typography tab ── */}
          <TabsPrimitive.Content value="typography">
            <Card>
              <CardHeader>
                <CardTitle>Typography</CardTitle>
                <CardDescription>
                  Display font is used for headings (Instrument Serif at weight 400). Body font is used for all other text.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                {/* Display font */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Display Font</label>
                  <Controller
                    control={control}
                    name="fontDisplay"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select display font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Instrument Serif">Instrument Serif</SelectItem>
                          <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                          <SelectItem value="Cormorant Garamond">Cormorant Garamond</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.fontDisplay && (
                    <p className="text-xs text-red-500">{errors.fontDisplay.message}</p>
                  )}
                  <p className="text-xs text-text-secondary">Used for H1, H2, section titles. Always rendered at weight 400.</p>
                </div>

                {/* Body font */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Body Font</label>
                  <Controller
                    control={control}
                    name="fontBody"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select body font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Manrope">Manrope</SelectItem>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="DM Sans">DM Sans</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.fontBody && (
                    <p className="text-xs text-red-500">{errors.fontBody.message}</p>
                  )}
                  <p className="text-xs text-text-secondary">Used for body copy, labels, navigation. Supports Devanagari via Noto Sans fallback.</p>
                </div>
              </CardContent>
            </Card>
          </TabsPrimitive.Content>
        </TabsPrimitive.Root>

        {/* Save bar */}
        <div className="mt-6 flex items-center justify-end gap-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-text-secondary mr-auto">
            Changes apply to the public website within 5 minutes (ISR cache revalidation).
          </p>
          <Button type="submit" disabled={isPending} size="default">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
