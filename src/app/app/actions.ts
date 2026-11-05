"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { regenerateMcpToken } from "@/lib/auth/mcp";
import { requireUser } from "@/lib/auth/session";
import { resetDemoData } from "@/db/seed";
import { AppError } from "@/lib/errors";
import {
  createProposal,
  deleteProposal,
  duplicateProposal,
  getPipelineSummary,
  getProposalFeedVersion,
  getProposalVersion,
  publishProposal,
  setStatus,
  updateBusinessProfile,
  updateProposal,
  type ProposalDTO,
} from "@/lib/proposals/service";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fromError(error: unknown): ActionResult<never> {
  if (error instanceof AppError) return { ok: false, error: error.message };
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".");
      if (key) fieldErrors[key] ??= issue.message;
    }
    const first = error.issues[0]?.message ?? "Check the highlighted fields.";
    return { ok: false, error: first, fieldErrors };
  }
  return { ok: false, error: "Something went wrong. Please try again." };
}

function refreshProposal(proposal: ProposalDTO) {
  revalidatePath("/app");
  revalidatePath(`/app/proposals/${proposal.id}`);
  revalidatePath(`/p/${proposal.slug}`);
}

export async function getDashboardPulse(): Promise<
  ActionResult<{ latestUpdatedAt: string | null; count: number }>
> {
  const user = await requireUser();
  try {
    return { ok: true, data: await getProposalFeedVersion(user.id) };
  } catch (error) {
    return fromError(error);
  }
}

export async function createProposalAction(
  payload: unknown,
): Promise<ActionResult<ProposalDTO>> {
  const user = await requireUser();
  try {
    const proposal = await createProposal(user.id, payload, "app");
    refreshProposal(proposal);
    return { ok: true, data: proposal };
  } catch (error) {
    return fromError(error);
  }
}

export async function updateProposalAction(
  id: string,
  payload: unknown,
): Promise<ActionResult<ProposalDTO>> {
  const user = await requireUser();
  try {
    const proposal = await updateProposal(user.id, id, payload, "app");
    refreshProposal(proposal);
    return { ok: true, data: proposal };
  } catch (error) {
    return fromError(error);
  }
}

export async function publishProposalAction(id: string): Promise<ActionResult<ProposalDTO>> {
  const user = await requireUser();
  try {
    const proposal = await publishProposal(user.id, id, "app");
    refreshProposal(proposal);
    return { ok: true, data: proposal };
  } catch (error) {
    return fromError(error);
  }
}

export async function duplicateProposalAction(id: string): Promise<ActionResult<ProposalDTO>> {
  const user = await requireUser();
  try {
    const proposal = await duplicateProposal(user.id, id, "app");
    refreshProposal(proposal);
    return { ok: true, data: proposal };
  } catch (error) {
    return fromError(error);
  }
}

export async function setStatusAction(
  id: string,
  status: unknown,
): Promise<ActionResult<ProposalDTO>> {
  const user = await requireUser();
  try {
    const proposal = await setStatus(user.id, id, status, "app");
    refreshProposal(proposal);
    return { ok: true, data: proposal };
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteProposalAction(id: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  try {
    await deleteProposal(user.id, id);
    revalidatePath("/app");
    return { ok: true, data: { id } };
  } catch (error) {
    return fromError(error);
  }
}

export async function getProposalVersionAction(
  id: string,
): Promise<ActionResult<{ updatedAt: string }>> {
  const user = await requireUser();
  try {
    return { ok: true, data: { updatedAt: await getProposalVersion(user.id, id) } };
  } catch (error) {
    return fromError(error);
  }
}

export async function updateProfileAction(payload: unknown): Promise<ActionResult<{ saved: true }>> {
  const user = await requireUser();
  try {
    await updateBusinessProfile(user.id, payload);
    revalidatePath("/app/settings");
    revalidatePath("/app");
    return { ok: true, data: { saved: true } };
  } catch (error) {
    return fromError(error);
  }
}

export async function regenerateMcpTokenAction(): Promise<ActionResult<{ token: string }>> {
  const user = await requireUser();
  try {
    const token = await regenerateMcpToken(user.id);
    revalidatePath("/app/connect");
    revalidatePath("/app");
    return { ok: true, data: { token } };
  } catch (error) {
    return fromError(error);
  }
}

export async function resetDemoAction(): Promise<ActionResult<{ reset: true }>> {
  const user = await requireUser();
  if (user.email !== "demo@quoteflow.app") {
    return { ok: false, error: "Only the demo account can reset demo data." };
  }
  try {
    await resetDemoData();
    revalidatePath("/app");
    revalidatePath("/app/settings");
    return { ok: true, data: { reset: true } };
  } catch (error) {
    return fromError(error);
  }
}

export async function getMcpStatusAction(): Promise<ActionResult<{ lastMcpCallAt: string | null }>> {
  const user = await requireUser();
  const fresh = await requireUser();
  return {
    ok: true,
    data: { lastMcpCallAt: (fresh.lastMcpCallAt ?? user.lastMcpCallAt)?.toISOString() ?? null },
  };
}

export async function getDashboardSummary() {
  const user = await requireUser();
  return getPipelineSummary(user.id);
}
