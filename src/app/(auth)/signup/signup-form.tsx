"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthState } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-zinc-500">Then connect your own Claude. No AI key required.</p>
        <form action={action} className="mt-6 space-y-4">
          <Field id="name" label="Your name" error={state.fieldErrors?.name} autoComplete="name" />
          <Field
            id="businessName"
            name="businessName"
            label="Business name"
            error={state.fieldErrors?.businessName}
            autoComplete="organization"
          />
          <Field
            id="email"
            label="Email"
            type="email"
            error={state.fieldErrors?.email}
            autoComplete="email"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            error={state.fieldErrors?.password}
            autoComplete="new-password"
            minLength={8}
          />
          {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
          <Button type="submit" className="h-9 w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-700 hover:text-indigo-800">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  id,
  name,
  label,
  error,
  type = "text",
  autoComplete,
  minLength,
}: {
  id: string;
  name?: string;
  label: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name ?? id}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        aria-invalid={error ? true : undefined}
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
