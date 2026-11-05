# Quoteflow

Your Claude writes the proposal. Quoteflow gets it signed.

## Live app

Production: the Vercel project for this repo. Demo login:

- Email: `demo@quoteflow.app`
- Password: `Quoteflow@2026`

The demo account opens on four proposals (QF-0001 through QF-0004) for Northwind Studio.

## Connect Claude in 60 seconds

Demo MCP URL:

`https://<your-production-domain>/api/mcp/qf_demo_c3363762edc2fc86e4238bc3`

Locally the same path is `http://localhost:3000/api/mcp/qf_demo_c3363762edc2fc86e4238bc3`.

1. Open Claude → **Customize** (or **Settings**) → **Connectors**.
2. Click **+ Add** → **Add custom connector**.
3. Name: **Quoteflow**. Remote MCP server URL: paste the link. Click **Continue** / **Add**.
4. If asked about authentication, choose **No sign in**. The private link already identifies the account.
5. In a new chat, click **+** → **Connectors** and turn **Quoteflow** on.
6. Try a prompt below. When Claude asks to use a Quoteflow tool, click **Allow**.

Team and Enterprise plans: an organisation Owner adds the custom connector first. Claude Free supports one custom connector.

## Try these prompts

- Use Quoteflow to check my business profile, then draft a proposal for Acme Logistics (contact: Anita Rao, anita@acmelogistics.in) for a website redesign — discovery, UI design, development and launch. Budget around ₹2.5 lakh. Make it persuasive but concise.
- In Quoteflow, change QF-0003 to add a 10% discount and a 'Post-launch support' section, then publish it and give me the client link.
- Which of my Quoteflow proposals are still waiting on the client, and what's my win rate?

## How it works

```
Claude (customer's) ──MCP/Streamable HTTP──▶ /api/mcp/[token] ──▶ service layer ──▶ Postgres ◀── Next.js UI / public link
```

The web app and the MCP tools both call `src/lib/proposals/service.ts`. There is no second copy of the database logic.

## No AI inside

Quoteflow does not call an AI provider. Your own Claude does the writing. This command must return nothing:

```bash
grep -riE "openai|anthropic-ai|@ai-sdk|langchain|generative-ai|groq|OPENAI_API_KEY|ANTHROPIC_API_KEY" src package.json
```

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, Neon Postgres, Vercel. Auth is an httpOnly session cookie. The connector is a stateless MCP Streamable HTTP endpoint (`mcp-handler`).

## Local setup

Node 20 or newer. Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL` — Neon Postgres connection string
- `SESSION_SECRET` — at least 32 characters
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` locally
- `DEMO_MCP_TOKEN` — the demo account's connector token

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

MCP Inspector: connect to `http://localhost:3000/api/mcp/<DEMO_MCP_TOKEN>` with Streamable HTTP. No session header is required.

`npm run test` checks the totals math. `npm run typecheck` and `npm run lint` should both pass.

## Design decisions and trade-offs

The connector is a private token in the URL, not OAuth. It is revocable from Settings and works with Claude's "No sign in" option. OAuth is the next step when a directory listing needs it.

Two editors can save the same proposal. The last save wins. If Claude changes a proposal while you have unsaved edits, the editor asks you to load the latest version or keep yours.

Totals are computed on the server from the line items, discount, and tax. Claude cannot submit a precomputed total.

## Roadmap

OAuth for the connector, email sending and reminders, Stripe or Razorpay deposit collection on acceptance, proposal templates, team seats, and turning an accepted proposal into an invoice.
