import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth";
import { authRoutes } from "./routes/auth.route";
import { registerRoutes } from "./routes/register.route";
import { onboardingRoutes } from "./routes/onboarding.route";
import { foodRoutes } from "./routes/food.route";
import { metricsRoutes } from "./routes/metrics.route";
import { chatRoutes } from "./routes/chat.route";
import { nutritionRoutes } from "./routes/nutrition.route";
import { isAppError, errorMessage } from "@pk/core";

export const app = new Hono<{ Variables: { userId: string } }>();

// Health check
app.get("/health", (c) => c.text("ok"));

// CORS (untuk frontend bila dipanggil lintas origin)
app.use("*", async (c, next) => {
  const origin = process.env.FRONTEND_URL || "http://localhost:3000";
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  c.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }
  await next();
});

// Public endpoints
app.route("/api/auth", authRoutes);
app.route("/api/register", registerRoutes);

// Protected endpoints
app.use("/api/onboarding/*", authMiddleware);
app.use("/api/food/*", authMiddleware);
app.use("/api/metrics/*", authMiddleware);
app.use("/api/chat/*", authMiddleware);
app.use("/api/nutrition/*", authMiddleware);
app.route("/api/onboarding", onboardingRoutes);
app.route("/api/food", foodRoutes);
app.route("/api/metrics", metricsRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/nutrition", nutritionRoutes);

app.onError((err, c) => {
  console.error("API error:", err);
  const status = isAppError(err) ? err.statusCode : 500;
  return c.json({ error: errorMessage(err) }, { status } as never);
});

app.notFound((c) => c.json({ error: "Tidak ditemukan." }, 404 as never));