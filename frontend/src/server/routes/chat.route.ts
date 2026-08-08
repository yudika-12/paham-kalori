import { Hono } from "hono";
import { ChatService } from "../services/chat.service";
import { requireProfile } from "../middleware/require-profile";
import { isAppError, errorMessage } from "@pk/core";

export const chatRoutes = new Hono<{ Variables: { userId: string } }>();

const chat = new ChatService();

function escapeSSE(data: string): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

chatRoutes.get("/", async (c) => {
  try {
    const profileId = c.req.query("profileId");
    if (!profileId) {
      return c.json({ error: "profileId wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const profile = await requireProfile(profileId, userId);
    const messages = await chat.listMessages(profile.id);
    return c.json({ messages });
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e, "Terjadi kesalahan.") }, { status } as never);
  }
});

chatRoutes.post("/", async (c) => {
  try {
    const { profileId, message } = await c.req.json();
    if (!profileId || !message) {
      return c.json({ error: "profileId dan pesan wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const profile = await requireProfile(profileId, userId);
    const stream = await chat.streamReply(profile, message);
    return new Response(stream, { headers: SSE_HEADERS });
  } catch (e) {
    console.error("Chat error:", e);
    const messageText = isAppError(e)
      ? errorMessage(e)
      : String((e as Error).message) || "Maaf, terjadi kendala. Coba lagi ya.";
    return new Response(escapeSSE(messageText), {
      status: 200,
      headers: SSE_HEADERS,
    });
  }
});

chatRoutes.delete("/", async (c) => {
  try {
    const profileId = c.req.query("profileId");
    if (!profileId) {
      return c.json({ error: "profileId wajib." }, 400 as never);
    }
    const userId = c.get("userId") as string;
    const profile = await requireProfile(profileId, userId);
    const result = await chat.clear(profile.id);
    return c.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    return c.json({ error: errorMessage(e) }, { status } as never);
  }
});