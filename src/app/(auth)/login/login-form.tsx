"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthState } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function LoginForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 text-sm text-zinc-500">Open your proposals, or connect Claude.</p>
        {demo ? (
          <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
            Demo account pre-filled
          </p>
        ) : null}
        <form action={action} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={demo ? "demo@quoteflow.app" : undefined}
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
              defaultValue={demo ? "Quoteflow@2026" : undefined}
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
