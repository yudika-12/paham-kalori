import { Hono } from "hono";
import { NutritionService } from "../services/nutrition.service";
import { requireProfile } from "../middleware/require-profile";
import { isAppError, errorMessage } from "@pk/core";

export const nutritionRoutes = new Hono<{ Variables: { userId: string } }>();

const nutrition = new NutritionService();

nutritionRoutes.post("/analyze", async (c) => {
  try {
    const { profileId } = await c.req.json();
    if (!profileId) {
      return c.json({ error: "profileId wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const profile = await requireProfile(profileId, userId);
    const result = await nutrition.analyzeToday(profile);
    return c.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e, "Gagal menganalisis makronutrien.") }, { status } as never);
  }
});
