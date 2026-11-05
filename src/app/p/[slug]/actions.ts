"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { acceptProposal, declineProposal, type ProposalDTO } from "@/lib/proposals/service";

export type PublicActionResult =
  | { ok: true; data: ProposalDTO }
  | { ok: false; error: string };

function fromError(error: unknown): PublicActionResult {
  if (error instanceof AppError || error instanceof ZodError) {
    return { ok: false, error: error instanceof AppError ? error.message : "Check the form and try again." };
  }
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function acceptProposalAction(slug: string, name: string): Promise<PublicActionResult> {
  try {
    const proposal = await acceptProposal(slug, { name });
    revalidatePath(`/p/${slug}`);
    revalidatePath("/app");
    revalidatePath(`/app/proposals/${proposal.id}`);
    return { ok: true, data: proposal };
  } catch (error) {
    return fromError(error);
  }
}

export async function declineProposalAction(slug: string, reason: string): Promise<PublicActionResult> {
  try {
    const proposal = await declineProposal(slug, { reason });
    revalidatePath(`/p/${slug}`);
    revalidatePath("/app");
    revalidatePath(`/app/proposals/${proposal.id}`);
    return { ok: true, data: proposal };
  } catch (error) {
    return fromError(error);
  }
}
