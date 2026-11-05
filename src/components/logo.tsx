import { cn } from "cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-zinc-950", className)}>
      <span className="size-5 shrink-0 rounded-md bg-indigo-600" aria-hidden />
      Quoteflow
    </span>
  );
}
