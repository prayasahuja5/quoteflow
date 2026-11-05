import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintOnLoad, ProposalDecision } from "@/app/p/[slug]/client-actions";
import { ProposalDocument } from "@/components/proposal-document";
import { getSession } from "@/lib/auth/session";
import { isExpired } from "@/lib/proposals/dates";
import {
  getOwnedProposalBySlug,
  getProposalOwnerId,
  getPublicProposal,
  recordView,
  type PublicProposal,
} from "@/lib/proposals/service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const owner = await getProposalOwnerId(slug);
  const session = await getSession();
  const isOwner = session?.userId === owner?.userId;
  const data = !owner
    ? null
    : owner.status === "draft"
      ? isOwner && session
        ? await getOwnedProposalBySlug(session.userId, slug)
        : null
      : await getPublicProposal(slug);
  return {
    title: data ? `${data.proposal.title} · ${data.profile.businessName}` : "Proposal · Quoteflow",
    robots: { index: false, follow: false },
  };
}

export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; print?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getSession();
  const owner = await getProposalOwnerId(slug);
  if (!owner) notFound();

  const isOwner = session?.userId === owner.userId;
  const preview = query.preview === "1";
  let data: PublicProposal | null;

  if (owner.status === "draft") {
    if (!(preview && isOwner) || !session) notFound();
    data = await getOwnedProposalBySlug(session.userId, slug);
  } else {
    data = await recordView(slug, { isOwner });
  }

  if (!data) notFound();
  const expired =
    (data.proposal.status === "sent" || data.proposal.status === "viewed") &&
    isExpired(data.proposal.validUntil);

  return (
    <main className="min-h-screen bg-zinc-100 pb-24 print:bg-white print:pb-0">
      <PrintOnLoad enabled={query.print === "1"} />
      <div className="px-0 py-6 sm:px-6 sm:py-10 print:p-0">
        <ProposalDocument proposal={data.proposal} profile={data.profile} preview={preview && owner.status === "draft"} />
        {owner.status === "draft" ? null : (
          <ProposalDecision
            slug={slug}
            proposal={data.proposal}
            contactEmail={data.profile.contactEmail}
            expired={expired}
          />
        )}
        <p className="mt-8 text-center text-xs text-zinc-400 print:hidden">Sent with Quoteflow</p>
      </div>
    </main>
  );
}
