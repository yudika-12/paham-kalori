import { Hono } from "hono";
import { ProfileRepository } from "../repositories/profile.repository";
import { isAppError, errorMessage } from "@pk/core";

export const onboardingRoutes = new Hono<{ Variables: { userId: string } }>();

const profiles = new ProfileRepository();

onboardingRoutes.get("/", async (c) => {
  try {
    const userId = c.get("userId") as string;
    const list = await profiles.listByUser(userId);
    return c.json({
      profiles: list.map((p) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        height: p.height,
        weight: p.weight,
        goal: p.goal,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e, "Terjadi kesalahan.") }, { status } as never);
  }
});
