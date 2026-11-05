"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getDashboardPulse } from "@/app/app/actions";
import { CopyButton } from "@/components/copy-button";
import { Money } from "@/components/money";
import { SourcePill } from "@/components/source-pill";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EXAMPLE_PROMPTS } from "@/lib/prompts";
import type { ProposalStatus } from "@/lib/proposals/format";
import { cn } from "cn";

export type DashboardRow = {
  id: string;
  displayNumber: string;
  title: string;
  clientName: string;
  clientCompany: string | null;
  status: ProposalStatus;
  createdVia: "claude" | "app";
  lastEditedVia: "claude" | "app";
  total: number;
  currency: string;
  updatedAt: string;
};

const FILTERS: { id: "all" | ProposalStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "viewed", label: "Viewed" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
];

export function Dashboard({
  rows,
  counts,
  totalCount,
  query,
  status,
  openValue,
  acceptedThisMonth,
  winRate,
  awaiting,
  currency,
  otherCurrencies,
  pulse,
}: {
  rows: DashboardRow[];
  counts: Record<ProposalStatus, number>;
  totalCount: number;
  query: string;
  status: ProposalStatus | "all";
  openValue: number;
  acceptedThisMonth: number;
  winRate: number | null;
  awaiting: number;
  currency: string;
  otherCurrencies: boolean;
  pulse: { latestUpdatedAt: string | null; count: number };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [highlights, setHighlights] = useState<string[]>([]);
  const seen = useRef(rows);
  const pulseRef = useRef(pulse);

  useEffect(() => {
    const previous = seen.current;
    const changed = rows
      .filter((row) => {
        const prior = previous.find((item) => item.id === row.id);
        return !prior || prior.updatedAt !== row.updatedAt;
      })
      .map((row) => row.id);
    seen.current = rows;
    if (changed.length === 0 || previous === rows) return;
    setHighlights(changed);
    const timer = window.setTimeout(() => setHighlights([]), 1600);
    return () => window.clearTimeout(timer);
  }, [rows]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const next = await getDashboardPulse();
      if (!next.ok) return;
      const current = pulseRef.current;
      if (
        next.data.latestUpdatedAt !== current.latestUpdatedAt ||
        next.data.count !== current.count
      ) {
        pulseRef.current = next.data;
        router.refresh();
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    pulseRef.current = pulse;
  }, [pulse]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === query) return;
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search.trim()) params.set("q", search.trim());
      const next = params.size ? `/app?${params.toString()}` : "/app";
      router.replace(next);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, query, status, router]);

  const stats = useMemo(
    () => [
      {
        label: "Open pipeline",
        value: <Money amount={openValue} currency={currency} />,
        note: otherCurrencies ? "+ other currencies" : currency,
      },
      {
        label: "Accepted this month",
        value: <Money amount={acceptedThisMonth} currency={currency} />,
        note: otherCurrencies ? "+ other currencies" : "This calendar month",
      },
      {
        label: "Win rate",
        value: winRate === null ? "—" : `${Math.round(winRate * 100)}%`,
        note: "Accepted of decided",
      },
      {
        label: "Awaiting response",
        value: String(awaiting),
        note: "Sent and viewed",
      },
    ],
    [openValue, acceptedThisMonth, winRate, awaiting, currency, otherCurrencies],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Drafts, client links, and what got signed.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9" render={<Link href="/app/proposals/new" />}>
            <Plus />
            New proposal
          </Button>
          <AskClaude />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {FILTERS.map((filter) => {
            const count = filter.id === "all" ? totalCount : counts[filter.id];
            const active = status === filter.id;
            const params = new URLSearchParams();
            if (filter.id !== "all") params.set("status", filter.id);
            if (query) params.set("q", query);
            const href = params.size ? `/app?${params.toString()}` : "/app";
            return (
              <Link
                key={filter.id}
                href={href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-white",
                  active && "bg-white text-indigo-700 shadow-sm ring-1 ring-zinc-200",
                )}
              >
                {filter.label}
                <span className="tabular-nums text-zinc-400">{count}</span>
              </Link>
            );
          })}
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title or client"
          aria-label="Search proposals"
          className="w-full lg:max-w-xs"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState filtered={totalCount > 0 || query.length > 0 || status !== "all"} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Proposal</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={cn("border-b border-zinc-100 last:border-0", highlights.includes(row.id) && "qf-highlight")}>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      <Link href={`/app/proposals/${row.id}`} className="block">
                        {row.displayNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/app/proposals/${row.id}`} className="block">
                        <span className="font-medium text-zinc-950">{row.title}</span>
                        <span className="mt-0.5 block text-zinc-500">
                          {row.clientCompany ? `${row.clientName}, ${row.clientCompany}` : row.clientName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/app/proposals/${row.id}`} className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={row.status} />
                        <SourcePill createdVia={row.createdVia} lastEditedVia={row.lastEditedVia} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <Link href={`/app/proposals/${row.id}`} className="block">
                        <Money amount={row.total} currency={row.currency} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500">
                      <Link href={`/app/proposals/${row.id}`} className="block">
                        {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/app/proposals/${row.id}`}
                className={cn(
                  "block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm",
                  highlights.includes(row.id) && "qf-highlight",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-zinc-500">{row.displayNumber}</span>
                  <Money amount={row.total} currency={row.currency} className="font-medium" />
                </div>
                <p className="mt-2 font-medium">{row.title}</p>
                <p className="text-sm text-zinc-500">
                  {row.clientCompany ? `${row.clientName}, ${row.clientCompany}` : row.clientName}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={row.status} />
                  <SourcePill createdVia={row.createdVia} lastEditedVia={row.lastEditedVia} />
                  <span className="text-xs text-zinc-500">
                    {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AskClaude() {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="h-9" />}>
        <Sparkles />
        Ask Claude
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask Claude</DialogTitle>
          <DialogDescription>
            Paste one of these into Claude with the Quoteflow connector turned on. The proposal shows up here within a few seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <div key={prompt} className="rounded-lg border border-zinc-200 p-3">
              <p className="text-sm leading-6 text-zinc-700">{prompt}</p>
              <CopyButton value={prompt} label="Copy prompt" className="mt-3" />
            </div>
          ))}
          <Button variant="outline" className="w-full" render={<Link href="/app/connect" />}>
            Open Connect Claude
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
        <FileText className="mx-auto size-6 text-zinc-400" />
        <p className="mt-3 text-sm text-zinc-600">No proposals match these filters.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
      <FileText className="mx-auto size-6 text-zinc-400" />
      <p className="mt-3 text-sm text-zinc-600">
        No proposals yet. Ask your Claude: “Draft a proposal for …”
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <CopyButton value={EXAMPLE_PROMPTS[0]} label="Copy a prompt" />
        <Button variant="outline" render={<Link href="/app/connect" />}>
          Connect Claude
        </Button>
      </div>
    </div>
  );
}
