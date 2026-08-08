import { ProfileEntity, mealTypeForHour } from "@pk/core";
import { FoodRepository } from "../repositories/food.repository";
import { ProfileRepository } from "../repositories/profile.repository";
import { GeminiModel } from "../ai/gemini";
import { BadRequestError, NotFoundError, RateLimitError, AppError } from "@pk/core";
import { FoodAnalysis } from "@pk/core";

interface ImagePayload {
  mimeType: string;
  data: string;
}

export interface AnalyzeResult {
  analysis: FoodAnalysis;
  saved: unknown | null;
}

export class NutritionService {
  constructor(
    private readonly foods = new FoodRepository(),
    private readonly profiles = new ProfileRepository(),
    private readonly gemini = new GeminiModel()
  ) {}

  async list(profileId: string, from?: Date, to?: Date) {
    const entries =
      from && to
        ? await this.foods.listToday(profileId, from, to)
        : await this.foods.listByProfile(profileId);
    return entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }));
  }

  async analyze(
    profile: ProfileEntity,
    imageDataUrl: string,
    mealType?: string
  ): Promise<AnalyzeResult> {
    const img = NutritionService.extractImage(imageDataUrl);
    if (!img) throw new BadRequestError("Format foto tidak valid.");

    const model = this.gemini.generative({ temperature: 0.2 });
    const prompt = this.gemini.buildFoodPrompt(profile.toInput());
    let result;
    try {
      result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: img.mimeType, data: img.data } },
      ]);
    } catch (e) {
      throw NutritionService.toAppError(e, "Gagal menganalisis makanan.");
    }
    const analysis = this.gemini.parseFoodAnalysis(result.response.text());

    if (!analysis.name || analysis.name === "Tidak dapat dikenali" || !analysis.calories) {
      return { analysis, saved: null };
    }

    const saved = await this.foods.create({
      profileId: profile.id,
      name: analysis.name,
      calories: analysis.calories,
      protein: analysis.protein ?? null,
      carbs: analysis.carbs ?? null,
      fat: analysis.fat ?? null,
      fiber: analysis.fiber ?? null,
      sugar: analysis.sugar ?? null,
      sodium: analysis.sodium ?? null,
      iron: analysis.iron ?? null,
      vitaminC: analysis.vitaminC ?? null,
      mealType: mealType || mealTypeForHour(new Date().getHours()),
      note: analysis.note ?? null,
      image: imageDataUrl,
    });

    return {
      analysis,
      saved: { ...saved, createdAt: saved.createdAt.toISOString() },
    };
  }

  async updateEntry(userId: string, id: string, input: Partial<{
    name: string;
    calories: number;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
    iron: number | null;
    vitaminC: number | null;
    mealType: string;
  }>) {
    const existing = await this.foods.findById(id);
    if (!existing) throw new NotFoundError("Entri tidak ditemukan.");
    await this.assertOwned(userId, existing.profileId);

    const updated = await this.foods.update(id, {
      name: input.name !== undefined ? input.name : existing.name,
      calories: input.calories !== undefined ? Number(input.calories) : existing.calories,
      protein: input.protein !== undefined ? Number(input.protein) : existing.protein,
      carbs: input.carbs !== undefined ? Number(input.carbs) : existing.carbs,
      fat: input.fat !== undefined ? Number(input.fat) : existing.fat,
      fiber: input.fiber !== undefined ? Number(input.fiber) : existing.fiber,
      sugar: input.sugar !== undefined ? Number(input.sugar) : existing.sugar,
      sodium: input.sodium !== undefined ? Number(input.sodium) : existing.sodium,
      iron: input.iron !== undefined ? Number(input.iron) : existing.iron,
      vitaminC: input.vitaminC !== undefined ? Number(input.vitaminC) : existing.vitaminC,
      mealType: input.mealType !== undefined ? input.mealType : existing.mealType ?? undefined,
    });

    return { ...updated, createdAt: updated.createdAt.toISOString() };
  }

  async estimateByName(profile: ProfileEntity, name: string): Promise<FoodAnalysis> {
    const cleaned = name.trim();
    if (!cleaned) throw new BadRequestError("Nama makanan wajib diisi.");

    const model = this.gemini.generative({ temperature: 0.2 });
    const prompt = this.gemini.buildFoodNamePrompt(profile.toInput(), cleaned);
    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (e) {
      throw NutritionService.toAppError(e, "Gagal memperbarui perkiraan kalori.");
    }
    return this.gemini.parseFoodAnalysis(result.response.text());
  }

  async deleteEntry(userId: string, id: string) {
    const existing = await this.foods.findById(id);
    if (!existing) throw new NotFoundError("Entri tidak ditemukan.");
    await this.assertOwned(userId, existing.profileId);
    await this.foods.remove(id);
    return { ok: true };
  }

  async analyzeToday(profile: ProfileEntity): Promise<{ analysis: string }> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const entries = await this.foods.listToday(profile.id, start, end);
    if (!entries.length) {
      throw new BadRequestError("Belum ada catatan makanan hari ini.");
    }

    const totals = entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + (e.protein ?? 0),
        carbs: acc.carbs + (e.carbs ?? 0),
        fat: acc.fat + (e.fat ?? 0),
        fiber: acc.fiber + (e.fiber ?? 0),
        sugar: acc.sugar + (e.sugar ?? 0),
        sodium: acc.sodium + (e.sodium ?? 0),
        iron: acc.iron + (e.iron ?? 0),
        vitaminC: acc.vitaminC + (e.vitaminC ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, iron: 0, vitaminC: 0 }
    );

    const summary = [
      `Kalori: ${totals.calories} kkal`,
      `Karbohidrat: ${totals.carbs} g`,
      `Protein: ${totals.protein} g`,
      `Lemak: ${totals.fat} g`,
      `Serat: ${totals.fiber} g`,
      `Gula: ${totals.sugar} g`,
      `Natrium: ${totals.sodium} mg`,
      `Zat Besi: ${totals.iron} mg`,
      `Vitamin C: ${totals.vitaminC} mg`,
      `Makanan: ${entries.map((e) => `${e.name} (${e.calories} kkal)`).join(", ")}`,
    ].join("\n");

    const model = this.gemini.generative({ temperature: 0.7, json: false });
    const prompt = this.gemini.buildNutritionAnalysisPrompt(profile.toInput(), summary);
    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (e) {
      throw NutritionService.toAppError(e, "Gagal menganalisis makronutrien.");
    }
    const analysis = this.gemini.cleanMarkdown(result.response.text().trim());
    return { analysis };
  }

  private async assertOwned(userId: string, profileId: string) {
    const owned = await this.profiles.findOwnedById(profileId, userId);
    if (!owned) throw new NotFoundError("Bukan punyamu.");
  }

  private static extractImage(dataUrl: string): ImagePayload | null {
    const idx = dataUrl.indexOf(";base64,");
    if (idx < 0 || !dataUrl.startsWith("data:")) return null;
    const mimeType = dataUrl.slice(5, idx);
    const data = dataUrl.slice(idx + ";base64,".length);
    if (!mimeType || !data) return null;
    return { mimeType, data };
  }

  private static toAppError(e: unknown, fallback: string): AppError {
    const status = (e as { status?: number }).status;
    const message = new GeminiModel().errorMessage(e);
    if (status === 429) return new RateLimitError(message);
    return new BadRequestError(status === 403 ? message : `${fallback} ${message}`);
  }
}