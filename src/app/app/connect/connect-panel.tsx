"use client";

import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMcpStatusAction, regenerateMcpTokenAction } from "@/app/app/actions";
import { CopyButton } from "@/components/copy-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXAMPLE_PROMPTS } from "@/lib/prompts";

export function ConnectPanel({
  appUrl,
  initialToken,
  initialLastCall,
}: {
  appUrl: string;
  initialToken: string;
  initialLastCall: string | null;
}) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [lastCall, setLastCall] = useState(initialLastCall);
  const [pending, setPending] = useState(false);
  const link = `${appUrl}/api/mcp/${token}`;
  const connected = Boolean(lastCall);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const next = await getMcpStatusAction();
      if (!next.ok) return;
      setLastCall(next.data.lastMcpCallAt);
      if (next.data.lastMcpCallAt !== lastCall) router.refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [lastCall, router]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Your private MCP link</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={link} aria-label="Private MCP link" className="font-mono text-xs" />
          <CopyButton value={link} label="Copy" />
        </div>
        <p className="mt-3 text-sm text-amber-800">
          Anyone with this link can create and read proposals in your account. Keep it private.
        </p>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" className="mt-4" />}>
            Regenerate link
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate your MCP link?</AlertDialogTitle>
              <AlertDialogDescription>
                The current link stops working immediately. You will need to paste the new one into Claude.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  const result = await regenerateMcpTokenAction();
                  setPending(false);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  setToken(result.data.token);
                  toast.success("New link ready. The old one no longer works.");
                  router.refresh();
                }}
              >
                {pending ? "Regenerating…" : "Regenerate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Connection status</h2>
        <p className={connected ? "mt-2 text-sm text-emerald-700" : "mt-2 text-sm text-amber-800"}>
          {connected && lastCall
            ? `Claude last connected: ${formatDistanceToNow(new Date(lastCall), { addSuffix: true })}`
            : "Not connected yet"}
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Steps to connect</h2>
        <p className="mt-1 text-sm text-zinc-500">claude.ai web or desktop</p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-zinc-700">
          <li>Open Claude → <strong>Customize</strong> (or <strong>Settings</strong>) → <strong>Connectors</strong>.</li>
          <li>Click <strong>+ Add</strong> → <strong>Add custom connector</strong>.</li>
          <li>Name: <strong>Quoteflow</strong>. Remote MCP server URL: paste your link. Click <strong>Continue</strong> / <strong>Add</strong>.</li>
          <li>If asked about authentication, choose <strong>No sign in</strong>. Your private link already identifies you.</li>
          <li>In a new chat, click <strong>+</strong> → <strong>Connectors</strong> and make sure <strong>Quoteflow</strong> is toggled on.</li>
          <li>Try one of the prompts below. When Claude asks for permission to use a Quoteflow tool, click <strong>Allow</strong>.</li>
        </ol>
        <p className="mt-4 text-xs text-zinc-500">
          Team/Enterprise plans: an organisation Owner must add the custom connector first. Claude Free supports one custom connector.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Try these prompts</h2>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <div key={prompt} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm leading-6 text-zinc-700">{prompt}</p>
            <CopyButton value={prompt} label="Copy prompt" className="mt-3" />
          </div>
        ))}
      </section>
    </div>
  );
}
