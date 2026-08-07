import { Hono } from "hono";
import { AuthService } from "../services/auth.service";
import { isAppError, errorMessage } from "@pk/core";

export const registerRoutes = new Hono();

registerRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { user, profile } = await new AuthService().register(body);
    return c.json({ userId: user.id, profileId: profile.id });
  } catch (e) {
    console.error("Register error:", e);
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e, "Gagal mendaftar.") }, { status } as never);
  }
});