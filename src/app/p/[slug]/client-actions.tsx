"use client";

import { Check, Printer } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptProposalAction, declineProposalAction } from "@/app/p/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDisplayDate } from "@/lib/proposals/dates";
import type { ProposalDTO } from "@/lib/proposals/service";

export function PrintOnLoad({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return null;
}

export function ProposalDecision({
  slug,
  proposal,
  contactEmail,
  expired,
}: {
  slug: string;
  proposal: ProposalDTO;
  contactEmail: string | null;
  expired: boolean;
}) {
  const router = useRouter();
  const decided = proposal.status === "accepted" || proposal.status === "declined";

  if (proposal.status === "accepted") {
    return (
      <DecisionCard>
        <Check className="size-10 text-emerald-600" />
        <p className="mt-3 text-lg font-semibold">
          Accepted by {proposal.acceptedByName}
          {proposal.acceptedAt ? ` on ${formatDisplayDate(proposal.acceptedAt)}` : ""}
        </p>
        <Button className="mt-4" variant="outline" onClick={() => window.print()}>
          <Printer />
          Download / Print
        </Button>
      </DecisionCard>
    );
  }

  if (proposal.status === "declined") {
    return (
      <DecisionCard>
        <p className="text-lg font-semibold">This proposal was declined.</p>
        {proposal.declineReason ? <p className="mt-2 text-sm text-zinc-600">{proposal.declineReason}</p> : null}
      </DecisionCard>
    );
  }

  if (expired) {
    return (
      <DecisionCard>
        <p className="text-lg font-semibold">
          This proposal expired{proposal.validUntil ? ` on ${formatDisplayDate(`${proposal.validUntil}T00:00:00+05:30`)}` : ""}.
        </p>
        <p className="mt-2 text-sm text-zinc-600">Contact {contactEmail || "the sender"}.</p>
      </DecisionCard>
    );
  }

  if (decided) return null;

  return (
    <div className="print:hidden">
      <div className="mx-auto hidden max-w-3xl justify-end gap-3 px-6 py-8 sm:flex">
        <DeclineButton slug={slug} onDone={() => router.refresh()} />
        <AcceptButton slug={slug} onDone={() => router.refresh()} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white p-3 sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <DeclineButton slug={slug} onDone={() => router.refresh()} />
          <AcceptButton slug={slug} onDone={() => router.refresh()} />
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 text-center print:hidden">
      {children}
    </div>
  );
}

function AcceptButton({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <Dialog>
      <DialogTrigger render={<Button className="h-9" />}>Accept proposal</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept and sign</DialogTitle>
          <DialogDescription>Type your full name to accept. This locks the proposal.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const result = await acceptProposalAction(slug, name);
            setPending(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Proposal accepted");
            onDone();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="signer-name">Full name</Label>
            <Input id="signer-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} />
            <span>I agree to the terms above</span>
          </label>
          <Button type="submit" className="w-full" disabled={!agreed || name.trim().length < 2 || pending}>
            {pending ? "Signing…" : "Accept & sign"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeclineButton({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" />}>Decline</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline proposal</DialogTitle>
          <DialogDescription>A reason is optional. The sender will see it.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const result = await declineProposalAction(slug, reason);
            setPending(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Proposal declined");
            onDone();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="decline-reason">Reason</Label>
            <Textarea id="decline-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Decline proposal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
