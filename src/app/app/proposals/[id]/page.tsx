import { notFound } from "next/navigation";
import { ProposalEditor } from "@/components/proposal-editor/editor";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { getBusinessProfile, getProposal } from "@/lib/proposals/service";

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let proposalResult: Awaited<ReturnType<typeof getProposal>>;
  let profile: Awaited<ReturnType<typeof getBusinessProfile>>;
  try {
    [proposalResult, profile] = await Promise.all([
      getProposal(user.id, id),
      getBusinessProfile(user.id),
    ]);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { proposal, events } = proposalResult;
  return (
    <ProposalEditor
      proposal={proposal}
      events={events}
      defaults={{
        currency: profile.defaultCurrency,
        taxPercent: profile.defaultTaxPercent,
        terms: profile.defaultPaymentTerms ?? "",
        validUntil: proposal.validUntil ?? "",
      }}
    />
  );
}
