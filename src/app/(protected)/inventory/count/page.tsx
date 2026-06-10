"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  listCountSessions,
  openCountSession,
  getCountSession,
  submitCountSession,
  acceptCountVariances,
  getLocations,
  type ApiCountSession,
  type ApiCountLine,
} from "@/lib/api";
import {
  Plus,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

// ── Status badge ───────────────────────────────────────────────────────────

const SESSION_STATUS: Record<string, string> = {
  OPEN:     "bg-blue-100 text-blue-700",
  COUNTING: "bg-yellow-100 text-yellow-700",
  REVIEW:   "bg-orange-100 text-orange-700",
  CLOSED:   "bg-emerald-100 text-emerald-700",
};

// ── Count line row ─────────────────────────────────────────────────────────

function CountLineRow({
  line,
  countedValue: controlledValue,
  reasonValue,
  onCountChange,
  onReasonChange,
  isSubmitted,
  acceptSelected,
  onAcceptToggle,
}: {
  line: ApiCountLine;
  countedValue: string;
  reasonValue: string;
  onCountChange: (v: string) => void;
  onReasonChange: (v: string) => void;
  isSubmitted: boolean;
  acceptSelected: boolean;
  onAcceptToggle: () => void;
}) {
  const name = line.inventoryItem?.ingredient?.name ?? line.inventoryItemId;
  const unit = line.inventoryItem?.ingredient?.unit ?? "";
  const variance = line.variance;
  const hasDrift = variance !== null && variance !== undefined && Math.abs(variance) > 0.001;

  return (
    <tr className={cn("hover:bg-gray-50", hasDrift && "bg-orange-50/50")}>
      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{name}</td>
      <td className="px-4 py-3 tabular-nums text-right">
        {line.systemStock.toFixed(2)} {unit}
      </td>
      <td className="px-4 py-3">
        {isSubmitted ? (
          <span className="tabular-nums">
            {line.countedStock?.toFixed(2) ?? "—"} {unit}
          </span>
        ) : (
          <input
            type="number"
            step="0.01"
            value={controlledValue}
            onChange={(e) => onCountChange(e.target.value)}
            placeholder={String(line.systemStock)}
            className="w-28 border rounded-lg px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
          />
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-right">
        {variance !== null && variance !== undefined ? (
          <span className={cn("font-medium", hasDrift ? "text-orange-600" : "text-gray-500")}>
            {variance > 0 ? "+" : ""}{variance.toFixed(2)}
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3">
        {isSubmitted && hasDrift && !line.resolved ? (
          <input
            type="text"
            value={reasonValue}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Reason for variance…"
            className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
          />
        ) : line.varianceReason ? (
          <span className="text-xs text-[var(--color-text-secondary)]">{line.varianceReason}</span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-center">
        {isSubmitted && hasDrift && !line.resolved ? (
          <input
            type="checkbox"
            checked={acceptSelected}
            onChange={onAcceptToggle}
            className="rounded"
          />
        ) : line.resolved ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
        ) : null}
      </td>
    </tr>
  );
}

// ── Session detail view ────────────────────────────────────────────────────

function SessionDetail({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const [session, setSession] = useState<ApiCountSession | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [acceptedLines, setAcceptedLines] = useState<Set<string>>(new Set());
  const [submitting, setSaving] = useState(false);

  const load = async () => {
    const s = await getCountSession(sessionId);
    setSession(s);
    if (s.lines) {
      const init: Record<string, string> = {};
      s.lines.forEach((l) => {
        init[l.id] = l.countedStock !== undefined ? String(l.countedStock) : "";
      });
      setCounts(init);
    }
  };

  useEffect(() => { load(); }, [sessionId]);

  const isSubmitted = session?.status === "REVIEW" || session?.status === "CLOSED";
  const driftLines = session?.lines?.filter(
    (l) => l.variance !== null && l.variance !== undefined && Math.abs(l.variance) > 0.001 && !l.resolved,
  ) ?? [];

  const handleSubmitCount = async () => {
    if (!session?.lines) return;
    setSaving(true);
    try {
      const lines = session.lines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        countedStock: parseFloat(counts[l.id] ?? String(l.systemStock)) || l.systemStock,
        varianceReason: reasons[l.id],
      }));
      await submitCountSession(sessionId, lines);
      toast.success("Count submitted — review variances below");
      await load();
    } catch {
      toast.error("Failed to submit count");
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptVariances = async () => {
    if (acceptedLines.size === 0) {
      toast.error("Select at least one variance line to accept");
      return;
    }
    setSaving(true);
    try {
      await acceptCountVariances(sessionId, Array.from(acceptedLines));
      toast.success("Variances accepted — stock updated");
      setAcceptedLines(new Set());
      await load();
    } catch {
      toast.error("Failed to accept variances");
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return <div className="text-center py-16 text-[var(--color-text-secondary)]">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-[var(--color-text-secondary)]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {session.location?.name ?? "Count Session"}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {new Date(session.date).toLocaleString("en-IN")} ·{" "}
            <span className={cn("inline-block px-1.5 py-0.5 rounded text-xs font-medium", SESSION_STATUS[session.status] ?? "bg-gray-100 text-gray-600")}>
              {session.status}
            </span>
          </p>
        </div>
      </div>

      {driftLines.length > 0 && session.status === "REVIEW" && (
        <div className="flex items-center justify-between rounded-xl bg-orange-50 border border-orange-200 px-4 py-3">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{driftLines.length} variance(s) need review</span>
          </div>
          <button
            onClick={handleAcceptVariances}
            disabled={submitting || acceptedLines.size === 0}
            className="text-sm font-medium bg-orange-600 text-white px-4 py-1.5 rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            Accept Selected ({acceptedLines.size})
          </button>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface)] border-b text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-right">System Stock</th>
              <th className="px-4 py-3 text-left">Counted</th>
              <th className="px-4 py-3 text-right">Variance</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-center">Accept</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(session.lines ?? []).map((line) => (
              <CountLineRow
                key={line.id}
                line={line}
                countedValue={counts[line.id] ?? ""}
                reasonValue={reasons[line.id] ?? ""}
                onCountChange={(v) => setCounts((prev) => ({ ...prev, [line.id]: v }))}
                onReasonChange={(v) => setReasons((prev) => ({ ...prev, [line.id]: v }))}
                isSubmitted={isSubmitted}
                acceptSelected={acceptedLines.has(line.id)}
                onAcceptToggle={() =>
                  setAcceptedLines((prev) => {
                    const next = new Set(prev);
                    if (next.has(line.id)) next.delete(line.id);
                    else next.add(line.id);
                    return next;
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {session.status === "OPEN" && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmitCount}
            disabled={submitting}
            className="px-6 py-2.5 bg-[var(--color-primary-500)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-600)] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Count for Review"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PhysicalCountPage() {
  const { can } = useAuth();
  const [sessions, setSessions] = useState<ApiCountSession[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sess, locs] = await Promise.all([
        listCountSessions(selectedLocation || undefined),
        getLocations(),
      ]);
      setSessions(Array.isArray(sess) ? sess : []);
      setLocations(locs);
    } catch {
      toast.error("Failed to load count sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedLocation]);

  if (!can("inventory:view")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-secondary)]">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleOpenSession = async () => {
    if (!selectedLocation) {
      toast.error("Select a location to start a count");
      return;
    }
    setCreating(true);
    try {
      const session = await openCountSession(selectedLocation);
      toast.success("Count session opened");
      setOpenSessionId(session.id);
    } catch {
      toast.error("Failed to open count session");
    } finally {
      setCreating(false);
    }
  };

  if (openSessionId) {
    return (
      <SessionDetail
        sessionId={openSessionId}
        onBack={() => {
          setOpenSessionId(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Physical Count
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Open a session to snapshot and verify stock levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
          >
            <option value="">All Locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button
            onClick={handleOpenSession}
            disabled={creating || !selectedLocation}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-600)] disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {creating ? "Starting…" : "Start Count"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[var(--color-text-secondary)]">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-secondary)]">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No count sessions yet</p>
          <p className="text-sm mt-1">Select a location and click "Start Count" to begin</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface)] border-b text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3 text-center">Drift</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpenSessionId(s.id)}>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {new Date(s.date).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                    {s.location?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{s.totalItemsCount}</td>
                  <td className="px-4 py-3 text-center">
                    {s.driftItemsCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {s.driftItemsCount}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", SESSION_STATUS[s.status] ?? "bg-gray-100 text-gray-600")}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
