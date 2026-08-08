import { Context, Next } from "hono";
import { verifyTokenImpl } from "../auth/jwt";
import { UnauthorizedError } from "@pk/core";

const COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

function readToken(c: Context): string | undefined {
  const header = c.req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  const cookie = c.req.header("cookie") || "";
  for (const name of COOKIE_NAMES) {
    const match = cookie.match(new RegExp(`(?:^|;)\\s*${name}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}

export async function authMiddleware(c: Context, next: Next) {
  const token = readToken(c);
  if (!token) {
    return c.json({ error: "Belum login." }, 401 as never);
  }
  try {
    const payload = await verifyTokenImpl(token);
    const userId = payload.id ?? payload.sub;
    if (!userId) {
      throw new UnauthorizedError("Sesi tidak valid.");
    }
    c.set("userId", String(userId));
    await next();
  } catch {
    return c.json({ error: "Sesi tidak valid." }, 401 as never);
  }
}

export function requireProfileId(c: Context): string {
  return c.get("userId") as string;
}