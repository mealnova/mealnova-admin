"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getStockMovements,
  type ApiStockMovement,
  type ApiInventoryItem,
} from "@/lib/api";

const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE_RECEIPT:          { label: "Purchase",         color: "text-success-600" },
  MANUAL_ADJUSTMENT:         { label: "Adjustment",       color: "text-text-secondary" },
  CONSUMPTION:               { label: "Consumption",      color: "text-warning-600" },
  WASTE:                     { label: "Waste",            color: "text-danger-600" },
  TRANSFER_IN:               { label: "Transfer In",      color: "text-info-600" },
  TRANSFER_OUT:              { label: "Transfer Out",     color: "text-warning-600" },
  OPENING_BALANCE:           { label: "Opening Balance",  color: "text-text-tertiary" },
  RECONCILIATION_CORRECTION: { label: "Recon Correction", color: "text-brand-600" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StockMovementPanel({
  item,
  onClose,
}: {
  item: ApiInventoryItem;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<ApiStockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    setLoading(true);
    getStockMovements(item.id, { page, pageSize })
      .then((res) => {
        setMovements(res.data);
        setTotal(res.total);
      })
      .catch(() => toast.error("Failed to load movement history"))
      .finally(() => setLoading(false));
  }, [item.id, page]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Movement History
            </h2>
            <p className="text-xs text-text-tertiary">
              {item.ingredient.name} · Current: {item.currentStock} {item.unit}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
              <Minus className="mb-2 h-8 w-8" />
              <p className="text-sm">No movement history yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-secondary">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5 text-right">Delta</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                  <th className="px-4 py-2.5">Reason / By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m) => {
                  const cfg = MOVEMENT_LABELS[m.movementType] ?? {
                    label: m.movementType,
                    color: "text-text-secondary",
                  };
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-surface-secondary/60">
                      <td className="px-4 py-2.5 text-xs text-text-tertiary whitespace-nowrap">
                        {fmtDate(m.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-xs font-medium", cfg.color)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5",
                            isPositive ? "text-success-600" : "text-danger-600",
                          )}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {isPositive ? "+" : ""}
                          {m.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">
                        {m.balanceAfter}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-text-tertiary">
                        {m.reason ?? "—"}
                        {m.user ? (
                          <span className="ml-1 text-text-secondary">
                            · {m.user.name}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
            <span className="text-text-tertiary">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-secondary disabled:opacity-40 hover:bg-surface-secondary"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-secondary disabled:opacity-40 hover:bg-surface-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
