"use client";

import { useState, useEffect } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getEventPipeline,
  getEvents,
  advanceEventStage,
  reviewEventRequest,
  generateEventProposal,
  type ApiEvent,
  type ApiPipelineSummary,
  type ApiEventProposal,
  type EventStage,
  type ReviewStatus,
} from "@/lib/api";
import {
  Calendar,
  Users,
  ChevronRight,
  X,
  ArrowRight,
  Phone,
  MapPin,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

// ── Stage config ────────────────────────────────────────────────────────────

const STAGES: { key: EventStage; label: string; color: string; bg: string }[] = [
  { key: "INQUIRY",              label: "Inquiry",           color: "text-gray-600",    bg: "bg-gray-50 border-gray-200" },
  { key: "SITE_VISIT_SCHEDULED", label: "Site Visit",        color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" },
  { key: "PROPOSAL_SENT",        label: "Proposal Sent",     color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-200" },
  { key: "NEGOTIATING",          label: "Negotiating",       color: "text-yellow-700",  bg: "bg-yellow-50 border-yellow-200" },
  { key: "CONFIRMED",            label: "Confirmed",         color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  { key: "COMPLETED",            label: "Completed",         color: "text-teal-700",    bg: "bg-teal-50 border-teal-200" },
];

const NEXT_STAGE: Partial<Record<EventStage, EventStage>> = {
  INQUIRY:              "SITE_VISIT_SCHEDULED",
  SITE_VISIT_SCHEDULED: "PROPOSAL_SENT",
  PROPOSAL_SENT:        "NEGOTIATING",
  NEGOTIATING:          "CONFIRMED",
  CONFIRMED:            "COMPLETED",
  COMPLETED:            "INVOICED",
};

const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Pending", bg: "bg-warning-50", text: "text-warning-700" },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "bg-blue-50", text: "text-blue-700" },
  APPROVED: { label: "Approved", bg: "bg-success-50", text: "text-success-700" },
  REJECTED: { label: "Rejected", bg: "bg-danger-50", text: "text-danger-700" },
};

// ── Advance Stage Modal ────────────────────────────────────────────────────

function AdvanceModal({
  event,
  onClose,
  onDone,
}: {
  event: ApiEvent;
  onClose: () => void;
  onDone: () => void;
}) {
  const targetStage = NEXT_STAGE[event.stage];
  const [siteVisitDate, setSiteVisitDate] = useState("");
  const [proposalUrl, setProposalUrl] = useState("");
  const [negotiatedPrice, setNegotiatedPrice] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [markLost, setMarkLost] = useState(false);
  const [saving, setSaving] = useState(false);

  const targetLabel = markLost ? "LOST" : (targetStage ? STAGES.find((s) => s.key === targetStage)?.label : "—");

  const handleSubmit = async () => {
    if (!targetStage && !markLost) return;
    setSaving(true);
    try {
      const stage: EventStage = markLost ? "LOST" : targetStage!;
      await advanceEventStage(event.id, {
        stage,
        ...(siteVisitDate && { siteVisitDate }),
        ...(proposalUrl && { proposalUrl }),
        ...(negotiatedPrice && { negotiatedPrice: parseFloat(negotiatedPrice) }),
        ...(advanceAmount && { advanceAmount: parseFloat(advanceAmount) }),
        ...(lostReason && { lostReason }),
      });
      toast.success(`Event moved to ${targetLabel}`);
      onDone();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to advance stage";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-[var(--color-text-primary)]">
            Advance: {event.clientName}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{event.stage}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className={cn("font-medium", markLost ? "text-red-600" : "text-emerald-700")}>
              {targetLabel}
            </span>
          </div>

          {/* Required fields per target stage */}
          {targetStage === "SITE_VISIT_SCHEDULED" && !markLost && (
            <div>
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Site Visit Date *</label>
              <input type="datetime-local" value={siteVisitDate} onChange={(e) => setSiteVisitDate(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]" />
            </div>
          )}
          {targetStage === "PROPOSAL_SENT" && !markLost && (
            <div>
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Proposal URL *</label>
              <input type="url" value={proposalUrl} onChange={(e) => setProposalUrl(e.target.value)}
                placeholder="https://docs.google.com/…"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]" />
            </div>
          )}
          {targetStage === "CONFIRMED" && !markLost && (
            <>
              <div>
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Negotiated Price (₹) *</label>
                <input type="number" value={negotiatedPrice} onChange={(e) => setNegotiatedPrice(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Advance Amount (₹) *</label>
                <input type="number" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]" />
              </div>
            </>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="markLost" checked={markLost} onChange={(e) => setMarkLost(e.target.checked)}
              className="rounded" />
            <label htmlFor="markLost" className="text-sm text-red-600 font-medium">Mark as LOST instead</label>
          </div>
          {markLost && (
            <div>
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Reason for losing *</label>
              <input type="text" value={lostReason} onChange={(e) => setLostReason(e.target.value)}
                placeholder="Price too high / went with competitor / …"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]" />
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60",
              markLost ? "bg-red-600 hover:bg-red-700" : "bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)]",
            )}
          >
            {saving ? "Saving…" : `Move to ${targetLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Proposal Modal ─────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ProposalModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const [proposal, setProposal] = useState<ApiEventProposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateEventProposal(eventId)
      .then(setProposal)
      .catch(() => toast.error("Failed to generate proposal"))
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary-500)]" />
            <h2 className="font-semibold text-[var(--color-text-primary)]">Event Proposal</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16 text-[var(--color-text-secondary)]">
            Generating proposal…
          </div>
        ) : proposal ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible">
            {/* Business header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-xl font-bold text-[var(--color-primary-500)]">Hanuman Caterers</h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Pure Vegetarian · Est. 2009 · Pune</p>
              <p className="text-sm font-semibold mt-2 text-[var(--color-text-primary)]">EVENT CATERING PROPOSAL</p>
            </div>

            {/* Event details */}
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Client</h3>
                <p className="font-medium text-[var(--color-text-primary)]">{proposal.event.clientName}</p>
                <p className="text-[var(--color-text-secondary)]">{proposal.event.clientPhone}</p>
                {proposal.event.clientEmail && <p className="text-[var(--color-text-secondary)]">{proposal.event.clientEmail}</p>}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Event Details</h3>
                <p className="font-medium text-[var(--color-text-primary)]">{proposal.event.name}</p>
                <p className="text-[var(--color-text-secondary)]">
                  {new Date(proposal.event.eventDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-[var(--color-text-secondary)]">{proposal.event.venueAddress}</p>
                <p className="text-[var(--color-text-secondary)]">
                  {proposal.event.guestCount} guests · {proposal.event.menuType.replace(/_/g, " ")} · {proposal.event.eventType}
                </p>
              </div>
            </div>

            {/* Menu items */}
            {proposal.menuItems.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">Menu Selection</h3>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-[var(--color-text-secondary)] border-b">
                        <th className="px-4 py-2 text-left font-medium">Item</th>
                        <th className="px-4 py-2 text-left font-medium">Category</th>
                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {proposal.menuItems.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-[var(--color-text-primary)]">{item.name}</td>
                          <td className="px-4 py-2 text-[var(--color-text-secondary)] text-xs">{item.category}</td>
                          <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">{item.quantity ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pricing breakdown */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                Pricing Breakdown
                <span className="ml-2 normal-case font-normal text-[var(--color-text-secondary)]">
                  (HSN {proposal.pricing.hsnCode} · {proposal.pricing.gstRate}% GST — outdoor catering)
                </span>
              </h3>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">Per plate rate</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(proposal.pricing.perPlatePrice)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">Guests</td>
                      <td className="px-4 py-3 text-right tabular-nums">{proposal.pricing.guestCount}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">Subtotal</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(proposal.pricing.subtotal)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">CGST @ 9%</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(proposal.pricing.cgst)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">SGST @ 9%</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(proposal.pricing.sgst)}</td>
                    </tr>
                    <tr className="bg-[var(--color-surface)] font-semibold">
                      <td className="px-4 py-3 text-[var(--color-text-primary)]">Total</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--color-primary-500)] text-base">
                        {fmt(proposal.pricing.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment terms */}
            <div className="rounded-xl bg-[var(--color-surface)] border p-4 space-y-1.5 text-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">Payment Terms</h3>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Advance ({proposal.advance.advancePercent}%)</span>
                <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{fmt(proposal.advance.advanceAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Balance due on event day</span>
                <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{fmt(proposal.advance.balanceDue)}</span>
              </div>
            </div>

            <p className="text-xs text-center text-[var(--color-text-secondary)]">
              Generated {new Date(proposal.generatedAt).toLocaleString("en-IN")} · Valid for 7 days
            </p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-16 text-[var(--color-text-secondary)]">
            Failed to load proposal
          </div>
        )}
      </div>
    </div>
  );
}

// ── Event card ─────────────────────────────────────────────────────────────

// Stages where a proposal has been / is being sent — show Proposal button
const PROPOSAL_STAGES: EventStage[] = [
  "PROPOSAL_SENT", "NEGOTIATING", "CONFIRMED", "COMPLETED", "INVOICED",
];

function EventCard({
  event,
  onAdvance,
  onViewProposal,
}: {
  event: ApiEvent;
  onAdvance: (e: ApiEvent) => void;
  onViewProposal: (id: string) => void;
}) {
  const value = event.negotiatedPrice ?? event.estimatedTotal;
  const eventDate = new Date(event.eventDate);

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3 hover:shadow-sm transition-shadow">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[var(--color-text-primary)] text-sm">{event.clientName}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", REVIEW_STATUS_CONFIG[event.reviewStatus].bg, REVIEW_STATUS_CONFIG[event.reviewStatus].text)}>
            {REVIEW_STATUS_CONFIG[event.reviewStatus].label}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">{event.name}</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          {eventDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          {event.guestCount} guests · {event.menuType}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{event.venueAddress}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
          {event.clientPhone}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t">
        <span className="text-sm font-bold text-[var(--color-primary-500)]">
          {formatCurrency(value)}
        </span>
        <div className="flex items-center gap-2">
          {PROPOSAL_STAGES.includes(event.stage) && (
            <button
              onClick={() => onViewProposal(event.id)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <FileText className="w-3 h-3" />
              Proposal
            </button>
          )}
          {NEXT_STAGE[event.stage] && (
            <button
              onClick={() => onAdvance(event)}
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]"
            >
              Advance <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { can } = useAuth();
  const [pipeline, setPipeline] = useState<ApiPipelineSummary | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancingEvent, setAdvancingEvent] = useState<ApiEvent | null>(null);
  const [proposalEventId, setProposalEventId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [summary, events] = await Promise.all([
        getEventPipeline(),
        getEvents({ pageSize: 100 }),
      ]);
      setPipeline(summary);
      setReviewQueue(events.data.filter((event) => event.reviewStatus !== "APPROVED"));
    } catch {
      toast.error("Failed to load event pipeline");
    } finally {
      setLoading(false);
    }
  };

  async function handleReview(event: ApiEvent, reviewStatus: ReviewStatus) {
    const notes =
      reviewStatus === "APPROVED"
        ? ""
        : (window.prompt(
            reviewStatus === "CHANGES_REQUESTED"
              ? "What changes should the client make before you continue?"
              : "Why is this request being rejected?",
          ) ?? "");

    if (reviewStatus !== "APPROVED" && !notes.trim()) {
      toast.error("A short note is required for this action");
      return;
    }

    try {
      await reviewEventRequest(event.id, {
        reviewStatus,
        notes: notes.trim() || undefined,
      });
      toast.success(`Request marked ${REVIEW_STATUS_CONFIG[reviewStatus].label.toLowerCase()}`);
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to review event request");
    }
  }

  useEffect(() => { load(); }, []);

  if (!can("accounts:view")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-secondary)]">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-secondary)]">
        Loading event pipeline…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Event Pipeline
          </h1>
          {pipeline && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              {pipeline.totalEvents} active event{pipeline.totalEvents !== 1 ? "s" : ""} ·{" "}
              <span className="font-medium text-[var(--color-primary-500)]">
                {formatCurrency(pipeline.totalPipelineValue)} pipeline value
              </span>
            </p>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Public Request Review</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Approve, reject, or request changes before the event moves through the full pipeline.
          </p>
        </div>

        {reviewQueue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-text-tertiary">
            No event requests are waiting for review.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {reviewQueue.map((event) => (
              <div key={event.id} className="rounded-xl border border-border bg-white p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold text-[var(--color-text-primary)]">{event.clientName}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", REVIEW_STATUS_CONFIG[event.reviewStatus].bg, REVIEW_STATUS_CONFIG[event.reviewStatus].text)}>
                        {REVIEW_STATUS_CONFIG[event.reviewStatus].label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {event.eventType} · {event.guestCount} guests
                    </p>
                  </div>
                  <button
                    onClick={() => setProposalEventId(event.id)}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Proposal
                  </button>
                </div>

                <div className="grid gap-2 text-sm text-[var(--color-text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-text-tertiary" />
                    {new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-text-tertiary" />
                    {event.clientPhone}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-text-tertiary" />
                    <span className="line-clamp-1">{event.venueAddress}</span>
                  </div>
                </div>

                {event.reviewNotes ? (
                  <div className="rounded-lg border border-border bg-surface-secondary px-3 py-3 text-sm text-text-secondary">
                    {event.reviewNotes}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleReview(event, "APPROVED")}
                    className="inline-flex items-center gap-1 rounded-lg bg-success-600 px-3 py-2 text-xs font-semibold text-white hover:bg-success-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(event, "CHANGES_REQUESTED")}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => handleReview(event, "REJECTED")}
                    className="inline-flex items-center gap-1 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700 hover:bg-danger-100"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Kanban columns */}
      {pipeline && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(({ key, label, color, bg }) => {
              const events = pipeline.byStage[key] ?? [];
              const stageValue = events.reduce(
                (s, e) => s + (e.negotiatedPrice ?? e.estimatedTotal),
                0,
              );
              return (
                <div key={key} className="w-64 flex-shrink-0 space-y-3">
                  <div className={cn("rounded-xl border px-3 py-2", bg)}>
                    <div className="flex items-center justify-between">
                      <p className={cn("text-xs font-semibold uppercase tracking-wider", color)}>
                        {label}
                      </p>
                      <span className={cn("text-xs font-bold rounded-full px-2 py-0.5", bg, color)}>
                        {events.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <p className={cn("text-xs mt-0.5", color)}>
                        {formatCurrency(stageValue)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {events.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed bg-gray-50/50 p-4 text-center text-xs text-gray-400">
                        No events
                      </div>
                    ) : (
                      events.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onAdvance={setAdvancingEvent}
                          onViewProposal={setProposalEventId}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Advance stage modal */}
      {advancingEvent && (
        <AdvanceModal
          event={advancingEvent}
          onClose={() => setAdvancingEvent(null)}
          onDone={() => {
            setAdvancingEvent(null);
            load();
          }}
        />
      )}

      {/* Proposal modal */}
      {proposalEventId && (
        <ProposalModal
          eventId={proposalEventId}
          onClose={() => setProposalEventId(null)}
        />
      )}
    </div>
  );
}
