export const CURRENCIES = ["INR", "USD", "SGD", "EUR", "GBP", "AUD"] as const;

export type Currency = (typeof CURRENCIES)[number];

export type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "declined";

export function formatMoney(amount: number, currency: string): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatProposalNumber(n: number): string {
  return `QF-${String(n).padStart(4, "0")}`;
}

export const statusMeta: Record<
  ProposalStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  draft: {
    label: "Draft",
    badgeClass: "bg-zinc-100 text-zinc-700",
    dotClass: "bg-zinc-500",
  },
  sent: {
    label: "Sent",
    badgeClass: "bg-blue-50 text-blue-700",
    dotClass: "bg-blue-500",
  },
  viewed: {
    label: "Viewed",
    badgeClass: "bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
  },
  accepted: {
    label: "Accepted",
    badgeClass: "bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  declined: {
    label: "Declined",
    badgeClass: "bg-rose-50 text-rose-700",
    dotClass: "bg-rose-500",
  },
};
