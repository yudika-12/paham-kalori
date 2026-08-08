import { ProfileEntity } from "@pk/core";
import { ChatRepository } from "../repositories/chat.repository";
import { FoodRepository } from "../repositories/food.repository";
import { GeminiModel, MODEL } from "../ai/gemini";
import { RateLimitError, BadRequestError } from "@pk/core";

function escapeSSE(data: string): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export class ChatService {
  constructor(
    private readonly chats = new ChatRepository(),
    private readonly foods = new FoodRepository(),
    private readonly gemini = new GeminiModel()
  ) {}

  async listMessages(profileId: string) {
    const messages = await this.chats.listByProfile(profileId);
    return messages.map((c) => ({
      role: c.role,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async clear(profileId: string) {
    await this.chats.clearByProfile(profileId);
    return { ok: true };
  }

  async streamReply(profile: ProfileEntity, message: string): Promise<ReadableStream<Uint8Array>> {
    const { todaySummary } = await this.buildTodaySummary(profile);

    await this.chats.add(profile.id, "user", message);

    const history = await this.buildHistory(profile.id);

    let stream;
    try {
      stream = await this.gemini.run(async (m) => {
        const model = m.generative({
          systemInstruction: this.gemini.buildChatInstruction(profile.toInput(), todaySummary),
          json: false,
          temperature: 0.8,
          maxOutputTokens: 500,
        });
        const chat = model.startChat({ history });
        return chat.sendMessageStream(message);
      });
    } catch (e) {
      console.error("Chat sendMessageStream error:", this.gemini.errorMessage(e));
      const status = (e as { status?: number }).status;
      const msg = this.gemini.errorMessage(e);
      throw status === 429 ? new RateLimitError(msg) : new BadRequestError(msg);
    }

    const encoder = new TextEncoder();
    const gemini = this.gemini;
    const chats = this.chats;
    let fullText = "";

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const safeEnqueue = (data: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            closed = true;
          }
        };
        const safeClose = () => {
          if (closed) return;
          try {
            controller.close();
          } catch {
            closed = true;
          }
        };
        try {
          for await (const chunk of stream.stream) {
            if (closed) break;
            const blockReason = chunk.promptFeedback?.blockReason;
            if (blockReason) {
              fullText += "\n\nMaaf, jawaban ini diblokir oleh filter keamanan. Coba tanya dengan kalimat lain ya.";
              safeEnqueue(escapeSSE(fullText));
              break;
            }
            let text = "";
            try {
              text = chunk.text();
            } catch {
              continue;
            }
            if (text) {
              fullText += text;
              safeEnqueue(escapeSSE(text));
            }
          }
          if (fullText.trim() && !closed) {
            const cleaned = gemini.cleanMarkdown(fullText);
            await chats.add(profile.id, "assistant", cleaned);
          }
          safeEnqueue(`event: end\ndata: ${JSON.stringify({ model: MODEL })}\n\n`);
          safeClose();
        } catch (e) {
          console.error("Chat stream error:", e);
          safeEnqueue(escapeSSE("Maaf, terjadi kendala. Coba lagi ya."));
          safeClose();
        }
      },
    });
  }

  private async buildTodaySummary(profile: ProfileEntity) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const todayEntries = await this.foods.listToday(profile.id, start, end);
    const total = todayEntries.reduce((acc, e) => acc + e.calories, 0);
    const todaySummary = todayEntries.length
      ? todayEntries.length > 5
        ? `Total kalori hari ini: ${total} kkal dari ${todayEntries.length} makanan.`
        : `Total kalori hari ini: ${total} kkal dari ${todayEntries.length} makanan. ${todayEntries
            .map((e) => `${e.name} (${e.calories} kkal)`)
            .join(", ")}`
      : "Belum ada makanan tercatat hari ini. Beri saran yang ramah.";
    return { todayEntries, todaySummary };
  }

  private async buildHistory(profileId: string) {
    const recent = await this.chats.listRecent(profileId, 8);
    recent.reverse();
    return recent
      .map((c) => ({
        role: c.role === "user" ? "user" : "model",
        parts: [{ text: c.content }],
      }))
      .filter((item, i, arr) => {
        if (i === 0) return item.role === "user";
        if (i === arr.length - 1) return item.role !== "model";
        return true;
      });
  }
}