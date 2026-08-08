import { Hono } from "hono";
import { NutritionService } from "../services/nutrition.service";
import { MetricService } from "../services/metric.service";
import { requireProfile } from "../middleware/require-profile";
import { isAppError, errorMessage } from "@pk/core";

export const dashboardRoutes = new Hono<{ Variables: { userId: string } }>();

const nutrition = new NutritionService();
const metrics = new MetricService();

dashboardRoutes.get("/", async (c) => {
  try {
    const profileId = c.req.query("profileId");
    if (!profileId) {
      return c.json({ error: "profileId wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const profile = await requireProfile(profileId, userId);
    const from = c.req.query("from");
    const to = c.req.query("to");
    const [entries, metric] = await Promise.all([
      nutrition.list(
        profileId,
        from ? new Date(from) : undefined,
        to ? new Date(to) : undefined
      ),
      metrics.get(profile),
    ]);
    return c.json({ entries, metrics: metric, goal: profile.goal });
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e) }, { status } as never);
  }
});
