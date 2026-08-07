import { FoodEntry } from "@pk/core";

export const MACRO_TARGETS = { carbs: 200, protein: 120, fat: 70 };
export const MACRO_COLORS = { carbs: "#f59e0b", protein: "#10b981", fat: "#6366f1" };

export const STREAK_MILESTONES = [
  { days: 3, label: "3 hari", reward: "Grafik 7 hari", emoji: "📊" },
  { days: 7, label: "1 minggu", reward: "Ringkasan mingguan", emoji: "🔥" },
  { days: 30, label: "1 bulan", reward: "Ringkasan bulanan", emoji: "🏆" },
  { days: 90, label: "3 bulan", reward: "Lencana Konsisten", emoji: "💪" },
  { days: 180, label: "6 bulan", reward: "Lencana Setia", emoji: "🥇" },
  { days: 365, label: "1 tahun", reward: "Lencana Legenda", emoji: "👑" },
];

export interface DayTotals {
  label: string;
  kalori: number;
  over: boolean;
  empty: boolean;
}

export function todayLabel(): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const day = days[new Date().getDay()];
  const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long" });
  return `${day}, ${date}`;
}

export function dayKey(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function consecutiveStreak(days: Set<number>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const cursor = days.has(today.getTime()) ? today : yesterday;
  let streak = 0;
  while (days.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function thisWeek(entries: FoodEntry[], target: number | null): DayTotals[] {
  const days: DayTotals[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const monday = new Date(now);
  const dow = (now.getDay() + 6) % 7;
  monday.setDate(now.getDate() - dow);
  const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    const sum = entries
      .filter((e) => {
        const t = new Date(e.createdAt).getTime();
        return t >= day.getTime() && t < end.getTime();
      })
      .reduce((a, e) => a + e.calories, 0);
    days.push({
      label: labels[i],
      kalori: sum,
      over: target ? sum > target : false,
      empty: sum === 0,
    });
  }
  return days;
}

export function thisMonth(entries: FoodEntry[], target: number | null): DayTotals[] {
  const days: DayTotals[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i);
    const end = new Date(year, month, i + 1);
    const sum = entries
      .filter((e) => {
        const t = new Date(e.createdAt).getTime();
        return t >= day.getTime() && t < end.getTime();
      })
      .reduce((a, e) => a + e.calories, 0);
    days.push({
      label: String(i),
      kalori: sum,
      over: target ? sum > target : false,
      empty: sum === 0,
    });
  }
  return days;
}

export interface MacroState {
  carbs: number;
  protein: number;
  fat: number;
}

export function nutritionGrade(macs: {
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}) {
  const protein = macs.protein ?? 0;
  const carbs = macs.carbs ?? 0;
  const fat = macs.fat ?? 0;
  const fiber = macs.fiber ?? 0;
  const sugar = macs.sugar ?? 0;
  const sodium = macs.sodium ?? 0;

  const proteinPts = protein >= 20 ? 20 : protein >= 15 ? 15 : protein >= 8 ? 10 : protein >= 4 ? 5 : 0;
  const carbPts =
    carbs >= 20 && carbs <= 50 ? 15 : carbs <= 70 ? 12 : carbs <= 100 ? 8 : carbs > 100 ? 4 : 12;
  const fatPts = fat >= 5 && fat <= 15 ? 15 : fat <= 25 ? 10 : fat <= 35 ? 5 : fat > 35 ? 0 : 10;
  const fiberPts = fiber >= 10 ? 10 : fiber >= 5 ? 7 : fiber >= 3 ? 5 : fiber >= 1 ? 2 : 0;

  const makroPts = proteinPts + carbPts + fatPts + fiberPts;

  const gulaPts = sugar <= 5 ? 10 : sugar <= 15 ? 7 : sugar <= 25 ? 5 : sugar <= 40 ? 2 : 0;
  const natriumPts = sodium <= 200 ? 10 : sodium <= 400 ? 7 : sodium <= 700 ? 5 : sodium <= 1000 ? 2 : 0;

  const mikroPts = gulaPts + natriumPts;
  const mikroWeighted = Math.round((mikroPts / 20) * 40);

  const score = Math.round(makroPts + mikroWeighted);
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "E";
  return { score, grade };
}

export function macroInsight(macros: MacroState): { emoji: string; text: string; kind: "ok" | "short" | "over" } {
  const proteinShort = Math.round(MACRO_TARGETS.protein - macros.protein);
  const carbOver = Math.round(macros.carbs - MACRO_TARGETS.carbs);
  const fatOver = Math.round(macros.fat - MACRO_TARGETS.fat);
  if (proteinShort >= 5) return { emoji: "💪", text: `Protein masih kurang ${proteinShort} g`, kind: "short" };
  if (fatOver >= 8) return { emoji: "⚠️", text: `Lemak berlebih ${fatOver} g`, kind: "over" };
  if (carbOver >= 10) return { emoji: "⚠️", text: `Karbohidrat berlebih ${carbOver} g`, kind: "over" };
  return { emoji: "✅", text: "Asupan makro sudah seimbang", kind: "ok" };
}

export function coachMessage(macros: MacroState): { head: string; suggestions: string[] } {
  const proteinShort = Math.round(MACRO_TARGETS.protein - macros.protein);
  const carbOver = Math.round(macros.carbs - MACRO_TARGETS.carbs);
  const fatOver = Math.round(macros.fat - MACRO_TARGETS.fat);
  if (proteinShort >= 5) {
    return {
      head: `Protein masih kurang ${proteinShort} gram. Fokus protein di menu berikutnya!`,
      suggestions: ["2 butir telur", "100g dada ayam panggang", "150g tempe"],
    };
  }
  if (fatOver >= 8) {
    return {
      head: `Lemak mendekati target. Perhatikan porsi gorengan dan santan.`,
      suggestions: ["Ganti gorengan dengan panggang/rebus", "Pilih susu rendah lemak"],
    };
  }
  if (carbOver >= 10) {
    return {
      head: `Karbohidrat sedikit di atas target. Seimbangkan dengan protein & serat.`,
      suggestions: ["Ganti nasi putih dengan nasi merah", "Tambah sayur untuk kenyang lebih lama"],
    };
  }
  return {
    head: "Asupan makro hari ini sudah seimbang. Pertahankan!",
    suggestions: [],
  };
}
