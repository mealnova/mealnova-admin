"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Copy,
  Leaf,
  X,
  Loader2,
  Building2,
  Lock,
} from "lucide-react";
import { getLocations, getMenuItems, saveScheduleDay, loadScheduleDay, loadScheduleDayStatus, publishScheduleDay, type ApiLocation, type ApiMenuItem } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────

type MealType = "Breakfast" | "Lunch" | "High Tea" | "Dinner";

interface ScheduledItem {
  id: string;
  name: string;
  category: string;
  isJain: boolean;
  isVegan: boolean;
}

interface DaySchedule {
  [meal: string]: ScheduledItem[];
}

interface WeekSchedule {
  [dateKey: string]: DaySchedule;
}

type PublishStatus = "published" | "draft" | "empty";

// ── Constants ──────────────────────────────────────────────

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "High Tea", "Dinner"];

const MEAL_TIMES: Record<MealType, string> = {
  Breakfast: "7:30 – 9:30 AM",
  Lunch: "12:00 – 2:30 PM",
  "High Tea": "4:00 – 5:30 PM",
  Dinner: "7:30 – 9:30 PM",
};

// ── Helpers ────────────────────────────────────────────────

function getWeekDates(anchor: Date): Date[] {
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function isToday(date: Date) {
  return dateKey(date) === dateKey(new Date());
}

function isPast(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function menuItemToScheduled(item: ApiMenuItem): ScheduledItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category?.name ?? "Uncategorized",
    isJain: item.isJain,
    isVegan: item.isVegan,
  };
}

// ── Status Badge ───────────────────────────────────────────

function getPublishStatus(
  schedule: WeekSchedule,
  date: Date,
  published: Record<string, boolean>
): PublishStatus {
  const key = dateKey(date);
  if (published[key]) return "published";
  const meals = schedule[key];
  if (!meals || Object.values(meals).every((items) => items.length === 0)) return "empty";
  return "draft";
}

// ── Main Page ──────────────────────────────────────────────

export default function SchedulePage() {
  const { can } = useAuth();
  // Location state
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  // Catalog state (from API)
  const [catalog, setCatalog] = useState<ApiMenuItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Week / schedule state
  const [anchorDate, setAnchorDate] = useState(new Date());
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);
  const [schedule, setSchedule] = useState<WeekSchedule>({});
  const [published, setPublished] = useState<Record<string, boolean>>({});
  const [publishingDate, setPublishingDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(
    weekDates.find((d) => isToday(d)) ?? weekDates[0]
  );
  const [selectedMeal, setSelectedMeal] = useState<MealType>("Lunch");
  const [catalogSearch, setCatalogSearch] = useState("");
  const canEditSchedule = can("schedule:edit") || can("schedule:create");

  // Load locations
  useEffect(() => {
    getLocations()
      .then((locs) => {
        const active = locs.filter((l) => l.isActive && l.type !== "CENTRAL_KITCHEN");
        setLocations(active);
        if (active.length > 0) setSelectedLocationId(active[0].id);
      })
      .catch(() => setLocations([]))
      .finally(() => setIsLoadingLocations(false));
  }, []);

  // Load menu items when location changes
  useEffect(() => {
    if (!selectedLocationId) return;
    setIsLoadingCatalog(true);
    setCatalog([]);
    setCatalogSearch("");
    getMenuItems({ locationId: selectedLocationId })
      .then((res) => setCatalog(res.data))
      .catch(() => setCatalog([]))
      .finally(() => setIsLoadingCatalog(false));
  }, [selectedLocationId]);

  // Load persisted schedule for the current week when location or week changes
  useEffect(() => {
    if (!selectedLocationId) return;
    const locationId = selectedLocationId;
    Promise.all(
      weekDates.map(async (d) => {
        const key = dateKey(d);
        const [items, status] = await Promise.all([
          loadScheduleDay(key, locationId).catch(() => ({})),
          loadScheduleDayStatus(key, locationId).catch(() => ({ published: false })),
        ]);
        return [key, { items, published: status.published }] as const;
      }),
    ).then((entries) => {
      setSchedule(Object.fromEntries(entries.map(([key, value]) => [key, value.items])));
      setPublished(Object.fromEntries(entries.map(([key, value]) => [key, value.published])));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId, weekDates[0].toISOString()]);

  const selectedKey = dateKey(selectedDate);
  const selectedItems = schedule[selectedKey]?.[selectedMeal] ?? [];

  const scheduledIds = new Set(selectedItems.map((i) => i.id));
  const filteredCatalog = catalog.filter(
    (item) =>
      item.isAvailable &&
      !scheduledIds.has(item.id) &&
      item.name.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  function addItem(item: ApiMenuItem) {
    if (!selectedLocationId || !canEditSchedule) return;
    const si = menuItemToScheduled(item);
    setSchedule((prev) => {
      const day = prev[selectedKey] ?? {};
      const meal = day[selectedMeal] ?? [];
      const updated = { ...prev, [selectedKey]: { ...day, [selectedMeal]: [...meal, si] } };
      saveScheduleDay(selectedKey, selectedLocationId, updated[selectedKey]).catch(() => toast.error("Failed to save schedule"));
      return updated;
    });
  }

  function removeItem(itemId: string) {
    if (!selectedLocationId || !canEditSchedule) return;
    setSchedule((prev) => {
      const day = prev[selectedKey] ?? {};
      const meal = (day[selectedMeal] ?? []).filter((i) => i.id !== itemId);
      const updated = { ...prev, [selectedKey]: { ...day, [selectedMeal]: meal } };
      saveScheduleDay(selectedKey, selectedLocationId, updated[selectedKey]).catch(() => toast.error("Failed to save schedule"));
      return updated;
    });
  }

  async function publishDay(date: Date) {
    if (!selectedLocationId || !canEditSchedule) return;
    const key = dateKey(date);
    setPublishingDate(key);
    try {
      await publishScheduleDay(key, selectedLocationId);
      setPublished((prev) => ({ ...prev, [key]: true }));
      toast.success(`Menu published for ${date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}`);
    } catch {
      toast.error("Failed to publish menu");
    } finally {
      setPublishingDate(null);
    }
  }

  function prevWeek() {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - 7);
    setAnchorDate(d);
  }

  function nextWeek() {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + 7);
    setAnchorDate(d);
  }

  const weekLabel = `${weekDates[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${weekDates[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  if (isLoadingLocations) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading locations…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Menu Schedule</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Plan and publish daily menus for each location
          </p>
        </div>
        <button
          onClick={() => publishDay(selectedDate)}
          disabled={!canEditSchedule || !!published[selectedKey] || publishingDate === selectedKey}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            published[selectedKey]
              ? "cursor-not-allowed bg-success-50 text-success-700"
              : "bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
          )}
        >
          {published[selectedKey] ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Published
            </>
          ) : publishingDate === selectedKey ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Publish Day's Menu
            </>
          )}
        </button>
      </div>

      {/* Location selector */}
      <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-surface p-1.5">
        {locations.map((loc) => {
          const active = selectedLocationId === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => setSelectedLocationId(loc.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-500 text-white"
                  : "text-text-secondary hover:bg-surface-secondary"
              )}
            >
              {loc.isRestricted ? (
                <Lock className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Building2 className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate max-w-[140px]">{loc.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected location info */}
      {selectedLocation && (
        <p className="text-xs text-text-tertiary">
          <span className="font-medium text-text-secondary">{selectedLocation.name}</span>
          {" · "}
          {selectedLocation.address}
          {selectedLocation.isRestricted && (
            <span className="ml-2 font-medium text-warning-600">Restricted — employees only</span>
          )}
        </p>
      )}

      {/* Week navigator */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <button
          onClick={prevWeek}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1 overflow-x-auto">
          {weekDates.map((date, i) => {
            const key = dateKey(date);
            const status = getPublishStatus(schedule, date, published);
            const selected = key === selectedKey;
            const past = isPast(date) && !isToday(date);
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex min-w-[64px] flex-col items-center rounded-lg px-3 py-2 transition-colors",
                  selected
                    ? "bg-brand-500 text-white"
                    : past
                    ? "text-text-tertiary hover:bg-surface-secondary"
                    : isToday(date)
                    ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
                    : "text-text-secondary hover:bg-surface-secondary"
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {DAY_NAMES[i]}
                </span>
                <span className="mt-0.5 text-lg font-bold leading-none">
                  {date.getDate()}
                </span>
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 rounded-full",
                    status === "published"
                      ? selected ? "bg-white" : "bg-success-500"
                      : status === "draft"
                      ? selected ? "bg-white/60" : "bg-warning-500"
                      : selected ? "bg-white/30" : "bg-border"
                  )}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={nextWeek}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-secondary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week label + legend */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">{weekLabel}</p>
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success-500" />Published</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning-500" />Draft</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-border" />Empty</span>
        </div>
      </div>

      {/* Main: meal tabs + items + catalog */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left: Meal sections for selected day */}
        <div className="space-y-4">
          {/* Meal type tabs */}
          <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
            {MEAL_TYPES.map((meal) => {
              const items = schedule[selectedKey]?.[meal] ?? [];
              return (
                <button
                  key={meal}
                  onClick={() => setSelectedMeal(meal)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
                    selectedMeal === meal
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-text-secondary hover:bg-surface-secondary"
                  )}
                >
                  {meal}
                  {items.length > 0 && (
                    <span className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                      selectedMeal === meal ? "bg-white/20 text-white" : "bg-surface-secondary text-text-tertiary"
                    )}>
                      {items.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Meal timing */}
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Clock className="h-3.5 w-3.5" />
            {selectedMeal} · {MEAL_TIMES[selectedMeal]}
          </div>

          {/* Selected items */}
          <div className="rounded-xl border border-border bg-surface p-4">
            {selectedItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-text-secondary">No items scheduled</p>
                <p className="mt-1 text-xs text-text-tertiary">Add items from the catalog →</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <Leaf className="h-3.5 w-3.5 shrink-0 text-success-600" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{item.name}</p>
                        <p className="text-xs text-text-tertiary">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isJain && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Jain</span>
                      )}
                      {item.isVegan && (
                        <span className="rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700">Vegan</span>
                      )}
                      {canEditSchedule && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-danger-50 hover:text-danger-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Catalog */}
        <div className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary">Menu Catalog</h3>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {selectedLocation ? `${selectedLocation.name} items` : "Select a location"} · click to add to {selectedMeal}
            </p>
            <input
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search items..."
              className="mt-3 w-full rounded-lg border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="max-h-[440px] overflow-y-auto p-3">
            {isLoadingCatalog ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-text-tertiary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading items…
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCatalog.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    disabled={!canEditSchedule}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-secondary"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.name}</p>
                      <p className="text-[11px] text-text-tertiary">{item.category?.name ?? "Uncategorized"}</p>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-brand-500" />
                  </button>
                ))}
                {filteredCatalog.length === 0 && !isLoadingCatalog && (
                  <p className="py-6 text-center text-xs text-text-tertiary">
                    {catalog.length === 0
                      ? "No items at this location."
                      : "All items added or no matches."}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
