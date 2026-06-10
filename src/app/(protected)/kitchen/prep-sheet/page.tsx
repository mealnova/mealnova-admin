"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getLocations,
  getPrepSheet,
  type ApiLocation,
  type ApiPrepSheet,
} from "@/lib/api";
import { ChefHat, Printer, Loader2, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const SLOT_ORDER: Record<string, number> = {
  BREAKFAST: 0,
  LUNCH: 1,
  SNACKS: 2,
  DINNER: 3,
};

const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  SNACKS: "Snacks",
  DINNER: "Dinner",
};

const STATION_COLORS: Record<string, string> = {
  Tandoor: "bg-orange-50 border-orange-200",
  Grill: "bg-amber-50 border-amber-200",
  "Rice Station": "bg-yellow-50 border-yellow-200",
  "Dal / Curry": "bg-green-50 border-green-200",
  "Bread Station": "bg-stone-50 border-stone-200",
  "Cold Station": "bg-blue-50 border-blue-200",
  Dessert: "bg-pink-50 border-pink-200",
  "Soup Station": "bg-teal-50 border-teal-200",
  Beverages: "bg-cyan-50 border-cyan-200",
  "Main Kitchen": "bg-gray-50 border-gray-200",
};

export default function PrepSheetPage() {
  const { can } = useAuth();
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [date, setDate] = useState(today());
  const [prepSheet, setPrepSheet] = useState<ApiPrepSheet | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getLocations()
      .then((res) => {
        const locs = Array.isArray(res) ? res : (res as any).data ?? [];
        setLocations(locs);
        if (locs.length > 0) setLocationId(locs[0].id);
      })
      .catch(() => toast.error("Failed to load locations"));
  }, []);

  const loadPrepSheet = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const sheet = await getPrepSheet(locationId, date);
      setPrepSheet(sheet);
    } catch {
      toast.error("Failed to load prep sheet");
    } finally {
      setLoading(false);
    }
  }, [locationId, date]);

  useEffect(() => {
    loadPrepSheet();
  }, [loadPrepSheet]);

  if (!can("kitchen:view")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-secondary)]">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const sortedSlots = prepSheet?.slots.slice().sort(
    (a, b) => (SLOT_ORDER[a.mealSlot] ?? 99) - (SLOT_ORDER[b.mealSlot] ?? 99),
  ) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Prep Sheet</h1>
          <p className="text-sm text-gray-500 mt-0.5">Station-grouped cooking tasks for the day</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadPrepSheet}
            disabled={loading}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="h-9 px-4 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 inline-flex items-center gap-1.5 font-medium"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Print-only title */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Kitchen Prep Sheet</h1>
        <p className="text-sm text-gray-500">
          {locations.find((l) => l.id === locationId)?.name ?? locationId} &middot; {fmtDate(date)}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <div className="relative">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-9 pl-3 pr-8 border border-gray-200 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : sortedSlots.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No prep tasks for {fmtDate(date)}</p>
          <p className="text-sm mt-1">
            Publish a weekly menu and generate a forecast to see prep tasks.
          </p>
        </div>
      ) : (
        sortedSlots.map((slot) => (
          <div key={slot.mealSlot} className="space-y-3">
            {/* Slot header */}
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-gray-900">
                {SLOT_LABELS[slot.mealSlot] ?? slot.mealSlot}
              </h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {slot.expectedCovers} covers
              </span>
            </div>

            {/* Stations grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2">
              {slot.stations.map((st) => (
                <div
                  key={st.station}
                  className={cn(
                    "border rounded-xl p-4",
                    STATION_COLORS[st.station] ?? "bg-gray-50 border-gray-200",
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <ChefHat className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-800">{st.station}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {st.items.map((item) => (
                      <li key={item.menuItemId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate mr-2">{item.menuItemName}</span>
                        <span className="font-semibold text-gray-900 whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Print-friendly footer */}
      <div className="hidden print:block text-xs text-gray-400 border-t border-gray-200 pt-4 mt-8">
        Printed on {new Date().toLocaleString("en-IN")}
      </div>
    </div>
  );
}
