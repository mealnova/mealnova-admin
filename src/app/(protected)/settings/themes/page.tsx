"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Check,
  Palette,
  Type,
} from "lucide-react";
import {
  type ApiTheme,
  getThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  activateTheme,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ── Schema ─────────────────────────────────────────────────────────────────

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color");

const themeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  colorPrimary50: hexColor,
  colorPrimary100: hexColor,
  colorPrimary400: hexColor,
  colorPrimary500: hexColor,
  colorPrimary600: hexColor,
  colorSecondary50: hexColor,
  colorSecondary100: hexColor,
  colorSecondary500: hexColor,
  colorSecondary600: hexColor,
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
  borderRadiusSm: z.string().min(1),
  borderRadiusMd: z.string().min(1),
  borderRadiusLg: z.string().min(1),
  borderRadiusXl: z.string().min(1),
});

type ThemeFormData = z.infer<typeof themeSchema>;

const DEFAULTS: ThemeFormData = {
  name: "",
  description: "",
  colorPrimary50: "#f0f7f3",
  colorPrimary100: "#e8f2ec",
  colorPrimary400: "#5a9f84",
  colorPrimary500: "#245945",
  colorPrimary600: "#1d4838",
  colorSecondary50: "#faf4eb",
  colorSecondary100: "#f5ead8",
  colorSecondary500: "#ad6f3e",
  colorSecondary600: "#8a572f",
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
  borderRadiusSm: "0.25rem",
  borderRadiusMd: "0.375rem",
  borderRadiusLg: "0.5rem",
  borderRadiusXl: "0.75rem",
};

const DISPLAY_FONTS = [
  "Instrument Serif",
  "DM Serif Display",
  "Playfair Display",
  "Inter",
  "Manrope",
  "Poppins",
];

const BODY_FONTS = [
  "Manrope",
  "Inter",
  "Poppins",
  "DM Sans",
  "Noto Sans",
];

// ── Color Field ────────────────────────────────────────────────────────────

function ColorField({
  name,
  label,
  control,
  error,
}: {
  name: keyof ThemeFormData;
  label: string;
  control: ReturnType<typeof useForm<ThemeFormData>>["control"];
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-text-secondary">{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={field.value as string}
              onChange={(e) => field.onChange(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-white p-0.5"
            />
            <Input
              value={field.value as string}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder="#000000"
              className="font-mono text-xs w-28 h-8"
            />
          </div>
        )}
      />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

// ── Theme Preview Card ─────────────────────────────────────────────────────

function ThemePreview({ theme }: { theme: ApiTheme }) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      {/* Dark panel header */}
      <div
        className="h-10 flex items-center px-3"
        style={{
          background: `linear-gradient(135deg, ${theme.colorDarkPanelFrom}, ${theme.colorDarkPanelTo})`,
        }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.colorPrimary500 }}
          />
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.colorSecondary500 }}
          />
        </div>
        <span className="ml-auto text-[9px] text-white/70 font-medium">
          {theme.fontDisplay}
        </span>
      </div>
      {/* Surface area */}
      <div className="p-3 space-y-2" style={{ backgroundColor: theme.colorSurface }}>
        <div
          className="rounded px-2 py-1.5"
          style={{ backgroundColor: theme.colorSurfaceCard }}
        >
          <p
            className="text-xs font-semibold leading-tight"
            style={{ color: theme.colorTextPrimary }}
          >
            Sample Heading
          </p>
          <p
            className="text-[10px] mt-0.5"
            style={{ color: theme.colorTextSecondary }}
          >
            Body text preview
          </p>
          <p
            className="text-[9px] mt-0.5"
            style={{ color: theme.colorTextMuted }}
          >
            Muted caption &middot; {theme.fontBody}
          </p>
        </div>
        {/* Primary/Secondary color strip */}
        <div className="flex gap-1">
          {[
            theme.colorPrimary50,
            theme.colorPrimary100,
            theme.colorPrimary400,
            theme.colorPrimary500,
            theme.colorPrimary600,
          ].map((c, i) => (
            <div
              key={i}
              className="h-3 flex-1 rounded-sm"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex gap-1">
          {[
            theme.colorSecondary50,
            theme.colorSecondary100,
            theme.colorSecondary500,
            theme.colorSecondary600,
          ].map((c, i) => (
            <div
              key={i}
              className="h-2 flex-1 rounded-sm"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      {/* Footer strip */}
      <div className="h-4" style={{ backgroundColor: theme.colorFooterBg }} />
    </div>
  );
}

// ── Page Skeleton ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ThemesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ApiTheme | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiTheme | null>(null);

  const { data: themes, isLoading } = useQuery({
    queryKey: ["themes"],
    queryFn: getThemes,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ThemeFormData>({
    resolver: zodResolver(themeSchema),
    defaultValues: DEFAULTS,
  });

  // ── Mutations ──

  const { mutate: doCreate, isPending: isCreating } = useMutation({
    mutationFn: (data: ThemeFormData) => createTheme(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["themes"] });
      toast.success("Theme created");
      closeDialog();
    },
    onError: (err: Error) => toast.error("Failed to create theme", { description: err.message }),
  });

  const { mutate: doUpdate, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThemeFormData }) =>
      updateTheme(id, data as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["themes"] });
      toast.success("Theme updated");
      closeDialog();
    },
    onError: (err: Error) => toast.error("Failed to update theme", { description: err.message }),
  });

  const { mutate: doActivate } = useMutation({
    mutationFn: (id: string) => activateTheme(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["themes"] });
      qc.invalidateQueries({ queryKey: ["brand-settings"] });
      toast.success("Theme activated");
    },
    onError: (err: Error) => toast.error("Failed to activate theme", { description: err.message }),
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: (id: string) => deleteTheme(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["themes"] });
      toast.success("Theme deleted");
      setConfirmDelete(null);
    },
    onError: (err: Error) => toast.error("Failed to delete theme", { description: err.message }),
  });

  // ── Helpers ──

  function openCreate() {
    setEditingTheme(null);
    reset(DEFAULTS);
    setDialogOpen(true);
  }

  function openEdit(theme: ApiTheme) {
    setEditingTheme(theme);
    reset({
      name: theme.name,
      description: theme.description ?? "",
      colorPrimary50: theme.colorPrimary50,
      colorPrimary100: theme.colorPrimary100,
      colorPrimary400: theme.colorPrimary400,
      colorPrimary500: theme.colorPrimary500,
      colorPrimary600: theme.colorPrimary600,
      colorSecondary50: theme.colorSecondary50,
      colorSecondary100: theme.colorSecondary100,
      colorSecondary500: theme.colorSecondary500,
      colorSecondary600: theme.colorSecondary600,
      colorDarkPanelFrom: theme.colorDarkPanelFrom,
      colorDarkPanelTo: theme.colorDarkPanelTo,
      colorFooterBg: theme.colorFooterBg,
      colorSurface: theme.colorSurface,
      colorSurfaceCard: theme.colorSurfaceCard,
      colorTextPrimary: theme.colorTextPrimary,
      colorTextSecondary: theme.colorTextSecondary,
      colorTextMuted: theme.colorTextMuted,
      fontDisplay: theme.fontDisplay,
      fontBody: theme.fontBody,
      borderRadiusSm: theme.borderRadiusSm,
      borderRadiusMd: theme.borderRadiusMd,
      borderRadiusLg: theme.borderRadiusLg,
      borderRadiusXl: theme.borderRadiusXl,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingTheme(null);
    reset(DEFAULTS);
  }

  function onSubmit(data: ThemeFormData) {
    if (editingTheme) {
      doUpdate({ id: editingTheme.id, data });
    } else {
      doCreate(data);
    }
  }

  const isSaving = isCreating || isUpdating;

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Themes</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage website color themes. Activate a theme to apply it to the public website.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Theme
        </Button>
      </div>

      {/* Theme Grid */}
      {!themes || themes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Palette className="h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-sm text-text-secondary mb-4">
              No themes found. Create your first theme to get started.
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="h-4 w-4" />
              Create Theme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <Card key={theme.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{theme.name}</CardTitle>
                    {theme.description && (
                      <CardDescription className="line-clamp-2">
                        {theme.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {theme.isDefault && (
                      <Badge variant="success">Active</Badge>
                    )}
                    {theme.isPreset && (
                      <Badge className="bg-blue-100 text-blue-700 border-transparent">
                        Preset
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <ThemePreview theme={theme} />

                {/* Font info */}
                <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                  <div className="flex items-center gap-1">
                    <Type className="h-3 w-3" />
                    <span>{theme.fontDisplay}</span>
                  </div>
                  <span>/</span>
                  <span>{theme.fontBody}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {!theme.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => doActivate(theme.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Activate
                    </Button>
                  )}
                  {!theme.isPreset && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(theme)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setConfirmDelete(theme)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTheme ? "Edit Theme" : "Create Theme"}
            </DialogTitle>
            <DialogDescription>
              {editingTheme
                ? "Update the theme colors, fonts, and border radii."
                : "Define a new color theme for the public website."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name & Description */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input {...field} placeholder="e.g. Forest Green" />
                  )}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows={2}
                      placeholder="Brief description of the theme..."
                      className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-sm placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    />
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Primary Colors */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Primary Colors</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <ColorField control={control} name="colorPrimary50" label="Primary 50" error={errors.colorPrimary50?.message} />
                <ColorField control={control} name="colorPrimary100" label="Primary 100" error={errors.colorPrimary100?.message} />
                <ColorField control={control} name="colorPrimary400" label="Primary 400" error={errors.colorPrimary400?.message} />
                <ColorField control={control} name="colorPrimary500" label="Primary 500" error={errors.colorPrimary500?.message} />
                <ColorField control={control} name="colorPrimary600" label="Primary 600" error={errors.colorPrimary600?.message} />
              </div>
            </div>

            {/* Secondary Colors */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Secondary Colors</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <ColorField control={control} name="colorSecondary50" label="Secondary 50" error={errors.colorSecondary50?.message} />
                <ColorField control={control} name="colorSecondary100" label="Secondary 100" error={errors.colorSecondary100?.message} />
                <ColorField control={control} name="colorSecondary500" label="Secondary 500" error={errors.colorSecondary500?.message} />
                <ColorField control={control} name="colorSecondary600" label="Secondary 600" error={errors.colorSecondary600?.message} />
              </div>
            </div>

            {/* Dark Panel */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Dark Panel &amp; Footer</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <ColorField control={control} name="colorDarkPanelFrom" label="Panel Gradient Start" error={errors.colorDarkPanelFrom?.message} />
                <ColorField control={control} name="colorDarkPanelTo" label="Panel Gradient End" error={errors.colorDarkPanelTo?.message} />
                <ColorField control={control} name="colorFooterBg" label="Footer Background" error={errors.colorFooterBg?.message} />
              </div>
            </div>

            {/* Surfaces */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Surfaces</h4>
              <div className="grid grid-cols-2 gap-3">
                <ColorField control={control} name="colorSurface" label="Page Surface" error={errors.colorSurface?.message} />
                <ColorField control={control} name="colorSurfaceCard" label="Card Surface" error={errors.colorSurfaceCard?.message} />
              </div>
            </div>

            {/* Text */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Text Colors</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <ColorField control={control} name="colorTextPrimary" label="Text Primary" error={errors.colorTextPrimary?.message} />
                <ColorField control={control} name="colorTextSecondary" label="Text Secondary" error={errors.colorTextSecondary?.message} />
                <ColorField control={control} name="colorTextMuted" label="Text Muted" error={errors.colorTextMuted?.message} />
              </div>
            </div>

            <Separator />

            {/* Fonts */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Typography</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-text-secondary">Display Font</Label>
                  <Controller
                    control={control}
                    name="fontDisplay"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select display font" />
                        </SelectTrigger>
                        <SelectContent>
                          {DISPLAY_FONTS.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.fontDisplay && (
                    <p className="text-[11px] text-red-500">{errors.fontDisplay.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-text-secondary">Body Font</Label>
                  <Controller
                    control={control}
                    name="fontBody"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select body font" />
                        </SelectTrigger>
                        <SelectContent>
                          {BODY_FONTS.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.fontBody && (
                    <p className="text-[11px] text-red-500">{errors.fontBody.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Border Radii */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Border Radius</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    { name: "borderRadiusSm" as const, label: "Small" },
                    { name: "borderRadiusMd" as const, label: "Medium" },
                    { name: "borderRadiusLg" as const, label: "Large" },
                    { name: "borderRadiusXl" as const, label: "X-Large" },
                  ] as const
                ).map((r) => (
                  <div key={r.name} className="space-y-1">
                    <Label className="text-xs text-text-secondary">{r.label}</Label>
                    <Controller
                      control={control}
                      name={r.name}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="0.5rem"
                          className="h-8 text-xs font-mono"
                        />
                      )}
                    />
                    {errors[r.name] && (
                      <p className="text-[11px] text-red-500">{errors[r.name]?.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingTheme ? (
                  "Update Theme"
                ) : (
                  "Create Theme"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Theme</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{confirmDelete?.name}&rdquo;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && doDelete(confirmDelete.id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
