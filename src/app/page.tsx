import { FileText, Link2, PenLine, Sparkles, Unplug } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const steps = [
  {
    icon: Unplug,
    title: "Connect Claude",
    body: "Paste your private MCP link into Claude. No API key, and no AI bill from us.",
  },
  {
    icon: Sparkles,
    title: "Ask for a proposal",
    body: "Describe the client and the work in plain English. Claude writes the scope, the line items, and the terms.",
  },
  {
    icon: PenLine,
    title: "Edit, publish, get it signed",
    body: "Change anything, send a live link, see when it is opened, and collect a name as the signature.",
  },
];

const reasons = [
  {
    title: "Bring your own AI",
    body: "No AI markup and no AI keys. Your Claude, your data. Quoteflow only stores and tracks.",
  },
  {
    title: "A live link, not a PDF",
    body: "Clients open the proposal in the browser. You see the view, and they accept in one step.",
  },
  {
    title: "A real system of record",
    body: "Pipeline, win rate, and a history of every edit, view, and signature.",
  },
];

const faqs = [
  {
    q: "Does Quoteflow use AI?",
    a: "No. Your own Claude does the writing. Quoteflow stores the proposal, lets you edit it, hosts the client link, and tracks views and acceptance.",
  },
  {
    q: "Which Claude plans work?",
    a: "Any Claude plan that supports custom connectors, including Free with one custom connector.",
  },
  {
    q: "Is my data safe?",
    a: "Your proposals live in your Quoteflow account. The connector link is a private token. Regenerate it any time and the old link stops working. Quoteflow does not send your data to an AI provider. Your Claude only sees what its tools return.",
  },
  {
    q: "Can I edit what Claude writes?",
    a: "Yes. Everything Claude creates is a draft you can edit, including the words, the line items, and the price. Totals are recalculated when you save.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-zinc-600 sm:flex">
          <a href="#how-it-works" className="hover:text-zinc-950">How it works</a>
          <a href="#pricing" className="hover:text-zinc-950">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/login" />}>Log in</Button>
          <Button className="h-9" render={<Link href="/login?demo=1" />}>Try the live demo</Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <h1 className="font-instrument text-5xl leading-[1.05] tracking-tight text-zinc-950 sm:text-6xl">
              Your Claude writes the proposal. Quoteflow gets it signed.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
              Connect your own Claude in 60 seconds. Ask for a proposal in plain English. Edit it, send a live link, see when your client opens it, and get it accepted, all without any AI bill from us.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="h-10 px-4" render={<Link href="/signup" />}>Create an account</Button>
              <Button variant="outline" className="h-10 px-4" render={<Link href="/login?demo=1" />}>
                Try the live demo
              </Button>
            </div>
          </div>
          <HeroVisual />
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <step.icon className="size-5 text-indigo-600" />
                <p className="mt-4 text-xs font-medium text-zinc-400">0{index + 1}</p>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-8">
          <h2 className="text-2xl font-semibold tracking-tight">Why Quoteflow</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {reasons.map((reason) => (
              <article key={reason.title} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold">{reason.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{reason.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
          <p className="mt-2 text-sm text-zinc-500">Billing is not enabled in this demo.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <PriceCard name="Free" price="₹0" detail="3 published proposals a month." />
            <PriceCard name="Pro" price="₹499/month" detail="Unlimited proposals, custom brand colour, remove the Quoteflow footer. $9 internationally." featured />
            <PriceCard name="Team" price="₹1,499/month" detail="5 seats and a shared pipeline." />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8 pb-20">
          <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
          <Accordion className="mt-6">
            {faqs.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-6 py-8 text-center text-sm text-zinc-500">
        Built for the Volopay Founder&apos;s Office assignment.
      </footer>
    </div>
  );
}

function PriceCard({
  name,
  price,
  detail,
  featured = false,
}: {
  name: string;
  price: string;
  detail: string;
  featured?: boolean;
}) {
  return (
    <article className={`rounded-xl border bg-white p-5 shadow-sm ${featured ? "border-indigo-200 ring-1 ring-indigo-100" : "border-zinc-200"}`}>
      <h3 className="font-semibold">{name}</h3>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{price}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{detail}</p>
    </article>
  );
}

function HeroVisual() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-xl bg-zinc-50 p-4">
          <p className="text-xs font-medium text-zinc-400">Claude</p>
          <p className="mt-3 rounded-2xl rounded-tl-sm bg-white p-3 text-sm leading-6 text-zinc-700 shadow-sm">
            Draft a proposal for Acme Logistics. Website redesign: discovery, design, build. Budget around ₹2.5 lakh, valid for 2 weeks.
          </p>
        </div>
        <div className="hidden text-zinc-300 sm:block" aria-hidden>
          →
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <FileText className="size-4 text-indigo-600" />
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Accepted ✓
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold">Website redesign for Acme Logistics</p>
          <p className="mt-1 text-xs text-zinc-500">QF-0007 · Anita Rao</p>
          <p className="mt-4 text-right text-sm font-semibold tabular-nums">₹2,95,000.00</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-violet-700">
            <Link2 className="size-3" />
            Live client link
          </p>
        </div>
      </div>
    </div>
  );
}
