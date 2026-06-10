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
  Play,
  Square,
  Trash2,
  FlaskConical,
  Users,
  Calendar,
} from "lucide-react";
import {
  type ApiExperiment,
  type ApiTheme,
  getThemes,
  getExperiments,
  createExperiment,
  startExperiment,
  stopExperiment,
  deleteExperiment,
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

const experimentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  controlThemeId: z.string().min(1, "Control theme is required"),
  variantThemeId: z.string().min(1, "Variant theme is required"),
  trafficSplit: z.number().min(1).max(99),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine((data) => data.controlThemeId !== data.variantThemeId, {
  message: "Control and variant themes must be different",
  path: ["variantThemeId"],
});

type ExperimentFormData = z.infer<typeof experimentSchema>;

const DEFAULTS: ExperimentFormData = {
  name: "",
  controlThemeId: "",
  variantThemeId: "",
  trafficSplit: 50,
  startDate: "",
  endDate: "",
};

// ── Status Badge ───────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { variant: "default" | "success" | "warning" | "destructive" | "secondary" | "outline"; label: string }> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  RUNNING: { variant: "success", label: "Running" },
  PAUSED: { variant: "warning", label: "Paused" },
  STOPPED: { variant: "destructive", label: "Stopped" },
  COMPLETED: { variant: "default", label: "Completed" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { variant: "outline" as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ── Traffic Split Bar ──────────────────────────────────────────────────────

function TrafficSplitBar({
  split,
  controlName,
  variantName,
}: {
  split: number;
  controlName: string;
  variantName: string;
}) {
  const controlPct = 100 - split;
  return (
    <div className="space-y-1">
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        <div
          className="flex items-center justify-center text-[10px] font-semibold text-white bg-emerald-600 transition-all"
          style={{ width: `${controlPct}%` }}
        >
          {controlPct > 15 && `${controlPct}%`}
        </div>
        <div
          className="flex items-center justify-center text-[10px] font-semibold text-white bg-blue-600 transition-all"
          style={{ width: `${split}%` }}
        >
          {split > 15 && `${split}%`}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-text-secondary">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
          Control: {controlName}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
          Variant: {variantName}
        </span>
      </div>
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
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ExperimentsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmStart, setConfirmStart] = useState<ApiExperiment | null>(null);
  const [confirmStop, setConfirmStop] = useState<ApiExperiment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiExperiment | null>(null);

  const { data: experiments, isLoading: loadingExperiments } = useQuery({
    queryKey: ["experiments"],
    queryFn: getExperiments,
  });

  const { data: themes, isLoading: loadingThemes } = useQuery({
    queryKey: ["themes"],
    queryFn: getThemes,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExperimentFormData>({
    resolver: zodResolver(experimentSchema),
    defaultValues: DEFAULTS,
  });

  const watchedControlId = watch("controlThemeId");
  const watchedVariantId = watch("variantThemeId");
  const watchedSplit = watch("trafficSplit");

  // ── Mutations ──

  const { mutate: doCreate, isPending: isCreating } = useMutation({
    mutationFn: (data: ExperimentFormData) => {
      const payload: Record<string, unknown> = {
        name: data.name,
        controlThemeId: data.controlThemeId,
        variantThemeId: data.variantThemeId,
        trafficSplit: data.trafficSplit,
      };
      if (data.startDate) payload.startDate = data.startDate;
      if (data.endDate) payload.endDate = data.endDate;
      return createExperiment(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiments"] });
      toast.success("Experiment created");
      setCreateOpen(false);
      reset(DEFAULTS);
    },
    onError: (err: Error) => toast.error("Failed to create experiment", { description: err.message }),
  });

  const { mutate: doStart } = useMutation({
    mutationFn: (id: string) => startExperiment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiments"] });
      toast.success("Experiment started");
      setConfirmStart(null);
    },
    onError: (err: Error) => toast.error("Failed to start experiment", { description: err.message }),
  });

  const { mutate: doStop } = useMutation({
    mutationFn: (id: string) => stopExperiment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiments"] });
      toast.success("Experiment stopped");
      setConfirmStop(null);
    },
    onError: (err: Error) => toast.error("Failed to stop experiment", { description: err.message }),
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: (id: string) => deleteExperiment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiments"] });
      toast.success("Experiment deleted");
      setConfirmDelete(null);
    },
    onError: (err: Error) => toast.error("Failed to delete experiment", { description: err.message }),
  });

  // ── Helpers ──

  function getThemeName(id: string): string {
    return themes?.find((t) => t.id === id)?.name ?? "Unknown";
  }

  const controlThemeName = watchedControlId ? getThemeName(watchedControlId) : "Control";
  const variantThemeName = watchedVariantId ? getThemeName(watchedVariantId) : "Variant";

  const isLoading = loadingExperiments || loadingThemes;
  if (isLoading) return <PageSkeleton />;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">A/B Testing</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Run experiments to compare theme variants and measure visitor engagement.
          </p>
        </div>
        <Button onClick={() => { reset(DEFAULTS); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" />
          Create Experiment
        </Button>
      </div>

      {/* Experiments List */}
      {!experiments || experiments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FlaskConical className="h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-sm text-text-secondary mb-4">
              No experiments yet. Create one to start A/B testing your themes.
            </p>
            <Button
              onClick={() => { reset(DEFAULTS); setCreateOpen(true); }}
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Create Experiment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <Card key={exp.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{exp.name}</CardTitle>
                      <StatusBadge status={exp.status} />
                    </div>
                    {exp.description && (
                      <CardDescription>{exp.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {exp.status === "DRAFT" && (
                      <Button
                        size="sm"
                        onClick={() => setConfirmStart(exp)}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start
                      </Button>
                    )}
                    {exp.status === "RUNNING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmStop(exp)}
                      >
                        <Square className="h-3.5 w-3.5" />
                        Stop
                      </Button>
                    )}
                    {(exp.status === "DRAFT" || exp.status === "STOPPED") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setConfirmDelete(exp)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Traffic split bar */}
                <TrafficSplitBar
                  split={exp.trafficSplit}
                  controlName={exp.controlTheme.name}
                  variantName={exp.variantTheme.name}
                />

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{exp._count?.assignments ?? 0} assignments</span>
                  </div>
                  {exp.startDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Start: {new Date(exp.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {exp.endDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        End: {new Date(exp.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {exp.stoppedAt && (
                    <span>
                      Stopped: {new Date(exp.stoppedAt).toLocaleDateString()}
                    </span>
                  )}
                  <span className="ml-auto">
                    Created: {new Date(exp.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Experiment Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); reset(DEFAULTS); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Experiment</DialogTitle>
            <DialogDescription>
              Set up an A/B test to compare two themes. Visitors will be randomly assigned
              based on the traffic split.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((data) => doCreate(data))} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Experiment Name</Label>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Input {...field} placeholder="e.g. Green vs Saffron theme test" />
                )}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <Separator />

            {/* Theme Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Control Theme</Label>
                <Controller
                  control={control}
                  name="controlThemeId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select control..." />
                      </SelectTrigger>
                      <SelectContent>
                        {themes?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                            {t.isDefault && " (Active)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.controlThemeId && (
                  <p className="text-xs text-red-500">{errors.controlThemeId.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Variant Theme</Label>
                <Controller
                  control={control}
                  name="variantThemeId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select variant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {themes?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.variantThemeId && (
                  <p className="text-xs text-red-500">{errors.variantThemeId.message}</p>
                )}
              </div>
            </div>

            {/* Traffic Split */}
            <div className="space-y-2">
              <Label>Traffic Split (% visitors see variant)</Label>
              <Controller
                control={control}
                name="trafficSplit"
                render={({ field }) => (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="flex-1 h-2 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer"
                      />
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-20 text-center font-mono"
                      />
                    </div>
                    <TrafficSplitBar
                      split={watchedSplit}
                      controlName={controlThemeName}
                      variantName={variantThemeName}
                    />
                  </div>
                )}
              />
              {errors.trafficSplit && (
                <p className="text-xs text-red-500">{errors.trafficSplit.message}</p>
              )}
            </div>

            <Separator />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date (optional)</Label>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <Input type="date" {...field} />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date (optional)</Label>
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <Input type="date" {...field} />
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setCreateOpen(false); reset(DEFAULTS); }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Experiment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Start Confirmation ── */}
      <Dialog open={!!confirmStart} onOpenChange={(open) => { if (!open) setConfirmStart(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Start Experiment</DialogTitle>
            <DialogDescription>
              This will start serving the variant theme to{" "}
              <strong>{confirmStart?.trafficSplit}%</strong> of visitors.
              The remaining {confirmStart ? 100 - confirmStart.trafficSplit : 0}% will see the control
              theme.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStart(null)}>
              Cancel
            </Button>
            <Button onClick={() => confirmStart && doStart(confirmStart.id)}>
              <Play className="h-4 w-4" />
              Start Experiment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Stop Confirmation ── */}
      <Dialog open={!!confirmStop} onOpenChange={(open) => { if (!open) setConfirmStop(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Stop Experiment</DialogTitle>
            <DialogDescription>
              This will stop serving the variant theme. All visitors will see the control
              theme.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStop(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmStop && doStop(confirmStop.id)}
            >
              <Square className="h-4 w-4" />
              Stop Experiment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Experiment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{confirmDelete?.name}&rdquo;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
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
