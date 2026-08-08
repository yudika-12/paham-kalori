import { Hono } from "hono";
import { AuthService } from "../services/auth.service";

export const authRoutes = new Hono();
authRoutes.post("/check-email", async (c) => {
  try {
    const { email } = await c.req.json<{ email?: string }>();
    if (!email) {
      return c.json({ exists: false }, 400 as never);
    }
    const exists = await new AuthService().emailExists(email);
    return c.json({ exists });
  } catch {
    return c.json({ error: "Terjadi kesalahan." }, 500 as never);
  }
});