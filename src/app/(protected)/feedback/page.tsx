"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getFeedback, updateFeedbackStatus, type ApiFeedback } from "@/lib/api";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ── Config ───────────────────────────────────────────────────────────────────

const SENTIMENT_CONFIG = {
  POSITIVE: { icon: ThumbsUp, color: "text-success-600", bg: "bg-success-50", label: "Positive" },
  NEUTRAL: { icon: Minus, color: "text-text-secondary", bg: "bg-surface-tertiary", label: "Neutral" },
  NEGATIVE: { icon: ThumbsDown, color: "text-danger-600", bg: "bg-danger-50", label: "Negative" },
};

const STATUS_CONFIG = {
  NEW: { label: "New", color: "text-info-700", bg: "bg-info-50" },
  ACKNOWLEDGED: { label: "Acknowledged", color: "text-warning-700", bg: "bg-warning-50" },
  RESOLVED: { label: "Resolved", color: "text-success-700", bg: "bg-success-50" },
  ESCALATED: { label: "Escalated", color: "text-danger-700", bg: "bg-danger-50" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn("h-3.5 w-3.5", s <= rating ? "fill-amber-400 text-amber-400" : "text-border")}
        />
      ))}
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<ApiFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    getFeedback()
      .then((res) => setFeedback(res.data))
      .catch(() => setFeedback([]))
      .finally(() => setIsLoading(false));
  }, []);

  async function markResolved(id: string) {
    setUpdatingId(id);
    try {
      const updated = await updateFeedbackStatus(id, "RESOLVED");
      setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status: updated.status } : f)));
    } catch {
      // silent fail
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = feedback.filter((f) => {
    const matchSentiment = sentimentFilter === "all" || f.sentiment === sentimentFilter;
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchSentiment && matchStatus;
  });

  const avgRating = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : "—";
  const positive = feedback.filter((f) => f.sentiment === "POSITIVE").length;
  const negative = feedback.filter((f) => f.sentiment === "NEGATIVE").length;
  const openCount = feedback.filter((f) => f.status === "NEW" || f.status === "ESCALATED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Feedback & Complaints</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isLoading ? "Loading…" : `${feedback.length} total · ${openCount} open`}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Avg Rating", value: isLoading ? "…" : avgRating, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Positive", value: isLoading ? "…" : positive.toString(), icon: ThumbsUp, color: "text-success-600", bg: "bg-success-50" },
          { label: "Negative", value: isLoading ? "…" : negative.toString(), icon: ThumbsDown, color: "text-danger-600", bg: "bg-danger-50" },
          { label: "Open Items", value: isLoading ? "…" : openCount.toString(), icon: AlertCircle, color: openCount > 0 ? "text-warning-600" : "text-success-600", bg: openCount > 0 ? "bg-warning-50" : "bg-success-50" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", kpi.bg)}>
                <Icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">{kpi.value}</p>
                <p className="text-xs text-text-secondary">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All Sentiment</option>
          <option value="POSITIVE">Positive</option>
          <option value="NEUTRAL">Neutral</option>
          <option value="NEGATIVE">Negative</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="NEW">New</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading feedback…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            {feedback.length === 0
              ? "No feedback received yet. Feedback is collected after orders are completed."
              : "No feedback matches your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const sentCfg = f.sentiment ? SENTIMENT_CONFIG[f.sentiment as keyof typeof SENTIMENT_CONFIG] : null;
            const statusCfg = STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.NEW;
            const SentIcon = sentCfg?.icon ?? Minus;
            const isOpen = f.status === "NEW" || f.status === "ESCALATED";

            return (
              <div
                key={f.id}
                className={cn(
                  "overflow-hidden rounded-xl border bg-surface p-4",
                  f.status === "ESCALATED" ? "border-danger-300" : "border-border",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  {/* Left: rating + sentiment */}
                  <div className="flex shrink-0 flex-col items-start gap-1.5">
                    <StarRating rating={f.rating} />
                    {sentCfg && (
                      <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", sentCfg.bg, sentCfg.color)}>
                        <SentIcon className="h-3 w-3" />
                        {sentCfg.label}
                      </div>
                    )}
                  </div>

                  {/* Center: content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{f.customer.name}</span>
                      <span className="text-xs text-text-tertiary">·</span>
                      <span className="text-xs text-text-secondary">{f.order.location.name}</span>
                      <span className="text-xs text-text-tertiary">·</span>
                      <span className="text-xs text-text-tertiary">{fmtTime(f.createdAt)}</span>
                    </div>
                    {f.category && (
                      <span className="mt-1 inline-block rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                        {f.category.replace(/_/g, " ")}
                      </span>
                    )}
                    {f.comment && (
                      <p className="mt-2 text-sm text-text-secondary leading-relaxed">{f.comment}</p>
                    )}
                    <p className="mt-1 text-xs text-text-tertiary">Order: {f.order.orderNumber}</p>
                  </div>

                  {/* Right: status + action */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusCfg.bg, statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                    {isOpen && (
                      <button
                        onClick={() => markResolved(f.id)}
                        disabled={updatingId === f.id}
                        className="flex items-center gap-1.5 rounded-lg border border-success-300 bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700 transition-colors hover:bg-success-100 disabled:opacity-50"
                      >
                        {updatingId === f.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
