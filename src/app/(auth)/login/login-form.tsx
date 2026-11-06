"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, type AuthState } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};
const DEMO_EMAIL = "demo@quoteflow.app";
const DEMO_PASSWORD = "Quoteflow@2026";

export function LoginForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState(login, initial);
  const [email, setEmail] = useState(demo ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(demo ? DEMO_PASSWORD : "");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 text-sm text-zinc-500">Open your proposals, or connect Claude.</p>
        <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-3 text-sm text-indigo-900">
          <p className="font-medium">Reviewing this app? Use the demo account</p>
          <p className="mt-1 text-indigo-800">
            Email: <span className="font-mono">{DEMO_EMAIL}</span>
            <br />
            Password: <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-8 bg-white"
            onClick={() => {
              setEmail(DEMO_EMAIL);
              setPassword(DEMO_PASSWORD);
            }}
          >
            Fill demo login
          </Button>
        </div>
        <form action={action} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
          <Button type="submit" className="h-9 w-full" disabled={pending}>
            {pending ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-zinc-500">
          New to Quoteflow?{" "}
          <Link href="/signup" className="font-medium text-indigo-700 hover:text-indigo-800">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
