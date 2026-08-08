import { FoodEntry } from "@pk/core";

export const MACRO_TARGETS = { carbs: 200, protein: 120, fat: 70 };

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

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function thisWeek(entries: FoodEntry[], target: number | null, from: Date = new Date()): DayTotals[] {
  const days: DayTotals[] = [];
  const now = new Date(from);
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

export function thisMonth(entries: FoodEntry[], target: number | null, from: Date = new Date()): DayTotals[] {
  const days: DayTotals[] = [];
  const now = new Date(from);
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
