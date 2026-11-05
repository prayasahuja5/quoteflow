import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

const sqlClient = neon(env.DATABASE_URL);

export const db = drizzle(sqlClient, { schema });
