"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        Quoteflow could not load this page. Your proposals are still saved.
      </p>
      <Button className="mt-6 h-9" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
