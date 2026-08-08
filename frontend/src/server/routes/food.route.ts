import { Hono } from "hono";
import { NutritionService } from "../services/nutrition.service";
import { requireProfile } from "../middleware/require-profile";
import { isAppError, errorMessage } from "@pk/core";

export const foodRoutes = new Hono<{ Variables: { userId: string } }>();

const nutrition = new NutritionService();

foodRoutes.get("/", async (c) => {
  try {
    const profileId = c.req.query("profileId");
    if (!profileId) {
      return c.json({ error: "profileId wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    await requireProfile(profileId, userId);
    const from = c.req.query("from");
    const to = c.req.query("to");
    const entries = await nutrition.list(
      profileId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );
    return c.json({ entries });
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e) }, { status } as never);
  }
});

foodRoutes.post("/estimate", async (c) => {
  try {
    const { profileId, name } = await c.req.json();
    if (!profileId || !name) {
      return c.json({ error: "profileId dan nama makanan wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const profile = await requireProfile(profileId, userId);
    const analysis = await nutrition.estimateByName(profile, name);
    return c.json({ analysis });
  } catch (e) {
    console.error("Food estimate error:", errorMessage(e, "unknown"));
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e, "Gagal memperbarui perkiraan kalori.") }, { status } as never);
  }
});

foodRoutes.post("/", async (c) => {
  try {
    const { profileId, image, mealType } = await c.req.json();
    if (!profileId || !image) {
      return c.json({ error: "profileId dan foto wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const profile = await requireProfile(profileId, userId);
    const result = await nutrition.analyze(profile, image, mealType);
    return c.json(result);
  } catch (e) {
    console.error("Food analysis error:", errorMessage(e, "unknown"));
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e, "Gagal menganalisis.") }, { status } as never);
  }
});

foodRoutes.delete("/", async (c) => {
  try {
    const id = c.req.query("id");
    if (!id) {
      return c.json({ error: "id wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const result = await nutrition.deleteEntry(userId, id);
    return c.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e) }, { status } as never);
  }
});

foodRoutes.patch("/", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.id) {
      return c.json({ error: "id wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const entry = await nutrition.updateEntry(userId, body.id, body);
    return c.json({ entry });
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e, "Gagal memperbarui entri.") }, { status } as never);
  }
});