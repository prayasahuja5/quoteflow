import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
]);

export type ProposalSection = {
  heading: string;
  body: string;
};

export type ProposalLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  mcpToken: text("mcp_token").notNull().unique(),
  lastMcpCallAt: timestamp("last_mcp_call_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessProfiles = pgTable("business_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull().default("My Business"),
  tagline: text("tagline"),
  about: text("about"),
  contactEmail: text("contact_email"),
  defaultCurrency: text("default_currency").notNull().default("INR"),
  defaultTaxPercent: numeric("default_tax_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("18"),
  defaultPaymentTerms: text("default_payment_terms"),
  defaultValidityDays: integer("default_validity_days").notNull().default(14),
  brandColor: text("brand_color").notNull().default("#4F46E5"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    status: proposalStatusEnum("status").notNull().default("draft"),
    clientName: text("client_name").notNull(),
    clientCompany: text("client_company"),
    clientEmail: text("client_email"),
    currency: text("currency").notNull(),
    summary: text("summary").notNull().default(""),
    sections: jsonb("sections")
      .$type<ProposalSection[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    lineItems: jsonb("line_items")
      .$type<ProposalLineItem[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).notNull().default("0"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    terms: text("terms"),
    validUntil: date("valid_until"),
    createdVia: text("created_via").notNull(),
    lastEditedVia: text("last_edited_via").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    firstViewedAt: timestamp("first_viewed_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByName: text("accepted_by_name"),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    declineReason: text("decline_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("proposals_user_id_idx").on(table.userId),
    uniqueIndex("proposals_user_number_idx").on(table.userId, table.number),
  ],
);

export const proposalEvents = pgTable(
  "proposal_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    source: text("source").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("proposal_events_proposal_id_idx").on(table.proposalId)],
);
