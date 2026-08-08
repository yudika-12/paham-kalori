import { Hono } from "hono";
import { AuthService } from "../services/auth.service";

export const authRoutes = new Hono();
authRoutes.post("/login", async (c) => {
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  if (!email || !password) {
    return c.json({ error: "Email dan password wajib." }, 400 as never);
  }

  const session = await new AuthService().login(email, password);
  if (!session) {
    return c.json({ error: "Email atau password salah." }, 401 as never);
  }
  return c.json(session);
});

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