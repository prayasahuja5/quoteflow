import { Dashboard } from "@/app/app/dashboard";
import { requireUser } from "@/lib/auth/session";
import { getBusinessProfile, getPipelineSummary, getProposalFeedVersion, listProposals } from "@/lib/proposals/service";
import type { ProposalStatus } from "@/lib/proposals/format";

const STATUSES = new Set<ProposalStatus>(["draft", "sent", "viewed", "accepted", "declined"]);

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status && STATUSES.has(params.status as ProposalStatus) ? (params.status as ProposalStatus) : "all";
  const [summary, profile, rows, pulse] = await Promise.all([
    getPipelineSummary(user.id),
    getBusinessProfile(user.id),
    listProposals(user.id, {
      status: status === "all" ? undefined : status,
      query: query || undefined,
      limit: 50,
    }),
    getProposalFeedVersion(user.id),
  ]);
  const otherCurrencies = Object.keys(summary.valuesByCurrency).some(
    (currency) => currency !== profile.defaultCurrency,
  );

  return (
    <Dashboard
      rows={rows.map((row) => ({
        id: row.id,
        displayNumber: row.displayNumber,
        title: row.title,
        clientName: row.clientName,
        clientCompany: row.clientCompany,
        status: row.status,
        createdVia: row.createdVia,
        lastEditedVia: row.lastEditedVia,
        total: row.total,
        currency: row.currency,
        updatedAt: row.updatedAt,
      }))}
      counts={summary.counts}
      totalCount={Object.values(summary.counts).reduce((sum, count) => sum + count, 0)}
      query={query}
      status={status}
      openValue={summary.openValue}
      acceptedThisMonth={summary.acceptedThisMonthValue}
      winRate={summary.winRate}
      awaiting={summary.counts.sent + summary.counts.viewed}
      currency={profile.defaultCurrency}
      otherCurrencies={otherCurrencies}
      pulse={pulse}
    />
  );
}
