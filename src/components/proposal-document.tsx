import { MarkdownView } from "@/components/markdown-view";
import { formatDisplayDate } from "@/lib/proposals/dates";
import { formatMoney, formatProposalNumber } from "@/lib/proposals/format";
import type { BusinessProfileDTO, ProposalDTO } from "@/lib/proposals/service";

export function ProposalDocument({
  proposal,
  profile,
  preview = false,
}: {
  proposal: ProposalDTO;
  profile: BusinessProfileDTO;
  preview?: boolean;
}) {
  const accent = /^#[0-9A-Fa-f]{6}$/.test(profile.brandColor) ? profile.brandColor : "#4F46E5";

  return (
    <article className="mx-auto max-w-3xl bg-white px-6 py-10 shadow-sm sm:px-10 sm:py-14 print:shadow-none">
      <div className="mb-8 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
      {preview ? (
        <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
          Preview — not visible to clients until published
        </p>
      ) : null}
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-instrument text-3xl text-zinc-950">{profile.businessName}</p>
          {profile.tagline ? <p className="mt-1 text-sm text-zinc-500">{profile.tagline}</p> : null}
        </div>
        <div className="text-sm text-zinc-600 sm:text-right">
          <p className="font-medium text-zinc-950">Proposal {formatProposalNumber(proposal.number)}</p>
          <p>{formatDisplayDate(proposal.createdAt)}</p>
          {proposal.validUntil ? <p>Valid until {formatDisplayDate(`${proposal.validUntil}T00:00:00+05:30`)}</p> : null}
        </div>
      </header>
      <p className="mt-8 text-sm text-zinc-500">
        Prepared for {proposal.clientName}
        {proposal.clientCompany ? `, ${proposal.clientCompany}` : ""}
      </p>
      <h1 className="mt-2 font-instrument text-4xl tracking-tight text-zinc-950">{proposal.title}</h1>
      {proposal.summary ? (
        <MarkdownView className="prose prose-zinc mt-6 max-w-none">{proposal.summary}</MarkdownView>
      ) : null}
      <div className="mt-10 space-y-8">
        {proposal.sections.map((section) => (
          <section key={section.heading} className="print:break-inside-avoid">
            <h2 className="font-instrument text-2xl text-zinc-950">{section.heading}</h2>
            <MarkdownView className="prose prose-zinc mt-3 max-w-none">{section.body}</MarkdownView>
          </section>
        ))}
      </div>
      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Unit price</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {proposal.lineItems.map((item) => (
              <tr key={`${item.description}-${item.unit_price}`} className="border-b border-zinc-100">
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-right tabular-nums">{item.quantity}</td>
                <td className="py-3 text-right tabular-nums">{formatMoney(item.unit_price, proposal.currency)}</td>
                <td className="py-3 text-right tabular-nums">
                  {formatMoney(item.quantity * item.unit_price, proposal.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <Row label="Subtotal" value={formatMoney(proposal.subtotal, proposal.currency)} />
          {proposal.discountPercent > 0 ? (
            <Row label={`Discount (${proposal.discountPercent}%)`} value={formatMoney(proposal.discountAmount, proposal.currency)} />
          ) : null}
          <Row label={`Tax (${proposal.taxPercent}%)`} value={formatMoney(proposal.taxAmount, proposal.currency)} />
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(proposal.total, proposal.currency)}</dd>
          </div>
        </dl>
      </div>
      {proposal.terms ? (
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Terms</h2>
          <MarkdownView className="prose prose-zinc mt-3 max-w-none text-sm">{proposal.terms}</MarkdownView>
        </section>
      ) : null}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-zinc-600">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
