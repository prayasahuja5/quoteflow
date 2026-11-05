import { AppSidebar } from "@/components/app-sidebar";
import { requireUser } from "@/lib/auth/session";

function recentlyConnected(lastMcpCallAt: Date | null) {
  if (!lastMcpCallAt) return false;
  return Date.now() - lastMcpCallAt.getTime() < 24 * 60 * 60 * 1000;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const connected = recentlyConnected(user.lastMcpCallAt);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          connected,
        }}
      />
      <div className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
