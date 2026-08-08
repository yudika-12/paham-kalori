import { Hono } from "hono";
import { MetricService } from "../services/metric.service";
import { requireProfile } from "../middleware/require-profile";
import { isAppError, errorMessage } from "@pk/core";

export const metricsRoutes = new Hono<{ Variables: { userId: string } }>();

const metrics = new MetricService();

metricsRoutes.get("/", async (c) => {
  try {
    const profileId = c.req.query("profileId");
    if (!profileId) {
      return c.json({ error: "profileId wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const profile = await requireProfile(profileId, userId);
    const result = await metrics.get(profile);
    return c.json({ metrics: result });
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e) }, { status } as never);
  }
});