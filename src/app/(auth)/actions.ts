"use server";

import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { businessProfiles, users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth/session";

export type AuthState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "businessName" | "email" | "password", string>>;
};

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  businessName: z.string().trim().min(1, "Enter your business name.").max(120),
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: AuthState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "businessName" || key === "email" || key === "password") {
        fieldErrors[key] ??= issue.message;
      }
    }
    return { fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists." } };
  }

  try {
    const passwordHash = await hash(parsed.data.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: parsed.data.name,
        mcpToken: `qf_${nanoid(32)}`,
      })
      .returning();
    if (!user) return { error: "Could not create the account. Try again." };

    await db.insert(businessProfiles).values({
      userId: user.id,
      businessName: parsed.data.businessName,
    });
    await createSession(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("duplicate key") || message.includes("23505")) {
      return { fieldErrors: { email: "An account with this email already exists." } };
    }
    return { error: "Could not create the account. Try again." };
  }

  redirect("/app/connect?welcome=1");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const matches = user ? await compare(password, user.passwordHash) : false;
  if (!user || !matches) return { error: "Email or password is incorrect" };

  await createSession(user.id);
  redirect("/app");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
