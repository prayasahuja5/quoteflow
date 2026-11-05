import { z } from "zod";

export const LineItemSchema = z.object({
  description: z.string().min(1).max(300).describe("What the client is buying."),
  quantity: z.coerce
    .number()
    .positive()
    .max(100000)
    .describe("Quantity in major units, greater than 0."),
  unit_price: z.coerce
    .number()
    .min(0)
    .max(1_000_000_000)
    .describe("Price per unit in major currency units, such as rupees. Not paise."),
});

export const SectionSchema = z.object({
  heading: z.string().min(1).max(120).describe("Section heading."),
  body: z.string().max(10000).describe("Section body in markdown."),
});

export const CurrencySchema = z.enum(["INR", "USD", "SGD", "EUR", "GBP", "AUD"]);

export const StatusSchema = z.enum(["draft", "sent", "viewed", "accepted", "declined"]);

const optionalEmail = z
  .union([z.literal(""), z.email()])
  .optional()
  .describe("Client email. Optional. An empty string is treated as omitted.");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Date in YYYY-MM-DD format. Optional.");

export const CreateProposalFields = {
  title: z.string().min(1).max(150).describe("Proposal title."),
  client_name: z.string().min(1).max(120).describe("Client contact name."),
  client_company: z
    .string()
    .max(150)
    .optional()
    .describe("Client company. Optional."),
  client_email: optionalEmail,
  currency: CurrencySchema.optional().describe(
    "Currency code. Omit to use the business default.",
  ),
  summary: z
    .string()
    .max(5000)
    .default("")
    .describe("Short persuasive summary in markdown, one to three paragraphs."),
  sections: z
    .array(SectionSchema)
    .max(12)
    .default([])
    .describe("Two to six sections such as Scope of work, Deliverables, Timeline, and Why us."),
  line_items: z
    .array(LineItemSchema)
    .max(30)
    .default([])
    .describe("Itemised line items. Quoteflow calculates the totals."),
  discount_percent: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Discount percent from 0 to 100. Optional."),
  tax_percent: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Tax percent from 0 to 100. Omit to use the business default."),
  terms: z
    .string()
    .max(5000)
    .optional()
    .describe("Payment terms in markdown. Omit to use the business default."),
  valid_until: isoDate.optional(),
};

export const CreateProposalInput = z.object(CreateProposalFields);

export const UpdateProposalInput = z.object({
  proposal_id: z
    .string()
    .min(1)
    .describe("UUID or number like QF-0007."),
  title: z.string().min(1).max(150).optional().describe("Replacement title."),
  client_name: z.string().min(1).max(120).optional().describe("Replacement client contact name."),
  client_company: z
    .string()
    .max(150)
    .nullable()
    .optional()
    .describe("Replacement company. Send null to clear it."),
  client_email: z
    .union([z.literal(""), z.email()])
    .nullable()
    .optional()
    .describe("Replacement email. Send an empty string or null to clear it."),
  currency: CurrencySchema.optional().describe("Replacement currency. Amounts are not converted."),
  summary: z.string().max(5000).optional().describe("Replacement summary in markdown."),
  sections: z
    .array(SectionSchema)
    .max(12)
    .optional()
    .describe("Replaces the entire section list. Send every section you want to keep."),
  line_items: z
    .array(LineItemSchema)
    .max(30)
    .optional()
    .describe("Replaces the entire line-item list. Send every row you want to keep."),
  discount_percent: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Replacement discount percent."),
  tax_percent: z.coerce.number().min(0).max(100).optional().describe("Replacement tax percent."),
  terms: z
    .string()
    .max(5000)
    .nullable()
    .optional()
    .describe("Replacement terms. Send null to clear them."),
  valid_until: isoDate
    .nullable()
    .optional()
    .describe("Replacement validity date in YYYY-MM-DD. Send null to clear it."),
});

export const BusinessProfileInput = z.object({
  businessName: z.string().min(1).max(120),
  tagline: z.string().max(180).nullable(),
  about: z.string().max(2000).nullable(),
  contactEmail: z.union([z.literal(""), z.email()]).nullable(),
  defaultCurrency: CurrencySchema,
  defaultTaxPercent: z.coerce.number().min(0).max(100),
  defaultPaymentTerms: z.string().max(2000).nullable(),
  defaultValidityDays: z.coerce.number().int().min(1).max(365),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #4F46E5."),
});

export type CreateProposalData = z.infer<typeof CreateProposalInput>;
export type UpdateProposalData = z.infer<typeof UpdateProposalInput>;
export type BusinessProfileData = z.infer<typeof BusinessProfileInput>;
