"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { resetDemoAction, updateProfileAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/lib/proposals/format";
import type { BusinessProfileDTO } from "@/lib/proposals/service";

export function SettingsForm({
  profile,
  accountName,
  accountEmail,
  demo,
}: {
  profile: BusinessProfileDTO;
  accountName: string;
  accountEmail: string;
  demo: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"save" | "reset" | null>(null);
  const [color, setColor] = useState(profile.brandColor);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Defaults Claude uses when you leave a field blank.</p>
      </div>
      <form
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending("save");
          const result = await updateProfileAction({
            businessName: form.get("businessName"),
            tagline: form.get("tagline"),
            about: form.get("about"),
            contactEmail: form.get("contactEmail"),
            defaultCurrency: form.get("defaultCurrency"),
            defaultTaxPercent: form.get("defaultTaxPercent"),
            defaultPaymentTerms: form.get("defaultPaymentTerms"),
            defaultValidityDays: form.get("defaultValidityDays"),
            brandColor: color,
          });
          setPending(null);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Settings saved");
          router.refresh();
        }}
      >
        <Field id="businessName" label="Business name" defaultValue={profile.businessName} required />
        <Field id="tagline" label="Tagline" defaultValue={profile.tagline ?? ""} />
        <div className="space-y-1.5">
          <Label htmlFor="about">About</Label>
          <Textarea id="about" name="about" defaultValue={profile.about ?? ""} rows={4} />
        </div>
        <Field id="contactEmail" label="Contact email" type="email" defaultValue={profile.contactEmail ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="defaultCurrency">Default currency</Label>
            <select
              id="defaultCurrency"
              name="defaultCurrency"
              defaultValue={profile.defaultCurrency}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <Field id="defaultTaxPercent" label="Default tax %" defaultValue={String(profile.defaultTaxPercent)} required />
          <Field
            id="defaultValidityDays"
            label="Default validity (days)"
            defaultValue={String(profile.defaultValidityDays)}
            required
          />
          <div className="space-y-1.5">
            <Label htmlFor="brandColor">Brand colour</Label>
            <div className="flex items-center gap-2">
              <input
                id="brandColor"
                type="color"
                value={color}
                aria-label="Brand colour"
                onChange={(event) => setColor(event.target.value.toUpperCase())}
                className="size-9 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1"
              />
              <Input value={color} onChange={(event) => setColor(event.target.value)} className="font-mono" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="defaultPaymentTerms">Default payment terms</Label>
          <Textarea id="defaultPaymentTerms" name="defaultPaymentTerms" defaultValue={profile.defaultPaymentTerms ?? ""} rows={3} />
        </div>
        <Button type="submit" className="h-9" disabled={pending !== null}>
          {pending === "save" ? "Saving…" : "Save settings"}
        </Button>
      </form>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Name</dt>
            <dd>{accountName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Email</dt>
            <dd>{accountEmail}</dd>
          </div>
        </dl>
        {demo ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            disabled={pending !== null}
            onClick={async () => {
              setPending("reset");
              const result = await resetDemoAction();
              setPending(null);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Demo data reset");
              router.refresh();
            }}
          >
            {pending === "reset" ? "Resetting…" : "Reset demo data"}
          </Button>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  defaultValue,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}
