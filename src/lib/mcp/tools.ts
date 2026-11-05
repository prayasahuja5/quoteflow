import type { McpServer } from "@modelcontextprotocol/server";
import { ZodError } from "zod";
import { z } from "zod";
import { touchMcpCall } from "@/lib/auth/mcp";
import { AppError } from "@/lib/errors";
import { formatMoney, formatProposalNumber } from "@/lib/proposals/format";
import {
  CreateProposalInput,
  StatusSchema,
  UpdateProposalInput,
} from "@/lib/proposals/schemas";
import {
  createProposal,
  getBusinessProfile,
  getPipelineSummary,
  getProposal,
  listProposals,
  publishProposal,
  updateProposal,
  type ProposalDTO,
} from "@/lib/proposals/service";

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function friendly(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .join("\n");
  }
  return "Something went wrong while using Quoteflow. Please try again.";
}

function textResult(summary: string, data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: `${summary}\n\n${JSON.stringify(data, null, 2)}` }],
  };
}

function errorResult(error: unknown): ToolResult {
  return { isError: true, content: [{ type: "text", text: friendly(error) }] };
}

async function runTool(
  userId: string,
  work: () => Promise<ToolResult>,
): Promise<ToolResult> {
  void touchMcpCall(userId).catch(() => undefined);
  try {
    return await work();
  } catch (error) {
    return errorResult(error);
  }
}

function proposalSummary(proposal: ProposalDTO): string {
  return `${proposal.displayNumber} "${proposal.title}" (${proposal.status}) — total ${formatMoney(proposal.total, proposal.currency)}`;
}

function compactProposal(proposal: ProposalDTO) {
  return {
    number: proposal.displayNumber,
    id: proposal.id,
    title: proposal.title,
    client: proposal.clientCompany
      ? `${proposal.clientName}, ${proposal.clientCompany}`
      : proposal.clientName,
    status: proposal.status,
    total: proposal.total,
    totalFormatted: formatMoney(proposal.total, proposal.currency),
    currency: proposal.currency,
    updatedAt: proposal.updatedAt,
    viewCount: proposal.viewCount,
    shareUrl: proposal.shareUrl,
    editUrl: proposal.editUrl,
  };
}

export function registerQuoteflowTools(server: McpServer, options: { userId: string }) {
  const { userId } = options;

  server.registerTool(
    "get_business_profile",
    {
      title: "Get business profile",
      description:
        "Returns the user's business details (name, about, default currency, tax %, payment terms, validity days). Call this BEFORE drafting a new proposal so pricing currency, tax and terms match the user's business, and so you can write in their voice.",
      inputSchema: z.object({}),
    },
    async () =>
      runTool(userId, async () => {
        const profile = await getBusinessProfile(userId);
        return textResult(
          `${profile.businessName} — ${profile.defaultCurrency}, ${profile.defaultTaxPercent}% tax, quotes valid for ${profile.defaultValidityDays} days.`,
          profile,
        );
      }),
  );

  server.registerTool(
    "create_proposal",
    {
      title: "Create proposal",
      description:
        "Creates a new client proposal/quote in Quoteflow as a DRAFT and returns its number, edit link and client share link. You (Claude) write the content: a short persuasive summary (markdown), 2–6 sections such as 'Scope of work', 'Deliverables', 'Timeline', 'Why us' (markdown bodies), and itemised line items with quantity and unit price in major currency units (e.g. rupees, not paise). Quoteflow calculates subtotal, discount, tax and total. Do not compute totals yourself. Omit currency, tax_percent, terms and valid_until to use the user's business defaults. After creating, tell the user the proposal number and the edit link so they can review it, and offer to publish it.",
      inputSchema: CreateProposalInput,
    },
    async (input) =>
      runTool(userId, async () => {
        const proposal = await createProposal(userId, input, "claude");
        return textResult(
          `Created ${proposal.displayNumber} "${proposal.title}" (${proposal.status}) — total ${formatMoney(proposal.total, proposal.currency)} incl. ${proposal.taxPercent}% tax. Review/edit: ${proposal.editUrl}`,
          {
            ...compactProposal(proposal),
            summary: proposal.summary,
            sections: proposal.sections,
            lineItems: proposal.lineItems,
            subtotal: proposal.subtotal,
            discountPercent: proposal.discountPercent,
            taxPercent: proposal.taxPercent,
            taxAmount: proposal.taxAmount,
            terms: proposal.terms,
            validUntil: proposal.validUntil,
          },
        );
      }),
  );

  server.registerTool(
    "update_proposal",
    {
      title: "Update proposal",
      description:
        "Updates an existing proposal. Identify it by proposal_id (UUID) or its number like 'QF-0007'. Only send fields you want to change. sections and line_items REPLACE the entire existing list, so when changing one line item, first call get_proposal and send the full updated list. Accepted proposals are locked and cannot be edited.",
      inputSchema: UpdateProposalInput,
    },
    async (input) =>
      runTool(userId, async () => {
        const proposal = await updateProposal(userId, input.proposal_id, input, "claude");
        return textResult(`Updated ${proposalSummary(proposal)}. Review/edit: ${proposal.editUrl}`, {
          ...compactProposal(proposal),
          summary: proposal.summary,
          sections: proposal.sections,
          lineItems: proposal.lineItems,
          subtotal: proposal.subtotal,
          discountPercent: proposal.discountPercent,
          taxPercent: proposal.taxPercent,
          taxAmount: proposal.taxAmount,
          terms: proposal.terms,
          validUntil: proposal.validUntil,
        });
      }),
  );

  server.registerTool(
    "get_proposal",
    {
      title: "Get proposal",
      description:
        "Gets one proposal in full (content, line items, totals, status, client activity such as views and acceptance, and recent history). Accepts UUID or number like 'QF-0007'.",
      inputSchema: z.object({
        proposal_id: z.string().min(1).describe("UUID or number like QF-0007."),
      }),
    },
    async (input) =>
      runTool(userId, async () => {
        const { proposal, events } = await getProposal(userId, input.proposal_id);
        return textResult(`${proposalSummary(proposal)}. ${proposal.viewCount} view(s).`, {
          ...compactProposal(proposal),
          clientName: proposal.clientName,
          clientCompany: proposal.clientCompany,
          clientEmail: proposal.clientEmail,
          summary: proposal.summary,
          sections: proposal.sections,
          lineItems: proposal.lineItems,
          subtotal: proposal.subtotal,
          discountPercent: proposal.discountPercent,
          discountAmount: proposal.discountAmount,
          taxPercent: proposal.taxPercent,
          taxAmount: proposal.taxAmount,
          terms: proposal.terms,
          validUntil: proposal.validUntil,
          publishedAt: proposal.publishedAt,
          firstViewedAt: proposal.firstViewedAt,
          acceptedAt: proposal.acceptedAt,
          acceptedByName: proposal.acceptedByName,
          declinedAt: proposal.declinedAt,
          declineReason: proposal.declineReason,
          createdVia: proposal.createdVia,
          lastEditedVia: proposal.lastEditedVia,
          events,
        });
      }),
  );

  server.registerTool(
    "list_proposals",
    {
      title: "List proposals",
      description:
        "Lists the user's proposals, most recently updated first. Optional filters: status (draft, sent, viewed, accepted, declined) and a search query matching title or client. Use this to answer questions like 'what's pending?' or to find a proposal's number.",
      inputSchema: z.object({
        status: StatusSchema.optional().describe(
          "Filter by status: draft, sent, viewed, accepted, or declined.",
        ),
        query: z
          .string()
          .max(200)
          .optional()
          .describe("Search title, client name, or client company."),
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum rows to return, from 1 to 50. Defaults to 20."),
      }),
    },
    async (input) =>
      runTool(userId, async () => {
        const proposals = await listProposals(userId, {
          status: input.status,
          query: input.query,
          limit: input.limit ?? 20,
        });
        return textResult(
          `${proposals.length} proposal${proposals.length === 1 ? "" : "s"}.`,
          proposals.map((proposal) => ({
            number: proposal.displayNumber,
            id: proposal.id,
            title: proposal.title,
            client: proposal.clientCompany
              ? `${proposal.clientName}, ${proposal.clientCompany}`
              : proposal.clientName,
            status: proposal.status,
            total: proposal.total,
            totalFormatted: formatMoney(proposal.total, proposal.currency),
            updatedAt: proposal.updatedAt,
            viewCount: proposal.viewCount,
            shareUrl: proposal.shareUrl,
          })),
        );
      }),
  );

  server.registerTool(
    "publish_proposal",
    {
      title: "Publish proposal",
      description:
        "Publishes a draft proposal: makes its client link live and marks it as Sent. Returns the share link for the user to send to their client. Only call this when the user explicitly asks to publish, send or share the proposal.",
      inputSchema: z.object({
        proposal_id: z.string().min(1).describe("UUID or number like QF-0007."),
      }),
    },
    async (input) =>
      runTool(userId, async () => {
        const proposal = await publishProposal(userId, input.proposal_id, "claude");
        const lead =
          proposal.status === "sent" && proposal.publishedAt
            ? `${proposal.displayNumber} is live for the client.`
            : `${formatProposalNumber(proposal.number)} is ${proposal.status}.`;
        return textResult(`${lead} Client link: ${proposal.shareUrl}`, compactProposal(proposal));
      }),
  );

  server.registerTool(
    "get_pipeline_summary",
    {
      title: "Get pipeline summary",
      description:
        "Returns pipeline stats: count of proposals by status, open pipeline value (sent + viewed), accepted value (all time and this month), and win rate. Use for questions about how the business is doing.",
      inputSchema: z.object({}),
    },
    async () =>
      runTool(userId, async () => {
        const summary = await getPipelineSummary(userId);
        const win =
          summary.winRate === null ? "no decided proposals yet" : `${Math.round(summary.winRate * 100)}% win rate`;
        const profile = await getBusinessProfile(userId);
        return textResult(
          `${win}. Open pipeline ${formatMoney(summary.openValue, profile.defaultCurrency)}. Accepted this month ${formatMoney(summary.acceptedThisMonthValue, profile.defaultCurrency)}.`,
          summary,
        );
      }),
  );
}
