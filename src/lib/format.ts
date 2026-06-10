export function fmtDate(d: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    ...opts,
  });
}

export function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPercent(n: number, decimals = 1) {
  return `${n.toFixed(decimals)}%`;
}
