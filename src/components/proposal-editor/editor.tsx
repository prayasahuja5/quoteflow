"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  createProposalAction,
  deleteProposalAction,
  duplicateProposalAction,
  getProposalVersionAction,
  publishProposalAction,
  setStatusAction,
  updateProposalAction,
} from "@/app/app/actions";
import { MarkdownView } from "@/components/markdown-view";
import { SourcePill } from "@/components/source-pill";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDisplayDate } from "@/lib/proposals/dates";
import { CURRENCIES, formatMoney, statusMeta, type ProposalStatus } from "@/lib/proposals/format";
import type { ProposalDTO, ProposalEventDTO } from "@/lib/proposals/service";
import { computeTotals } from "@/lib/proposals/totals";

type LineDraft = { key: string; description: string; quantity: string; unitPrice: string };
type SectionDraft = { key: string; heading: string; body: string };

type FormState = {
  title: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  summary: string;
  summaryPreview: boolean;
  sections: SectionDraft[];
  lineItems: LineDraft[];
  discountPercent: string;
  taxPercent: string;
  currency: string;
  terms: string;
  validUntil: string;
};

type EditorDefaults = {
  currency: string;
  taxPercent: number;
  terms: string;
  validUntil: string;
};

function key() {
  return crypto.randomUUID();
}

function fromProposal(proposal: ProposalDTO): FormState {
  return {
    title: proposal.title,
    clientName: proposal.clientName,
    clientCompany: proposal.clientCompany ?? "",
    clientEmail: proposal.clientEmail ?? "",
    summary: proposal.summary,
    summaryPreview: false,
    sections: proposal.sections.map((section) => ({ key: key(), ...section })),
    lineItems: proposal.lineItems.map((item) => ({
      key: key(),
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unit_price),
    })),
    discountPercent: String(proposal.discountPercent),
    taxPercent: String(proposal.taxPercent),
    currency: proposal.currency,
    terms: proposal.terms ?? "",
    validUntil: proposal.validUntil ?? "",
  };
}

function blankForm(defaults: EditorDefaults): FormState {
  return {
    title: "",
    clientName: "",
    clientCompany: "",
    clientEmail: "",
    summary: "",
    summaryPreview: false,
    sections: [],
    lineItems: [],
    discountPercent: "0",
    taxPercent: String(defaults.taxPercent),
    currency: defaults.currency,
    terms: defaults.terms,
    validUntil: defaults.validUntil,
  };
}

function snapshot(state: FormState) {
  const rest = { ...state, summaryPreview: undefined };
  return JSON.stringify({
    ...rest,
    sections: rest.sections.map(({ heading, body }) => ({ heading, body })),
    lineItems: rest.lineItems.map(({ description, quantity, unitPrice }) => ({
      description,
      quantity,
      unitPrice,
    })),
  });
}

function payloadFrom(state: FormState, isNew: boolean) {
  return {
    title: state.title,
    client_name: state.clientName,
    client_company: state.clientCompany,
    client_email: state.clientEmail,
    summary: state.summary,
    sections: state.sections
      .filter((section) => section.heading.trim() || section.body.trim())
      .map(({ heading, body }) => ({ heading, body })),
    line_items: state.lineItems
      .filter((item) => item.description.trim() || item.quantity || item.unitPrice)
      .map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    discount_percent: state.discountPercent || 0,
    tax_percent: state.taxPercent || 0,
    currency: state.currency,
    terms: state.terms,
    valid_until: state.validUntil || (isNew ? undefined : null),
  };
}

export function ProposalEditor({
  proposal,
  events,
  defaults,
}: {
  proposal: ProposalDTO | null;
  events: ProposalEventDTO[];
  defaults: EditorDefaults;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() =>
    proposal ? fromProposal(proposal) : blankForm(defaults),
  );
  const [saved, setSaved] = useState(() => snapshot(proposal ? fromProposal(proposal) : blankForm(defaults)));
  const [pending, setPending] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const ignoredVersion = useRef<string | null>(null);
  const dirty = snapshot(state) !== saved;
  const locked = proposal?.status === "accepted";
  const dirtyRef = useRef(dirty);
  const saveRef = useRef<(andPublish: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!locked && dirtyRef.current) void saveRef.current(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked]);

  useEffect(() => {
    if (!proposal) return;
    const timer = window.setInterval(async () => {
      const next = await getProposalVersionAction(proposal.id);
      if (!next.ok) return;
      if (next.data.updatedAt === proposal.updatedAt) return;
      if (next.data.updatedAt === ignoredVersion.current) return;
      if (!dirtyRef.current) {
        toast("Proposal updated");
        router.refresh();
      } else {
        setConflict(true);
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [proposal, router]);

  useEffect(() => {
    if (!proposal || dirtyRef.current) return;
    const next = fromProposal(proposal);
    setState(next);
    setSaved(snapshot(next));
    setConflict(false);
  }, [proposal]);

  const totals = useMemo(() => {
    return computeTotals(
      state.lineItems.map((item) => ({
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unitPrice) || 0,
      })),
      Number(state.discountPercent) || 0,
      Number(state.taxPercent) || 0,
    );
  }, [state.lineItems, state.discountPercent, state.taxPercent]);

  async function save(andPublish: boolean) {
    if (locked) return;
    setPending(andPublish ? "publish" : "save");
    setFieldErrors({});
    const payload = payloadFrom(state, !proposal);
    const created = proposal
      ? await updateProposalAction(proposal.id, payload)
      : await createProposalAction(payload);
    if (!created.ok) {
      setPending(null);
      setFieldErrors(created.fieldErrors ?? {});
      toast.error(created.error);
      return;
    }
    let finalProposal = created.data;
    if (andPublish && finalProposal.status === "draft") {
      const published = await publishProposalAction(finalProposal.id);
      if (!published.ok) {
        setPending(null);
        toast.error(published.error);
        router.push(`/app/proposals/${finalProposal.id}`);
        return;
      }
      finalProposal = published.data;
    }
    setPending(null);
    toast.success(andPublish ? "Proposal published" : "Proposal saved");
    if (!proposal || andPublish) {
      router.push(`/app/proposals/${finalProposal.id}`);
      router.refresh();
      return;
    }
    const next = fromProposal(finalProposal);
    setState((current) => ({ ...next, summaryPreview: current.summaryPreview }));
    setSaved(snapshot(next));
    router.refresh();
  }

  useEffect(() => {
    saveRef.current = save;
  });

  async function copyLink() {
    if (!proposal) return;
    try {
      await navigator.clipboard.writeText(proposal.shareUrl);
      toast.success("Client link copied");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setState((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setState((current) => {
      const next = [...current.sections];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...current, sections: next };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <Link href="/app" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-950">
            <ArrowLeft className="size-4" />
            Proposals
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {proposal ? <span className="font-mono text-xs text-zinc-500">{proposal.displayNumber}</span> : null}
            {proposal ? <StatusBadge status={proposal.status} /> : <StatusBadge status="draft" />}
            {proposal ? (
              <SourcePill createdVia={proposal.createdVia} lastEditedVia={proposal.lastEditedVia} />
            ) : null}
          </div>
          <Input
            aria-label="Proposal title"
            value={state.title}
            disabled={locked}
            onChange={(event) => setState((current) => ({ ...current, title: event.target.value }))}
            placeholder="Proposal title"
            className="mt-3 h-auto border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-2xl"
          />
          {fieldErrors.title ? <p className="text-sm text-rose-700">{fieldErrors.title}</p> : null}
          {dirty ? <p className="text-sm text-zinc-500">Unsaved changes</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-9" disabled={!dirty || locked || pending !== null} onClick={() => void save(false)}>
            {pending === "save" ? <Loader2 className="animate-spin" /> : <Check />}
            Save
          </Button>
          {proposal && proposal.status !== "draft" ? (
            <Button variant="outline" className="h-9" onClick={() => void copyLink()}>
              <Copy />
              Copy client link
            </Button>
          ) : (
            <Button variant="outline" className="h-9" disabled={locked || pending !== null} onClick={() => void save(true)}>
              {pending === "publish" ? <Loader2 className="animate-spin" /> : null}
              Publish
            </Button>
          )}
          {proposal ? (
            <Button
              variant="outline"
              className="h-9"
              onClick={() => window.open(`/p/${proposal.slug}?preview=1`, "_blank", "noopener")}
            >
              <Eye />
              Preview
            </Button>
          ) : null}
          {proposal ? (
            <ProposalMenu
              proposal={proposal}
              pending={pending}
              onPending={setPending}
              onDone={() => router.refresh()}
            />
          ) : null}
        </div>
      </div>

      {locked && proposal ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Accepted by {proposal.acceptedByName || "the client"}
          {proposal.acceptedAt ? ` on ${formatDisplayDate(proposal.acceptedAt)}` : ""}. Locked to preserve the signed version. Duplicate to make changes.
        </div>
      ) : null}

      {conflict ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>This proposal was changed elsewhere (e.g. by Claude).</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                dirtyRef.current = false;
                setConflict(false);
                router.refresh();
              }}
            >
              Load latest
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                ignoredVersion.current = proposal?.updatedAt ?? null;
                setConflict(false);
              }}
            >
              Keep my edits
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card title="Client">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={fieldErrors.client_name}>
                <Input
                  aria-label="Client name"
                  value={state.clientName}
                  disabled={locked}
                  onChange={(event) => setState((current) => ({ ...current, clientName: event.target.value }))}
                />
              </Field>
              <Field label="Company">
                <Input
                  aria-label="Client company"
                  value={state.clientCompany}
                  disabled={locked}
                  onChange={(event) => setState((current) => ({ ...current, clientCompany: event.target.value }))}
                />
              </Field>
              <Field label="Email" error={fieldErrors.client_email} className="sm:col-span-2">
                <Input
                  aria-label="Client email"
                  type="email"
                  value={state.clientEmail}
                  disabled={locked}
                  onChange={(event) => setState((current) => ({ ...current, clientEmail: event.target.value }))}
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Summary"
            action={
              <button
                type="button"
                className="text-xs font-medium text-indigo-700"
                onClick={() => setState((current) => ({ ...current, summaryPreview: !current.summaryPreview }))}
              >
                {state.summaryPreview ? "Edit" : "Preview"}
              </button>
            }
          >
            <p className="mb-2 text-xs text-zinc-500">Markdown supported</p>
            {state.summaryPreview ? (
              <MarkdownView className="prose prose-zinc max-w-none text-sm">{state.summary || "_Nothing to preview yet._"}</MarkdownView>
            ) : (
              <Textarea
                aria-label="Summary"
                value={state.summary}
                disabled={locked}
                rows={5}
                onChange={(event) => setState((current) => ({ ...current, summary: event.target.value }))}
              />
            )}
          </Card>

          <Card title="Sections">
            <div className="space-y-3">
              {state.sections.length === 0 ? (
                <p className="text-sm text-zinc-500">No sections yet.</p>
              ) : null}
              {state.sections.map((section, index) => (
                <div key={section.key} className="rounded-lg border border-zinc-200 p-3">
                  <div className="mb-2 flex items-center gap-1">
                    <Input
                      aria-label={`Section ${index + 1} heading`}
                      value={section.heading}
                      disabled={locked}
                      placeholder="Heading"
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          sections: current.sections.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, heading: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <Button type="button" variant="ghost" size="icon" disabled={locked || index === 0} aria-label="Move section up" onClick={() => moveSection(index, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" disabled={locked || index === state.sections.length - 1} aria-label="Move section down" onClick={() => moveSection(index, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={locked}
                      aria-label="Delete section"
                      onClick={() =>
                        setState((current) => ({
                          ...current,
                          sections: current.sections.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <Textarea
                    aria-label={`Section ${index + 1} body`}
                    value={section.body}
                    disabled={locked}
                    rows={4}
                    placeholder="Markdown body"
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        sections: current.sections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, body: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    sections: [...current.sections, { key: key(), heading: "", body: "" }],
                  }))
                }
              >
                <Plus />
                Add section
              </Button>
            </div>
          </Card>

          <Card title="Line items">
            {state.lineItems.length === 0 ? <p className="mb-3 text-sm text-zinc-500">No line items yet.</p> : null}
            <div className="hidden grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_2.5rem] gap-2 text-xs font-medium text-zinc-500 sm:grid">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit price</span>
              <span className="text-right">Amount</span>
              <span className="sr-only">Remove</span>
            </div>
            <div className="mt-2 space-y-3">
              {state.lineItems.map((item, index) => {
                const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                return (
                  <div key={item.key} className="grid gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_2.5rem] sm:items-center sm:border-0 sm:p-0">
                    <Input
                      aria-label={`Line ${index + 1} description`}
                      value={item.description}
                      disabled={locked}
                      placeholder="Description"
                      onChange={(event) => updateLine(index, { description: event.target.value })}
                    />
                    <Input
                      aria-label={`Line ${index + 1} quantity`}
                      inputMode="decimal"
                      value={item.quantity}
                      disabled={locked}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    />
                    <Input
                      aria-label={`Line ${index + 1} unit price`}
                      inputMode="decimal"
                      value={item.unitPrice}
                      disabled={locked}
                      onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                    />
                    <p className="text-right text-sm tabular-nums">{formatMoney(amount, state.currency)}</p>
                    <Button type="button" variant="ghost" size="icon" disabled={locked} aria-label="Delete line item" onClick={() => setState((current) => ({ ...current, lineItems: current.lineItems.filter((_, itemIndex) => itemIndex !== index) }))}>
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              disabled={locked}
              onClick={() =>
                setState((current) => ({
                  ...current,
                  lineItems: [...current.lineItems, { key: key(), description: "", quantity: "1", unitPrice: "" }],
                }))
              }
            >
              <Plus />
              Add row
            </Button>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Discount %">
                <Input aria-label="Discount percent" inputMode="decimal" value={state.discountPercent} disabled={locked} onChange={(event) => setState((current) => ({ ...current, discountPercent: event.target.value }))} />
              </Field>
              <Field label="Tax %">
                <Input aria-label="Tax percent" inputMode="decimal" value={state.taxPercent} disabled={locked} onChange={(event) => setState((current) => ({ ...current, taxPercent: event.target.value }))} />
              </Field>
              <Field label="Currency">
                <Select
                  value={state.currency}
                  disabled={locked}
                  onValueChange={(value) => {
                    if (value) setState((current) => ({ ...current, currency: value }));
                  }}
                >
                  <SelectTrigger className="w-full" aria-label="Currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <dl className="mt-4 space-y-1 text-sm">
              <TotalRow label="Subtotal" value={formatMoney(totals.subtotal, state.currency)} />
              <TotalRow label="Discount" value={formatMoney(totals.discountAmount, state.currency)} />
              <TotalRow label="Tax" value={formatMoney(totals.taxAmount, state.currency)} />
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(totals.total, state.currency)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Terms and validity">
            <div className="space-y-4">
              <Field label="Terms">
                <Textarea aria-label="Terms" rows={4} value={state.terms} disabled={locked} onChange={(event) => setState((current) => ({ ...current, terms: event.target.value }))} />
              </Field>
              <Field label="Valid until">
                <Input aria-label="Valid until" type="date" value={state.validUntil} disabled={locked} onChange={(event) => setState((current) => ({ ...current, validUntil: event.target.value }))} />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card title="Client activity">
            {proposal ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Status</dt>
                  <dd><StatusBadge status={proposal.status} /></dd>
                </div>
                <ActivityLine label="Published" value={proposal.publishedAt ? formatDisplayDate(proposal.publishedAt) : "Not published"} />
                <ActivityLine
                  label="Views"
                  value={
                    proposal.viewCount === 0
                      ? "Not viewed yet"
                      : `Viewed ${proposal.viewCount} time${proposal.viewCount === 1 ? "" : "s"}${proposal.firstViewedAt ? `, first viewed ${formatDistanceToNow(new Date(proposal.firstViewedAt), { addSuffix: true })}` : ""}`
                  }
                />
                {proposal.acceptedByName ? (
                  <ActivityLine label="Accepted" value={`${proposal.acceptedByName}${proposal.acceptedAt ? ` on ${formatDisplayDate(proposal.acceptedAt)}` : ""}`} />
                ) : null}
                {proposal.declineReason || proposal.status === "declined" ? (
                  <ActivityLine label="Declined" value={proposal.declineReason || "No reason given"} />
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-zinc-500">Save the draft to get a client link and activity history.</p>
            )}
          </Card>
          <Card title="Activity">
            {events.length === 0 ? (
              <p className="text-sm text-zinc-500">No activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-zinc-300" aria-hidden />
                    <div>
                      <p>{event.message}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <SourceLabel source={event.source} />
                        <span>{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ProposalMenu({
  proposal,
  pending,
  onPending,
  onDone,
}: {
  proposal: ProposalDTO;
  pending: string | null;
  onPending: (value: string | null) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const statuses = Object.keys(statusMeta) as ProposalStatus[];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="h-9 w-9" aria-label="More actions" />}>
        {pending === "menu" ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={async () => {
            onPending("menu");
            const result = await duplicateProposalAction(proposal.id);
            onPending(null);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Proposal duplicated");
            router.push(`/app/proposals/${result.data.id}`);
          }}
        >
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            Change status
            <ChevronDown className="ml-auto size-4 lg:hidden" />
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {statuses.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={async () => {
                  onPending("menu");
                  const result = await setStatusAction(proposal.id, status);
                  onPending(null);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(`Marked ${statusMeta[status].label.toLowerCase()}`);
                  onDone();
                }}
              >
                {statusMeta[status].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onClick={() => {
            const preview = proposal.status === "draft" ? "&preview=1" : "";
            window.open(`/p/${proposal.slug}?print=1${preview}`, "_blank", "noopener");
          }}
        >
          Print / Save as PDF
        </DropdownMenuItem>
        <AlertDialog>
          <AlertDialogTrigger
            nativeButton={false}
            render={<DropdownMenuItem variant="destructive" onClick={(event) => event.preventDefault()} />}
          >
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
              <AlertDialogDescription>
                {proposal.displayNumber} will be removed, including its client link and history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={async () => {
                  const result = await deleteProposalAction(proposal.id);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Proposal deleted");
                  router.push("/app");
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-rose-700">{error}</span> : null}
    </label>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-zinc-600">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function ActivityLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function SourceLabel({ source }: { source: string }) {
  const label = source === "claude" ? "Claude" : source === "client" ? "Client" : "You";
  return <span className="rounded-full bg-zinc-100 px-1.5 py-0.5">{label}</span>;
}
