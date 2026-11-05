import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AppError } from "@/lib/errors";

export async function findUserByMcpToken(token: string) {
  const [user] = await db.select().from(users).where(eq(users.mcpToken, token));
  return user ?? null;
}

export async function touchMcpCall(userId: string) {
  await db
    .update(users)
    .set({ lastMcpCallAt: new Date() })
    .where(eq(users.id, userId));
}

export async function regenerateMcpToken(userId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const mcpToken = `qf_${nanoid(32)}`;
    try {
      const [row] = await db
        .update(users)
        .set({ mcpToken })
        .where(eq(users.id, userId))
        .returning({ mcpToken: users.mcpToken });
      if (!row) throw new AppError("NOT_FOUND", "Account not found.");
      return row.mcpToken;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const duplicate = message.includes("duplicate key") || message.includes("23505");
      if (!duplicate || attempt === 2) throw error;
    }
  }

  throw new AppError("INVALID", "Could not regenerate the MCP link.");
}
