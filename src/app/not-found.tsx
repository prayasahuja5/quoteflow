import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">This page is not available</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        The proposal may still be a draft, or the link is no longer valid.
      </p>
      <Button className="mt-6 h-9" render={<Link href="/" />}>
        Back to Quoteflow
      </Button>
    </main>
  );
}
