import { Sparkles } from "lucide-react";
import { cn } from "cn";

export function SourcePill({
  createdVia,
  lastEditedVia,
  className,
}: {
  createdVia: "claude" | "app";
  lastEditedVia: "claude" | "app";
  className?: string;
}) {
  if (createdVia !== "claude" && lastEditedVia !== "claude") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700",
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden />
      via Claude
    </span>
  );
}
