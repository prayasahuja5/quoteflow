import { ConnectPanel } from "@/app/app/connect/connect-panel";
import { requireUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connect Claude</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your Claude writes the proposal. Quoteflow stores it, hosts the link, and tracks the signature.
        </p>
      </div>
      {params.welcome === "1" ? (
        <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          You&apos;re in! Connect your Claude to start.
        </p>
      ) : null}
      <ConnectPanel
        appUrl={env.NEXT_PUBLIC_APP_URL}
        initialToken={user.mcpToken}
        initialLastCall={user.lastMcpCallAt ? user.lastMcpCallAt.toISOString() : null}
      />
    </div>
  );
}
