import { formatMoney } from "@/lib/proposals/format";
import { cn } from "cn";

export function Money({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(amount, currency)}</span>;
}
