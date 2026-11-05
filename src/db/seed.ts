import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businessProfiles, proposalEvents, proposals, users } from "@/db/schema";
import { env } from "@/lib/env";
import { createProposal, type ActorSource } from "@/lib/proposals/service";

const DEMO_EMAIL = "demo@quoteflow.app";
const DEMO_PASSWORD = "Quoteflow@2026";

const profileValues = {
  businessName: "Northwind Studio",
  tagline: "Brand & product design for ambitious startups",
  about:
    "Northwind Studio is a small brand and product studio based in Bengaluru. We help startups look as considered as the products they ship, from the first workshop through launch.",
  contactEmail: "hello@northwind.studio",
  defaultCurrency: "INR",
  defaultTaxPercent: "18.00",
  defaultPaymentTerms: "50% upfront, 50% on delivery. Invoices due within 15 days.",
  defaultValidityDays: 14,
  brandColor: "#4F46E5",
};

type SeedSpec = {
  source: ActorSource;
  input: {
    title: string;
    client_name: string;
    client_company: string;
    client_email: string;
    summary: string;
    sections: { heading: string; body: string }[];
    line_items: { description: string; quantity: number; unit_price: number }[];
    terms?: string;
  };
  status: "draft" | "sent" | "viewed" | "accepted";
  viewCount: number;
  acceptedByName?: string;
  createdAt: Date;
  publishedAt?: Date;
  firstViewedAt?: Date;
  acceptedAt?: Date;
};

function ago(days: number, hours = 0): Date {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000);
}

const seeds: SeedSpec[] = [
  {
    source: "claude",
    status: "accepted",
    viewCount: 2,
    acceptedByName: "Rohan Mehta",
    createdAt: ago(10, 2),
    publishedAt: ago(8, 4),
    firstViewedAt: ago(7, 1),
    acceptedAt: ago(6, 3),
    input: {
      title: "Brand identity for Chaipoint Cafe",
      client_name: "Rohan Mehta",
      client_company: "Chaipoint Cafe",
      client_email: "rohan@chaipoint.cafe",
      summary:
        "A complete brand identity for Chaipoint Cafe's first three stores, built to feel warm on the street and precise on the cup. The work covers the name system, the visual identity, and the pieces the team will actually use in the first month.",
      sections: [
        {
          heading: "Scope of work",
          body: "We will design the identity around the cafe's slow-brew menu and neighbourhood tone. The engagement includes a half-day workshop, two concept directions, and one refined system ready for signage and packaging.",
        },
        {
          heading: "Deliverables",
          body: "- Wordmark and symbol, with clear space and misuse rules\n- Colour, type, and photography guidance\n- Cup, sleeve, bag, and loyalty card artwork\n- A 16-page brand guide the store team can follow",
        },
        {
          heading: "Timeline",
          body: "Week 1 is the workshop and audit of the current menu. Weeks 2 and 3 are concept directions. Week 4 is refinement, artwork, and the guide. We hold one week for printer feedback after handover.",
        },
        {
          heading: "Why us",
          body: "Northwind has shipped identity systems for six food brands in the last two years. We design for how a cafe actually operates: one printer, a small team, and a sign that has to read from across the road.",
        },
      ],
      line_items: [
        { description: "Brand workshop and menu audit", quantity: 1, unit_price: 25000 },
        { description: "Visual identity system", quantity: 1, unit_price: 85000 },
        { description: "Brand guidelines", quantity: 1, unit_price: 40000 },
        { description: "Packaging and in-store artwork", quantity: 1, unit_price: 20000 },
      ],
    },
  },
  {
    source: "claude",
    status: "viewed",
    viewCount: 3,
    createdAt: ago(5, 1),
    publishedAt: ago(2, 2),
    firstViewedAt: ago(1, 5),
    input: {
      title: "Mobile app UX audit for FinEdge",
      client_name: "Meera Iyer",
      client_company: "FinEdge",
      client_email: "meera@finedge.in",
      summary:
        "A focused audit of the FinEdge investor app, aimed at the drop-off between signup and the first completed transfer. We will watch real sessions, name the friction, and leave you with a prototype of the repaired path.",
      sections: [
        {
          heading: "Scope of work",
          body: "The audit covers onboarding, KYC, and the first-transfer flow on iOS and Android. We will not redesign the whole app. The output is a prioritised set of changes and a clickable prototype of the critical path.",
        },
        {
          heading: "Deliverables",
          body: "- Six moderated user interviews\n- A findings report with severity and recommended fixes\n- A prototype of the repaired first-transfer flow\n- A readout with the product and compliance teams",
        },
        {
          heading: "Timeline",
          body: "Interviews run in week 1. The report and prototype land at the end of week 3. The readout is scheduled in week 4, with one round of revisions included.",
        },
      ],
      line_items: [
        { description: "Heuristic audit of the current app", quantity: 1, unit_price: 60000 },
        { description: "Moderated user interviews", quantity: 6, unit_price: 8000 },
        { description: "Findings report", quantity: 1, unit_price: 35000 },
        { description: "Critical-path prototype", quantity: 1, unit_price: 45000 },
      ],
    },
  },
  {
    source: "claude",
    status: "sent",
    viewCount: 0,
    createdAt: ago(2, 6),
    publishedAt: ago(1, 2),
    input: {
      title: "Website redesign for Acme Logistics",
      client_name: "Anita Rao",
      client_company: "Acme Logistics",
      client_email: "anita@acmelogistics.in",
      summary:
        "A redesign of the Acme Logistics marketing site so a shipper can understand the offer, trust the operation, and ask for a quote without calling sales. The new site replaces the current brochure page with a clear service story and a quote path.",
      sections: [
        {
          heading: "Scope of work",
          body: "Discovery with the sales lead, a new information architecture, interface design for the core templates, and build of the marketing site. Content writing for the main pages is included. Ongoing campaigns are not.",
        },
        {
          heading: "Deliverables",
          body: "- Sitemap and message hierarchy\n- Desktop and mobile designs for home, services, about, and quote\n- A responsive build in the existing hosting account\n- A launch checklist and a one-hour handover",
        },
        {
          heading: "Timeline",
          body: "Discovery in week 1. Design in weeks 2 and 3. Build and content in weeks 4 and 5. Launch in week 6, after one consolidated round of feedback.",
        },
        {
          heading: "Why us",
          body: "We design sites for operators, not for award boards. The quote form, the proof, and the phone number will be obvious on a phone in a warehouse yard.",
        },
      ],
      line_items: [
        { description: "Discovery and sitemap", quantity: 1, unit_price: 40000 },
        { description: "Interface design", quantity: 1, unit_price: 90000 },
        { description: "Responsive development", quantity: 1, unit_price: 110000 },
        { description: "Content and launch", quantity: 1, unit_price: 25000 },
      ],
    },
  },
  {
    source: "app",
    status: "draft",
    viewCount: 0,
    createdAt: ago(0, 3),
    input: {
      title: "Pitch deck design for Seedling Labs",
      client_name: "Kabir Sethi",
      client_company: "Seedling Labs",
      client_email: "kabir@seedlinglabs.com",
      summary:
        "A 12-slide seed deck for Seedling Labs that a partner can read without a voiceover. We will tighten the story, design the slides, and leave the file ready for the next partner meeting.",
      sections: [
        {
          heading: "Scope of work",
          body: "One working session on the narrative, then design of a 12-slide deck plus a short appendix. We will use your existing numbers. Financial modelling is out of scope.",
        },
        {
          heading: "Deliverables",
          body: "- Narrative outline\n- Designed deck in Figma and PowerPoint\n- Two rounds of revisions\n- Export notes for PDF and presenting",
        },
        {
          heading: "Timeline",
          body: "The outline is ready two days after the working session. The first designed draft follows in five days. Final files are delivered within two weeks of kickoff.",
        },
      ],
      line_items: [
        { description: "Narrative workshop", quantity: 1, unit_price: 20000 },
        { description: "Deck design, 12 slides", quantity: 1, unit_price: 45000 },
        { description: "Revision rounds", quantity: 2, unit_price: 8000 },
      ],
    },
  },
];

function eventsFor(spec: SeedSpec) {
  const created = {
    type: "created",
    source: spec.source,
    message: spec.source === "claude" ? "Created by Claude" : "Created in app",
    createdAt: spec.createdAt,
  };
  if (spec.status === "draft") return [created];

  const published = {
    type: "published",
    source: "app" as const,
    message: "Published in app",
    createdAt: spec.publishedAt ?? spec.createdAt,
  };
  if (spec.status === "sent") return [created, published];

  const viewed = {
    type: "viewed",
    source: "client" as const,
    message: "Viewed by client",
    createdAt: spec.firstViewedAt ?? spec.publishedAt ?? spec.createdAt,
  };
  if (spec.status === "viewed") return [created, published, viewed];

  return [
    created,
    published,
    viewed,
    {
      type: "accepted",
      source: "client" as const,
      message: `Accepted by ${spec.acceptedByName}`,
      createdAt: spec.acceptedAt ?? spec.firstViewedAt ?? spec.createdAt,
    },
  ];
}

export async function resetDemoData() {
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const [existing] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL));

  let userId: string;
  if (existing) {
    await db.delete(proposals).where(eq(proposals.userId, existing.id));
    await db
      .update(users)
      .set({
        name: "Priya Sharma",
        passwordHash,
        mcpToken: env.DEMO_MCP_TOKEN,
      })
      .where(eq(users.id, existing.id));
    await db
      .update(businessProfiles)
      .set({ ...profileValues, updatedAt: new Date() })
      .where(eq(businessProfiles.userId, existing.id));
    userId = existing.id;
  } else {
    const [created] = await db
      .insert(users)
      .values({
        email: DEMO_EMAIL,
        passwordHash,
        name: "Priya Sharma",
        mcpToken: env.DEMO_MCP_TOKEN,
      })
      .returning();
    if (!created) throw new Error("Could not create the demo user.");
    await db.insert(businessProfiles).values({ userId: created.id, ...profileValues });
    userId = created.id;
  }

  for (const spec of seeds) {
    const proposal = await createProposal(userId, spec.input, spec.source);
    const timeline = eventsFor(spec);
    const latest = timeline[timeline.length - 1]?.createdAt ?? spec.createdAt;

    await db.delete(proposalEvents).where(eq(proposalEvents.proposalId, proposal.id));
    await db.insert(proposalEvents).values(
      timeline.map((event) => ({
        proposalId: proposal.id,
        type: event.type,
        source: event.source,
        message: event.message,
        createdAt: event.createdAt,
      })),
    );
    await db
      .update(proposals)
      .set({
        status: spec.status,
        viewCount: spec.viewCount,
        publishedAt: spec.publishedAt ?? null,
        firstViewedAt: spec.firstViewedAt ?? null,
        acceptedAt: spec.acceptedAt ?? null,
        acceptedByName: spec.acceptedByName ?? null,
        createdAt: spec.createdAt,
        updatedAt: latest,
      })
      .where(eq(proposals.id, proposal.id));
  }

  console.log("Demo account ready: demo@quoteflow.app");
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("seed.ts") || entry.endsWith("seed.js")) {
  resetDemoData().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
