"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Plus,
  Phone,
  Users,
  Building2,
  ChefHat,
  Home,
  Loader2,
  Lock,
  Clock,
  Edit,
  X,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getLocations,
  createLocation,
  deleteLocation,
  updateLocation,
  type ApiLocation,
  type ApiLocationType,
  type CreateLocationPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

// ── Type config ─────────────────────────────────────────────

const TYPE_CONFIG: Record<ApiLocationType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  CORPORATE_CAFETERIA: { label: "Corporate Cafeteria", icon: Building2, color: "text-info-600", bg: "bg-info-50" },
  HOSTEL: { label: "Hostel", icon: Home, color: "text-brand-600", bg: "bg-brand-50" },
  CENTRAL_KITCHEN: { label: "Central Kitchen", icon: ChefHat, color: "text-purple-600", bg: "bg-purple-50" },
  EVENT_VENUE: { label: "Event Venue", icon: MapPin, color: "text-amber-600", bg: "bg-amber-50" },
  CLOUD_KITCHEN: { label: "Cloud Kitchen", icon: ChefHat, color: "text-cyan-700", bg: "bg-cyan-50" },
};

const FALLBACK_TYPE = { label: "Location", icon: MapPin, color: "text-text-secondary", bg: "bg-surface-tertiary" };
const LOCATION_TYPE_OPTIONS = Object.entries(TYPE_CONFIG) as Array<
  [ApiLocationType, (typeof TYPE_CONFIG)[ApiLocationType]]
>;

// ── Edit Modal ──────────────────────────────────────────────

function EditLocationModal({
  location,
  onClose,
  onSaved,
}: {
  location: ApiLocation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: location.name,
    type: location.type,
    address: location.address,
    city: location.city ?? "",
    pincode: location.pincode ?? "",
    contactPerson: location.contactPerson ?? "",
    contactPhone: location.contactPhone ?? "",
    fssaiLicense: location.fssaiLicense ?? "",
    openTime: location.openTime,
    closeTime: location.closeTime,
    dailyCapacity: location.dailyCapacity,
    isRestricted: location.isRestricted,
    isActive: location.isActive,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Name is required.");
    setIsSaving(true);
    try {
      await updateLocation(location.id, {
        name: form.name.trim(),
        type: form.type,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        fssaiLicense: form.fssaiLicense.trim() || undefined,
        openTime: form.openTime,
        closeTime: form.closeTime,
        dailyCapacity: Number(form.dailyCapacity),
        isRestricted: form.isRestricted,
        isActive: form.isActive,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save. Is the API running?");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">Edit Location</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-secondary">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Location Name *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Type *</label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              {LOCATION_TYPE_OPTIONS.map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address + City + Pincode */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Address</label>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">City</label>
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Pune"
                className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Pincode</label>
              <input
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value)}
                placeholder="411045"
                className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Contact Person</label>
              <input
                value={form.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Contact Phone</label>
              <input
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                placeholder="+91-"
                className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* FSSAI */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">FSSAI License Number</label>
            <input
              value={form.fssaiLicense}
              onChange={(e) => set("fssaiLicense", e.target.value)}
              placeholder="14-digit FSSAI number"
              className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Hours + Capacity */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Open Time</label>
              <input
                type="time"
                value={form.openTime}
                onChange={(e) => set("openTime", e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Close Time</label>
              <input
                type="time"
                value={form.closeTime}
                onChange={(e) => set("closeTime", e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Daily Capacity</label>
              <input
                type="number"
                min={0}
                value={form.dailyCapacity}
                onChange={(e) => set("dailyCapacity", parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isRestricted}
                onChange={(e) => set("isRestricted", e.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand-500"
              />
              <span className="text-sm text-text-primary">Restricted (employees only)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand-500"
              />
              <span className="text-sm text-text-primary">Active</span>
            </label>
          </div>

          {error && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Location Modal ───────────────────────────────────────

function AddLocationModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateLocationPayload>({
    name: "", type: "CORPORATE_CAFETERIA", address: "", city: "", pincode: "",
    contactPerson: "", contactPhone: "", fssaiLicense: "",
    dailyCapacity: 100, openTime: "07:30", closeTime: "21:30",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Name is required.");
    if (!form.pincode.trim()) return setError("Pincode is required.");
    setIsSaving(true);
    try {
      await createLocation({
        name: form.name.trim(),
        type: form.type,
        address: form.address.trim(),
        city: form.city?.trim() || undefined,
        pincode: form.pincode.trim(),
        contactPhone: form.contactPhone?.trim() || undefined,
        contactPerson: form.contactPerson?.trim() || undefined,
        fssaiLicense: form.fssaiLicense?.trim() || undefined,
        openTime: form.openTime,
        closeTime: form.closeTime,
        dailyCapacity: Number(form.dailyCapacity),
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to create location. Is the API running?");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">Add Location</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-secondary">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Location Name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Type *</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
              {LOCATION_TYPE_OPTIONS.map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Address</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">City</label>
              <input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Pune" className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Pincode *</label>
              <input value={form.pincode ?? ""} onChange={(e) => set("pincode", e.target.value)} placeholder="411045" className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Contact Person</label>
              <input value={form.contactPerson ?? ""} onChange={(e) => set("contactPerson", e.target.value)} className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Contact Phone</label>
              <input value={form.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+91-" className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">FSSAI License Number</label>
            <input value={form.fssaiLicense ?? ""} onChange={(e) => set("fssaiLicense", e.target.value)} placeholder="14-digit FSSAI number" className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Open Time</label>
              <input type="time" value={form.openTime} onChange={(e) => set("openTime", e.target.value)} className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Close Time</label>
              <input type="time" value={form.closeTime} onChange={(e) => set("closeTime", e.target.value)} className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Daily Capacity</label>
              <input type="number" min={0} value={form.dailyCapacity} onChange={(e) => set("dailyCapacity", parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
          {error && <p className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Location
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete Dialog ────────────────────────────────────

function ConfirmDeleteDialog({ open, onClose, onConfirm, name, type }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
  type: string;
}) {
  return (
    <div className={open ? "fixed inset-0 z-50 flex items-center justify-center p-4" : "hidden"}>
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Delete {type}?</h3>
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-text-secondary hover:bg-surface-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function LocationsPage() {
  const { can } = useAuth();
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState<ApiLocation | null>(null);
  const [addingOpen, setAddingOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  async function loadLocations() {
    setIsLoading(true);
    try {
      const locs = await getLocations();
      setLocations(locs);
    } catch {
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  function handleSaved() {
    const id = editingLocation!.id;
    setEditingLocation(null);
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2500);
    loadLocations();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (!can("locations:delete")) return;
    try {
      await deleteLocation(deleteTarget.id);
      setLocations((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
    setDeleteTarget(null);
  }

  const active = locations.filter((l) => l.isActive).length;
  const restricted = locations.filter((l) => l.isRestricted).length;

  return (
    <div className="space-y-6">
      {editingLocation && (
        <EditLocationModal
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSaved={handleSaved}
        />
      )}
      {addingOpen && (
        <AddLocationModal
          onClose={() => setAddingOpen(false)}
          onSaved={() => { setAddingOpen(false); loadLocations(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Locations</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isLoading
              ? "Loading…"
              : `${active} active · ${restricted} restricted · ${locations.length} total`}
          </p>
        </div>
        {can("locations:create") && (
          <button onClick={() => setAddingOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600">
            <Plus className="h-4 w-4" />
            Add Location
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading locations…
        </div>
      ) : locations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center text-sm text-text-tertiary">
          No locations found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => {
            const typeInfo = TYPE_CONFIG[loc.type] ?? FALLBACK_TYPE;
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={loc.id}
                className={cn(
                  "group rounded-xl border bg-surface p-5 transition-all hover:shadow-sm",
                  savedId === loc.id
                    ? "border-success-400 bg-success-50"
                    : loc.isRestricted
                    ? "border-warning-200 hover:border-warning-300"
                    : "border-border hover:border-brand-200"
                )}
              >
                {/* Top row */}
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn("flex items-center gap-2 rounded-full px-3 py-1", typeInfo.bg)}>
                    <TypeIcon className={cn("h-3.5 w-3.5", typeInfo.color)} />
                    <span className={cn("text-xs font-medium", typeInfo.color)}>{typeInfo.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {savedId === loc.id && (
                      <CheckCircle2 className="h-4 w-4 text-success-600" />
                    )}
                    {loc.isRestricted && (
                      <Lock className="h-3.5 w-3.5 text-warning-600" aria-label="Restricted — employees only" />
                    )}
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      loc.isActive ? "bg-success-500" : "bg-slate-300"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      loc.isActive ? "text-success-700" : "text-slate-500"
                    )}>
                      {loc.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-base font-semibold text-text-primary group-hover:text-brand-600 transition-colors">
                  {loc.name}
                </h3>

                {/* Access control note */}
                {loc.isRestricted && (
                  <p className="mt-1 text-xs font-medium text-warning-700">Restricted — employees only</p>
                )}

                {/* Address */}
                <div className="mt-2 flex items-start gap-2 text-sm text-text-secondary">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  <span>
                    {loc.address}
                    {loc.city ? `, ${loc.city}` : ""}
                  </span>
                </div>

                {/* FSSAI */}
                {loc.fssaiLicense && (
                  <p className="mt-1 text-xs text-text-tertiary">FSSAI: {loc.fssaiLicense}</p>
                )}

                {/* Hours */}
                {loc.openTime && loc.closeTime && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-text-tertiary">
                    <Clock className="h-3.5 w-3.5" />
                    {loc.openTime} – {loc.closeTime}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-border-light pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                      <Users className="h-3.5 w-3.5 text-text-tertiary" />
                      <span>{loc.dailyCapacity.toLocaleString("en-IN")} meals/day</span>
                    </div>
                    {loc.contactPhone && (
                      <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                        <Phone className="h-3.5 w-3.5 text-text-tertiary" />
                        <span>{loc.contactPhone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {can("locations:edit") && (
                      <button
                        onClick={() => setEditingLocation(loc)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                    {can("locations:delete") && (
                      <button
                        onClick={() => setDeleteTarget({ id: loc.id, name: loc.name })}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        name={deleteTarget?.name ?? ""}
        type="Location"
      />
    </div>
  );
}
