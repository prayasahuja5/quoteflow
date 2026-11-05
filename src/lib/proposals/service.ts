import { and, desc, eq, max, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { businessProfiles, proposalEvents, proposals } from "@/db/schema";
import type { ProposalLineItem, ProposalSection } from "@/db/schema";
import { db } from "@/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { addDays, formatDisplayDate, isExpired, startOfMonthKolkata, todayInKolkata } from "./dates";
import { formatProposalNumber, statusMeta, type ProposalStatus } from "./format";
import {
  BusinessProfileInput,
  CreateProposalInput,
  StatusSchema,
  UpdateProposalInput,
  type BusinessProfileData,
  type CreateProposalData,
  type UpdateProposalData,
} from "./schemas";
import { computeTotals } from "./totals";

export type ActorSource = "claude" | "app";

export type BusinessProfileDTO = {
  userId: string;
  businessName: string;
  tagline: string | null;
  about: string | null;
  contactEmail: string | null;
  defaultCurrency: string;
  defaultTaxPercent: number;
  defaultPaymentTerms: string | null;
  defaultValidityDays: number;
  brandColor: string;
  updatedAt: string;
};

export type ProposalDTO = {
  id: string;
  userId: string;
  number: number;
  displayNumber: string;
  slug: string;
  title: string;
  status: ProposalStatus;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  currency: string;
  summary: string;
  sections: ProposalSection[];
  lineItems: ProposalLineItem[];
  discountPercent: number;
  taxPercent: number;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  terms: string | null;
  validUntil: string | null;
  createdVia: ActorSource;
  lastEditedVia: ActorSource;
  publishedAt: string | null;
  firstViewedAt: string | null;
  viewCount: number;
  acceptedAt: string | null;
  acceptedByName: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  createdAt: string;
  updatedAt: string;
  editUrl: string;
  shareUrl: string;
};

export type ProposalEventDTO = {
  id: string;
  type: string;
  source: string;
  message: string;
  createdAt: string;
};

export type PublicProposal = {
  proposal: ProposalDTO;
  profile: BusinessProfileDTO;
};

export type PipelineSummary = {
  counts: Record<ProposalStatus, number>;
  openValue: number;
  acceptedValue: number;
  acceptedThisMonthValue: number;
  winRate: number | null;
  currencyNote: string;
  valuesByCurrency: Record<
    string,
    { open: number; accepted: number; acceptedThisMonth: number }
  >;
};

type ProposalRow = typeof proposals.$inferSelect;
type ProfileRow = typeof businessProfiles.$inferSelect;

const STATUSES: ProposalStatus[] = ["draft", "sent", "viewed", "accepted", "declined"];

function moneyString(value: number): string {
  return value.toFixed(2);
}

function emptyToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function asSections(value: unknown): ProposalSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return [
      {
        heading: String(record.heading ?? ""),
        body: String(record.body ?? ""),
      },
    ];
  });
}

function asLineItems(value: unknown): ProposalLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return [
      {
        description: String(record.description ?? ""),
        quantity: Number(record.quantity ?? 0),
        unit_price: Number(record.unit_price ?? 0),
      },
    ];
  });
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toProposalDTO(row: ProposalRow): ProposalDTO {
  const lineItems = asLineItems(row.lineItems);
  const discountPercent = Number(row.discountPercent);
  const taxPercent = Number(row.taxPercent);
  const totals = computeTotals(lineItems, discountPercent, taxPercent);
  const createdVia = row.createdVia === "claude" ? "claude" : "app";
  const lastEditedVia = row.lastEditedVia === "claude" ? "claude" : "app";

  return {
    id: row.id,
    userId: row.userId,
    number: row.number,
    displayNumber: formatProposalNumber(row.number),
    slug: row.slug,
    title: row.title,
    status: row.status,
    clientName: row.clientName,
    clientCompany: row.clientCompany,
    clientEmail: row.clientEmail,
    currency: row.currency,
    summary: row.summary,
    sections: asSections(row.sections),
    lineItems,
    discountPercent,
    taxPercent,
    subtotal: Number(row.subtotal),
    discountAmount: totals.discountAmount,
    taxableAmount: totals.taxableAmount,
    taxAmount: totals.taxAmount,
    total: Number(row.total),
    terms: row.terms,
    validUntil: row.validUntil,
    createdVia,
    lastEditedVia,
    publishedAt: iso(row.publishedAt),
    firstViewedAt: iso(row.firstViewedAt),
    viewCount: row.viewCount,
    acceptedAt: iso(row.acceptedAt),
    acceptedByName: row.acceptedByName,
    declinedAt: iso(row.declinedAt),
    declineReason: row.declineReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editUrl: `${env.NEXT_PUBLIC_APP_URL}/app/proposals/${row.id}`,
    shareUrl: `${env.NEXT_PUBLIC_APP_URL}/p/${row.slug}`,
  };
}

function toProfileDTO(row: ProfileRow): BusinessProfileDTO {
  return {
    userId: row.userId,
    businessName: row.businessName,
    tagline: row.tagline,
    about: row.about,
    contactEmail: row.contactEmail,
    defaultCurrency: row.defaultCurrency,
    defaultTaxPercent: Number(row.defaultTaxPercent),
    defaultPaymentTerms: row.defaultPaymentTerms,
    defaultValidityDays: row.defaultValidityDays,
    brandColor: row.brandColor,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("duplicate key") || message.includes("23505");
}

async function nextProposalNumber(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: max(proposals.number) })
    .from(proposals)
    .where(eq(proposals.userId, userId));
  return (row?.value ?? 0) + 1;
}

async function insertProposal(values: typeof proposals.$inferInsert): Promise<ProposalRow> {
  let number = values.number;
  let slug = values.slug;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const [row] = await db
        .insert(proposals)
        .values({ ...values, number, slug })
        .returning();
      if (!row) throw new AppError("INVALID", "Could not create the proposal.");
      return row;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 2) throw error;
      number += 1;
      slug = nanoid(12);
    }
  }

  throw new AppError("INVALID", "Could not create the proposal.");
}

async function addEvent(
  proposalId: string,
  type: string,
  source: "claude" | "app" | "client",
  message: string,
  createdAt?: Date,
) {
  await db.insert(proposalEvents).values({
    proposalId,
    type,
    source,
    message,
    ...(createdAt ? { createdAt } : {}),
  });
}

function lookupWhere(userId: string, idOrNumber: string) {
  const value = idOrNumber.trim();
  const prefixed = /^QF-(\d+)$/i.exec(value);
  if (prefixed) {
    return and(eq(proposals.userId, userId), eq(proposals.number, Number(prefixed[1])));
  }
  if (/^\d+$/.test(value)) {
    return and(eq(proposals.userId, userId), eq(proposals.number, Number(value)));
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return and(eq(proposals.userId, userId), eq(proposals.id, value));
  }
  return null;
}

async function requireProposal(userId: string, idOrNumber: string): Promise<ProposalRow> {
  const where = lookupWhere(userId, idOrNumber);
  if (!where) throw new AppError("NOT_FOUND", "No proposal matches that id.");
  const [row] = await db.select().from(proposals).where(where);
  if (!row) throw new AppError("NOT_FOUND", "Proposal not found.");
  return row;
}

function assertEditable(row: ProposalRow) {
  if (row.status !== "accepted") return;
  const when = row.acceptedAt ? formatDisplayDate(row.acceptedAt) : "an earlier date";
  throw new AppError(
    "LOCKED",
    `This proposal was accepted by the client on ${when} and is locked. Duplicate it to make changes.`,
  );
}

function via(source: ActorSource): string {
  return source === "claude" ? "via Claude" : "in the app";
}

function humanList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "proposal";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export async function getBusinessProfile(userId: string): Promise<BusinessProfileDTO> {
  const [row] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId));
  if (!row) throw new AppError("NOT_FOUND", "Business profile not found.");
  return toProfileDTO(row);
}

export async function updateBusinessProfile(
  userId: string,
  input: unknown,
): Promise<BusinessProfileDTO> {
  const data: BusinessProfileData = BusinessProfileInput.parse(input);
  const [row] = await db
    .update(businessProfiles)
    .set({
      businessName: data.businessName.trim(),
      tagline: emptyToNull(data.tagline) ?? null,
      about: emptyToNull(data.about) ?? null,
      contactEmail: emptyToNull(data.contactEmail) ?? null,
      defaultCurrency: data.defaultCurrency,
      defaultTaxPercent: moneyString(data.defaultTaxPercent),
      defaultPaymentTerms: emptyToNull(data.defaultPaymentTerms) ?? null,
      defaultValidityDays: data.defaultValidityDays,
      brandColor: data.brandColor,
      updatedAt: new Date(),
    })
    .where(eq(businessProfiles.userId, userId))
    .returning();
  if (!row) throw new AppError("NOT_FOUND", "Business profile not found.");
  return toProfileDTO(row);
}

export async function createProposal(
  userId: string,
  input: unknown,
  source: ActorSource,
): Promise<ProposalDTO> {
  const data: CreateProposalData = CreateProposalInput.parse(input);
  const profile = await getBusinessProfile(userId);
  const currency = data.currency ?? profile.defaultCurrency;
  const taxPercent = data.tax_percent ?? profile.defaultTaxPercent;
  const discountPercent = data.discount_percent ?? 0;
  const terms = data.terms ?? profile.defaultPaymentTerms;
  const validUntil =
    data.valid_until ?? addDays(todayInKolkata(), profile.defaultValidityDays);
  const totals = computeTotals(data.line_items, discountPercent, taxPercent);
  const number = await nextProposalNumber(userId);

  const row = await insertProposal({
    userId,
    number,
    slug: nanoid(12),
    title: data.title.trim(),
    status: "draft",
    clientName: data.client_name.trim(),
    clientCompany: emptyToNull(data.client_company) ?? null,
    clientEmail: emptyToNull(data.client_email) ?? null,
    currency,
    summary: data.summary,
    sections: data.sections,
    lineItems: data.line_items,
    discountPercent: moneyString(discountPercent),
    taxPercent: moneyString(taxPercent),
    subtotal: moneyString(totals.subtotal),
    total: moneyString(totals.total),
    terms,
    validUntil,
    createdVia: source,
    lastEditedVia: source,
  });

  await addEvent(
    row.id,
    "created",
    source,
    source === "claude" ? "Created by Claude" : "Created in app",
  );

  return toProposalDTO(row);
}

export async function updateProposal(
  userId: string,
  proposalId: string,
  patchInput: unknown,
  source: ActorSource,
): Promise<ProposalDTO> {
  const patch: UpdateProposalData = UpdateProposalInput.parse({
    ...(typeof patchInput === "object" && patchInput ? patchInput : {}),
    proposal_id: proposalId,
  });
  const current = await requireProposal(userId, proposalId);
  assertEditable(current);

  const groups: string[] = [];
  if (patch.title !== undefined) groups.push("title");
  if (
    patch.client_name !== undefined ||
    patch.client_company !== undefined ||
    patch.client_email !== undefined
  ) {
    groups.push("client");
  }
  if (patch.summary !== undefined) groups.push("summary");
  if (patch.sections !== undefined) groups.push("sections");
  if (patch.line_items !== undefined) groups.push("line items");
  if (
    patch.discount_percent !== undefined ||
    patch.tax_percent !== undefined ||
    patch.currency !== undefined
  ) {
    groups.push("pricing");
  }
  if (patch.terms !== undefined) groups.push("terms");
  if (patch.valid_until !== undefined) groups.push("validity");
  if (groups.length === 0) throw new AppError("INVALID", "No changes were provided.");

  const lineItems = patch.line_items ?? asLineItems(current.lineItems);
  const discountPercent = patch.discount_percent ?? Number(current.discountPercent);
  const taxPercent = patch.tax_percent ?? Number(current.taxPercent);
  const totals = computeTotals(lineItems, discountPercent, taxPercent);

  const [row] = await db
    .update(proposals)
    .set({
      title: patch.title?.trim() ?? current.title,
      clientName: patch.client_name?.trim() ?? current.clientName,
      clientCompany:
        patch.client_company !== undefined
          ? (emptyToNull(patch.client_company) ?? null)
          : current.clientCompany,
      clientEmail:
        patch.client_email !== undefined
          ? (emptyToNull(patch.client_email) ?? null)
          : current.clientEmail,
      currency: patch.currency ?? current.currency,
      summary: patch.summary ?? current.summary,
      sections: patch.sections ?? asSections(current.sections),
      lineItems,
      discountPercent: moneyString(discountPercent),
      taxPercent: moneyString(taxPercent),
      subtotal: moneyString(totals.subtotal),
      total: moneyString(totals.total),
      terms: patch.terms !== undefined ? (emptyToNull(patch.terms) ?? null) : current.terms,
      validUntil: patch.valid_until !== undefined ? patch.valid_until : current.validUntil,
      lastEditedVia: source,
      updatedAt: new Date(),
    })
    .where(and(eq(proposals.id, current.id), eq(proposals.userId, userId)))
    .returning();
  if (!row) throw new AppError("NOT_FOUND", "Proposal not found.");

  await addEvent(
    row.id,
    "updated",
    source,
    `Updated ${humanList(groups)} (${via(source)})`,
  );
  return toProposalDTO(row);
}

export async function publishProposal(
  userId: string,
  proposalId: string,
  source: ActorSource,
): Promise<ProposalDTO> {
  const current = await requireProposal(userId, proposalId);
  if (current.status !== "draft") return toProposalDTO(current);

  const [row] = await db
    .update(proposals)
    .set({
      status: "sent",
      publishedAt: current.publishedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(proposals.id, current.id), eq(proposals.userId, userId), eq(proposals.status, "draft")),
    )
    .returning();

  if (!row) {
    const latest = await requireProposal(userId, proposalId);
    return toProposalDTO(latest);
  }

  await addEvent(
    row.id,
    "published",
    source,
    source === "claude" ? "Published by Claude" : "Published in app",
  );
  return toProposalDTO(row);
}

export async function setStatus(
  userId: string,
  proposalId: string,
  nextStatus: unknown,
  source: ActorSource,
): Promise<ProposalDTO> {
  const status = StatusSchema.parse(nextStatus);
  const current = await requireProposal(userId, proposalId);
  if (current.status === status) return toProposalDTO(current);

  const now = new Date();
  const [row] = await db
    .update(proposals)
    .set({
      status,
      publishedAt: status === "sent" ? (current.publishedAt ?? now) : current.publishedAt,
      acceptedAt: status === "accepted" ? (current.acceptedAt ?? now) : current.acceptedAt,
      declinedAt: status === "declined" ? (current.declinedAt ?? now) : current.declinedAt,
      updatedAt: now,
    })
    .where(and(eq(proposals.id, current.id), eq(proposals.userId, userId)))
    .returning();
  if (!row) throw new AppError("NOT_FOUND", "Proposal not found.");

  await addEvent(
    row.id,
    "status_changed",
    source,
    `Status changed to ${statusMeta[status].label} (${via(source)})`,
  );
  return toProposalDTO(row);
}

export async function duplicateProposal(
  userId: string,
  proposalId: string,
  source: ActorSource,
): Promise<ProposalDTO> {
  const current = await requireProposal(userId, proposalId);
  const suffix = " (copy)";
  const title =
    current.title.length + suffix.length <= 150
      ? `${current.title}${suffix}`
      : `${current.title.slice(0, 150 - suffix.length)}${suffix}`;
  const lineItems = asLineItems(current.lineItems);
  const discountPercent = Number(current.discountPercent);
  const taxPercent = Number(current.taxPercent);
  const totals = computeTotals(lineItems, discountPercent, taxPercent);
  const number = await nextProposalNumber(userId);

  const row = await insertProposal({
    userId,
    number,
    slug: nanoid(12),
    title,
    status: "draft",
    clientName: current.clientName,
    clientCompany: current.clientCompany,
    clientEmail: current.clientEmail,
    currency: current.currency,
    summary: current.summary,
    sections: asSections(current.sections),
    lineItems,
    discountPercent: moneyString(discountPercent),
    taxPercent: moneyString(taxPercent),
    subtotal: moneyString(totals.subtotal),
    total: moneyString(totals.total),
    terms: current.terms,
    validUntil: current.validUntil,
    createdVia: source,
    lastEditedVia: source,
  });

  await addEvent(
    row.id,
    "duplicated",
    source,
    `Duplicated from ${formatProposalNumber(current.number)}`,
  );
  return toProposalDTO(row);
}

export async function deleteProposal(userId: string, proposalId: string): Promise<void> {
  const deleted = await db
    .delete(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.userId, userId)))
    .returning({ id: proposals.id });
  if (deleted.length === 0) throw new AppError("NOT_FOUND", "Proposal not found.");
}

export async function getProposal(
  userId: string,
  proposalIdOrNumber: string,
): Promise<{ proposal: ProposalDTO; events: ProposalEventDTO[] }> {
  const row = await requireProposal(userId, proposalIdOrNumber);
  const events = await db
    .select()
    .from(proposalEvents)
    .where(eq(proposalEvents.proposalId, row.id))
    .orderBy(desc(proposalEvents.createdAt))
    .limit(50);

  return {
    proposal: toProposalDTO(row),
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      source: event.source,
      message: event.message,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function listProposals(
  userId: string,
  options?: { status?: ProposalStatus; query?: string; limit?: number },
): Promise<ProposalDTO[]> {
  const limit = Math.min(50, Math.max(1, options?.limit ?? 20));
  const filters = [eq(proposals.userId, userId)];
  if (options?.status) filters.push(eq(proposals.status, options.status));

  const query = options?.query?.trim();
  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    filters.push(
      sql`(${proposals.title} ILIKE ${pattern} ESCAPE '\\' OR ${proposals.clientName} ILIKE ${pattern} ESCAPE '\\' OR coalesce(${proposals.clientCompany}, '') ILIKE ${pattern} ESCAPE '\\')`,
    );
  }

  const rows = await db
    .select()
    .from(proposals)
    .where(and(...filters))
    .orderBy(desc(proposals.updatedAt))
    .limit(limit);

  return rows.map(toProposalDTO);
}

export async function getPipelineSummary(userId: string): Promise<PipelineSummary> {
  const profile = await getBusinessProfile(userId);
  const rows = await db.select().from(proposals).where(eq(proposals.userId, userId));
  const monthStart = startOfMonthKolkata();
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<
    ProposalStatus,
    number
  >;
  const valuesByCurrency: PipelineSummary["valuesByCurrency"] = {};

  for (const row of rows) {
    counts[row.status] += 1;
    const bucket = (valuesByCurrency[row.currency] ??= {
      open: 0,
      accepted: 0,
      acceptedThisMonth: 0,
    });
    const total = Number(row.total);
    if (row.status === "sent" || row.status === "viewed") bucket.open += total;
    if (row.status === "accepted") {
      bucket.accepted += total;
      if (row.acceptedAt && row.acceptedAt >= monthStart) bucket.acceptedThisMonth += total;
    }
  }

  for (const bucket of Object.values(valuesByCurrency)) {
    bucket.open = Math.round(bucket.open * 100) / 100;
    bucket.accepted = Math.round(bucket.accepted * 100) / 100;
    bucket.acceptedThisMonth = Math.round(bucket.acceptedThisMonth * 100) / 100;
  }

  const headline = valuesByCurrency[profile.defaultCurrency] ?? {
    open: 0,
    accepted: 0,
    acceptedThisMonth: 0,
  };
  const otherCurrencies = Object.keys(valuesByCurrency).filter(
    (currency) => currency !== profile.defaultCurrency,
  );
  const decided = counts.accepted + counts.declined;

  return {
    counts,
    openValue: headline.open,
    acceptedValue: headline.accepted,
    acceptedThisMonthValue: headline.acceptedThisMonth,
    winRate: decided === 0 ? null : counts.accepted / decided,
    currencyNote:
      otherCurrencies.length > 0
        ? `Headline totals are in ${profile.defaultCurrency}. Other currencies are listed separately.`
        : `All values are in ${profile.defaultCurrency}.`,
    valuesByCurrency,
  };
}

export async function getProposalVersion(userId: string, id: string): Promise<string> {
  const [row] = await db
    .select({ updatedAt: proposals.updatedAt })
    .from(proposals)
    .where(and(eq(proposals.id, id), eq(proposals.userId, userId)));
  if (!row) throw new AppError("NOT_FOUND", "Proposal not found.");
  return row.updatedAt.toISOString();
}

export async function getProposalFeedVersion(
  userId: string,
): Promise<{ latestUpdatedAt: string | null; count: number }> {
  const [row] = await db
    .select({
      latestUpdatedAt: max(proposals.updatedAt),
      count: sql<number>`count(*)::int`,
    })
    .from(proposals)
    .where(eq(proposals.userId, userId));

  const latest = row?.latestUpdatedAt ? new Date(row.latestUpdatedAt).toISOString() : null;
  return { latestUpdatedAt: latest, count: Number(row?.count ?? 0) };
}

async function publicRecord(slug: string): Promise<{
  proposal: ProposalRow;
  profile: ProfileRow;
} | null> {
  const [proposal] = await db.select().from(proposals).where(eq(proposals.slug, slug));
  if (!proposal || proposal.status === "draft") return null;
  const [profile] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, proposal.userId));
  if (!profile) return null;
  return { proposal, profile };
}

export async function getPublicProposal(slug: string): Promise<PublicProposal | null> {
  const record = await publicRecord(slug);
  if (!record) return null;
  return { proposal: toProposalDTO(record.proposal), profile: toProfileDTO(record.profile) };
}

export async function getProposalOwnerId(slug: string): Promise<{
  userId: string;
  status: ProposalStatus;
} | null> {
  const [row] = await db
    .select({ userId: proposals.userId, status: proposals.status })
    .from(proposals)
    .where(eq(proposals.slug, slug));
  return row ?? null;
}

export async function recordView(
  slug: string,
  options: { isOwner: boolean },
): Promise<PublicProposal | null> {
  const [current] = await db.select().from(proposals).where(eq(proposals.slug, slug));
  if (!current || current.status === "draft") return null;

  if (!options.isOwner) {
    await db
      .update(proposals)
      .set({
        viewCount: sql`${proposals.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, current.id));

    const now = new Date();
    const [firstView] = await db
      .update(proposals)
      .set({
        firstViewedAt: now,
        status: current.status === "sent" ? "viewed" : current.status,
        updatedAt: now,
      })
      .where(and(eq(proposals.id, current.id), sql`${proposals.firstViewedAt} is null`))
      .returning();

    if (firstView) {
      await addEvent(current.id, "viewed", "client", "Viewed by client", now);
    }
  }

  return getPublicProposal(slug);
}

function assertClientCanDecide(row: ProposalRow, profile: ProfileRow) {
  if (row.status !== "sent" && row.status !== "viewed") {
    throw new AppError("INVALID", "This proposal can no longer be accepted or declined.");
  }
  if (isExpired(row.validUntil)) {
    const when = row.validUntil ? formatDisplayDate(`${row.validUntil}T00:00:00+05:30`) : "the validity date";
    const contact = profile.contactEmail ?? profile.businessName;
    throw new AppError("INVALID", `This proposal expired on ${when}. Contact ${contact}.`);
  }
}

export async function acceptProposal(slug: string, input: { name: unknown }): Promise<ProposalDTO> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 120) {
    throw new AppError("INVALID", "Type your full name to accept this proposal.");
  }

  const record = await publicRecord(slug);
  if (!record) throw new AppError("NOT_FOUND", "Proposal not found.");
  assertClientCanDecide(record.proposal, record.profile);

  const now = new Date();
  const [row] = await db
    .update(proposals)
    .set({
      status: "accepted",
      acceptedAt: now,
      acceptedByName: name,
      updatedAt: now,
    })
    .where(
      and(
        eq(proposals.id, record.proposal.id),
        or(eq(proposals.status, "sent"), eq(proposals.status, "viewed")),
      ),
    )
    .returning();
  if (!row) throw new AppError("INVALID", "This proposal can no longer be accepted.");

  await addEvent(row.id, "accepted", "client", `Accepted by ${name}`, now);
  return toProposalDTO(row);
}

export async function declineProposal(
  slug: string,
  input: { reason?: unknown },
): Promise<ProposalDTO> {
  const reason =
    typeof input.reason === "string" && input.reason.trim().length > 0
      ? input.reason.trim().slice(0, 2000)
      : null;
  const record = await publicRecord(slug);
  if (!record) throw new AppError("NOT_FOUND", "Proposal not found.");
  assertClientCanDecide(record.proposal, record.profile);

  const now = new Date();
  const [row] = await db
    .update(proposals)
    .set({
      status: "declined",
      declinedAt: now,
      declineReason: reason,
      updatedAt: now,
    })
    .where(
      and(
        eq(proposals.id, record.proposal.id),
        or(eq(proposals.status, "sent"), eq(proposals.status, "viewed")),
      ),
    )
    .returning();
  if (!row) throw new AppError("INVALID", "This proposal can no longer be declined.");

  await addEvent(
    row.id,
    "declined",
    "client",
    reason ? `Declined by client: ${reason}` : "Declined by client",
    now,
  );
  return toProposalDTO(row);
}

export async function getOwnedProposalBySlug(
  userId: string,
  slug: string,
): Promise<PublicProposal | null> {
  const [proposal] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.slug, slug), eq(proposals.userId, userId)));
  if (!proposal) return null;
  const profile = await getBusinessProfile(userId);
  return { proposal: toProposalDTO(proposal), profile };
}
