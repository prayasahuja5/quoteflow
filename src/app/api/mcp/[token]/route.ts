import { createMcpHandler } from "mcp-handler";
import { findUserByMcpToken } from "@/lib/auth/mcp";
import { registerQuoteflowTools } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const user = await findUserByMcpToken(token);
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Invalid or revoked Quoteflow MCP link. Get your current link at /app/connect.",
      }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const handler = createMcpHandler(
    (server) => registerQuoteflowTools(server, { userId: user.id }),
    { serverInfo: { name: "quoteflow", version: "1.0.0" } },
  );
  return handler(req);
}

export { handle as GET, handle as POST, handle as DELETE };
