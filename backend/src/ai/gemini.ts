import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { ProfileInput, FoodAnalysis, cleanMarkdown as cleanMarkdownUtil } from "@pk/core";

export const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

export interface GeminiModelOptions {
  systemInstruction?: string;
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export class GeminiModel {
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey = process.env.GEMINI_API_KEY || "") {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  generative(options: GeminiModelOptions = {}) {
    return this.client.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        ...(options.maxOutputTokens != null ? { maxOutputTokens: options.maxOutputTokens } : {}),
        ...(options.json === false ? {} : { responseMimeType: "application/json" }),
      },
      systemInstruction: options.systemInstruction,
      safetySettings: GeminiModel.safety(),
    });
  }

  buildFoodPrompt(profile: ProfileInput): string {
    return `
Kamu adalah ahli gizi. Lihat foto makanan yang dikirim user, identifikasi makanan & estimasi kalori dan makronutrien secara akurat dalam Bahasa Indonesia.

Profil user (untuk menyesuaikan porsi/wajar):
- Umur: ${profile.age} tahun
- Gender: ${profile.gender}
- Tinggi: ${profile.height} cm
- Berat: ${profile.weight} kg
- Tujuan: ${profile.goal}

ATURAN:
1. Identifikasi makanan utama yang terlihat. Jika foto mengandung beberapa hidangan, jumlahkan estimasinya dalam satu entri.
2. Perkirakan porsi dari foto (misal 1 piring nasi = ~150g, 1 potong ayam goreng, 1 gelas = 250ml).
3. Gunakan nilai kalori & makronutrien yang masuk akal untuk makanan Indonesia.
4. Tentukan jenis waktu makan (mealType) hanya salah satu dari: "Sarapan", "Makan siang", "Makan malam".
5. Jika foto tidak jelas atau bukan makanan, set "name": "Tidak dapat dikenali" dan "calories": 0, serta beri "note" penjelasan singkat.
6. Sesuaikan perkiraan kalori dengan tujuan user: "lose" = tunjukkan estimasi yang wajar dan tidak menyesatkan.
7. Sertakan estimasi mikronutrien dengan satuan berikut: serat & gula dalam gram, natrium dalam miligram, zat besi & vitamin C dalam miligram. Gunakan nilai wajar (misal nasi putih serat ~1g, gorengan natrium ~300-600mg).

Format JSON yang HARUS diikuti (hanya JSON, tanpa teks lain):
{
  "name": "Nama makanan",
  "calories": 350,
  "protein": 15,
  "carbs": 45,
  "fat": 12,
  "fiber": 4,
  "sugar": 3,
  "sodium": 450,
  "iron": 2,
  "vitaminC": 8,
  "mealType": "Makan siang",
  "note": "catatan singkat ramah (1 kalimat)"
}
`;
  }

  buildFoodNamePrompt(profile: ProfileInput, name: string): string {
    return `
Kamu adalah ahli gizi. Berikan estimasi kalori & makronutrien untuk nama makanan berikut yang dicatat user: "${name}".

Profil user (untuk menyesuaikan porsi/wajar):
- Umur: ${profile.age} tahun
- Gender: ${profile.gender}
- Tinggi: ${profile.height} cm
- Berat: ${profile.weight} kg
- Tujuan: ${profile.goal}

ATURAN:
1. Perkirakan porsi wajar sesuai nama makanan (misal 1 piring nasi = ~150g, 1 potong ayam goreng, 1 gelas = 250ml).
2. Gunakan nilai kalori & makronutrien yang masuk akal untuk makanan Indonesia.
3. Jika nama makanan tidak jelas atau bukan makanan, set "name": "Tidak dapat dikenali" dan "calories": 0, serta beri "note" penjelasan singkat.
4. Tentukan jenis waktu makan (mealType) hanya salah satu dari: "Sarapan", "Makan siang", "Makan malam".
5. Sertakan estimasi mikronutrien dengan satuan berikut: serat & gula dalam gram, natrium dalam miligram, zat besi & vitamin C dalam miligram. Gunakan nilai wajar (misal nasi putih serat ~1g, gorengan natrium ~300-600mg).

Format JSON yang HARUS diikuti (hanya JSON, tanpa teks lain):
{
  "name": "Nama makanan",
  "calories": 350,
  "protein": 15,
  "carbs": 45,
  "fat": 12,
  "fiber": 4,
  "sugar": 3,
  "sodium": 450,
  "iron": 2,
  "vitaminC": 8,
  "mealType": "Makan siang",
  "note": "catatan singkat ramah (1 kalimat)"
}
`;
  }

  buildChatInstruction(profile: ProfileInput, todaySummary: string): string {
    return `Kamu adalah "Buddy", AI nutrition coach yang ramah, hangat, dan sabar.
Gunakan Bahasa Indonesia santai dan menyemangati. Panggil user dengan nada akrab tapi tetap sopan. Jangan pernah menilai atau menyalahkan.
Fokus utamamu: membantu user memahami kalori, memilih makanan sehat, dan menjaga pola makan dengan cara yang menyenangkan.
Saat merekomendasikan makanan, UTAMAKAN makanan Indonesia dahulu (mis. nasi, tempe, tahu, ayam, ikan, sayur, sambal, buah lokal), baru beri alternatif lain bila diminta.

PROFIL USER:
- Umur ${profile.age}, ${profile.gender}, ${profile.height} cm, ${profile.weight} kg
- Tujuan: ${profile.goal}

KONDISI HARI INI:
${todaySummary}

PANDUAN:
1. Jawab dengan ramah, hangat, dan to the point, SINGKAT (maksimal ~60-80 kata).
2. Langsung ke jawaban inti tanpa basa-basi. Pakai 1-2 kalimat utama lalu diikuti saran singkat bila perlu.
3. JANGAN gunakan markdown sama sekali: tanpa tanda bintang ganda (**), tanpa asterisk (*), tanpa tanda backtick, tanpa tanda #. Tulis teks polos.
4. Jika user bertanya soal kalori, bantu hitung/perkirakan dengan jujur dalam bentuk angka singkat.
5. Kamu juga boleh membantu topik umum lain (resep, olahraga, kebiasaan sehat, rekomendasi sehari-hari) selama masih relevan dengan gaya hidup sehat. Tetap ramah, singkat, dan to the point.
6. Jangan pernah menyarankan diet ekstrem, obat, atau suplemen tanpa bukti.
7. Jika user bertanya tentang masalah kesehatan serius: sarankan konsultasi dokter/ahli gizi.
8. Gunakan emoji secukupnya (maksimal 1-2) untuk membuat suasana ceria.`;
  }

  buildNutritionAnalysisPrompt(profile: ProfileInput, summary: string): string {
    return `
Kamu adalah ahli gizi di aplikasi "Paham Kalori". Analisa asupan makronutrien user hari ini secara singkat dan ramah.

PROFIL USER:
- Umur ${profile.age}, ${profile.gender}, ${profile.height} cm, ${profile.weight} kg
- Tujuan: ${profile.goal}

ASUPAN HARI INI (total):
${summary}

TUGAS:
1. Beri analisa 2-3 kalimat dalam Bahasa Indonesia, hangat dan singkat.
2. Jika ada makronutrien yang TINGGI/berlebihan atau sangat rendah, sebut dengan ramah lalu beri 1 saran praktis (contoh makanan pengganti atau saran porsi).
3. Jika keseimbangan makro sudah baik, beri pujian singkat dan tetap semangati.
4. JANGAN gunakan markdown sama sekali: tanpa bintang (** atau *), tanpa #, tanpa backtick. Tulis teks polos.
5. Gunakan emoji secukupnya.`;
  }

  parseFoodAnalysis(text: string): FoodAnalysis {
    try {
      const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(cleaned) as FoodAnalysis;
      if (!parsed.name) throw new Error("empty");
      const items = Array.isArray(parsed.items)
        ? parsed.items
            .map((it) => ({
              name: String(it.name ?? "").trim(),
              quantity: it.quantity != null ? String(it.quantity) : undefined,
              calories: Number(it.calories) || 0,
              protein: it.protein != null ? Number(it.protein) : undefined,
              carbs: it.carbs != null ? Number(it.carbs) : undefined,
              fat: it.fat != null ? Number(it.fat) : undefined,
              fiber: it.fiber != null ? Number(it.fiber) : undefined,
              sugar: it.sugar != null ? Number(it.sugar) : undefined,
              sodium: it.sodium != null ? Number(it.sodium) : undefined,
              iron: it.iron != null ? Number(it.iron) : undefined,
              vitaminC: it.vitaminC != null ? Number(it.vitaminC) : undefined,
            }))
            .filter((it) => it.name.length > 0)
        : undefined;
      return {
        name: parsed.name,
        calories: Number(parsed.calories) || 0,
        protein: parsed.protein != null ? Number(parsed.protein) : undefined,
        carbs: parsed.carbs != null ? Number(parsed.carbs) : undefined,
        fat: parsed.fat != null ? Number(parsed.fat) : undefined,
        fiber: parsed.fiber != null ? Number(parsed.fiber) : undefined,
        sugar: parsed.sugar != null ? Number(parsed.sugar) : undefined,
        sodium: parsed.sodium != null ? Number(parsed.sodium) : undefined,
        iron: parsed.iron != null ? Number(parsed.iron) : undefined,
        vitaminC: parsed.vitaminC != null ? Number(parsed.vitaminC) : undefined,
        mealType: parsed.mealType ?? "Makan siang",
        note: parsed.note,
        items: items && items.length > 0 ? items : undefined,
      };
    } catch {
      throw new Error("Gagal memproses respons AI, coba lagi.");
    }
  }

  errorMessage(e: unknown): string {
    const err = e as { status?: number; message?: string };
    if (err?.status === 429) {
      return "Kuota Gemini hari ini sudah habis. Coba lagi besok, atau cek paket/billing di ai.google.dev.";
    }
    if (err?.status === 403) {
      return "GEMINI_API_KEY tidak valid atau tidak berizin. Periksa kembali kunci API-nya.";
    }
    if (err?.status === 400 || err?.status === 404) {
      return "Permintaan ke Gemini ditolak (model/format tidak valid).";
    }
    if (e instanceof Error && e.message.includes("Gagal memproses")) {
      return e.message;
    }
    return "Gagal memproses. Periksa koneksi internet dan GEMINI_API_KEY.";
  }

  cleanMarkdown(text: string): string {
    return cleanMarkdownUtil(text);
  }

  private static safety() {
    return [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
  }
}

export const geminiModel = new GeminiModel();