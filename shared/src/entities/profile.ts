import { ActivityLevel, Goal, PROFILE_LIMITS } from "../constants";
import { ProfileInput } from "../types";

export interface Metrics {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
}

export function calcBMI(heightCm: number, weightKg: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 16) return "Berat badan sangat kurang";
  if (bmi < 18.5) return "Berat badan kurang";
  if (bmi < 25) return "Berat badan normal";
  if (bmi < 30) return "Berat badan berlebih";
  if (bmi < 35) return "Obesitas tingkat 1";
  if (bmi < 40) return "Obesitas tingkat 2";
  return "Obesitas tingkat 3";
}

export function calcBMR(
  age: number,
  gender: "laki-laki" | "perempuan",
  heightCm: number,
  weightKg: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "laki-laki" ? base + 5 : base - 161;
}

export function activityMultiplier(activityLevel: string): number {
  switch (activityLevel) {
    case "sedentary":
      return 1.2;
    case "light":
      return 1.375;
    case "moderate":
      return 1.55;
    case "active":
      return 1.725;
    default:
      return 1.375;
  }
}

export function calcTDEE(bmr: number, activityLevel: string): number {
  return bmr * activityMultiplier(activityLevel);
}

export function calcMetrics(input: {
  age: number;
  gender: "laki-laki" | "perempuan";
  height: number;
  weight: number;
  activityLevel: string;
}): Metrics {
  const bmi = calcBMI(input.height, input.weight);
  const bmr = calcBMR(input.age, input.gender, input.height, input.weight);
  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory: bmiCategory(bmi),
    bmr: Math.round(bmr),
    tdee: Math.round(calcTDEE(bmr, input.activityLevel)),
  };
}

export function dailyCalorieTarget(tdee: number, goal: string): number {
  if (goal === "lose") return Math.max(1200, Math.round(tdee - 500));
  return Math.round(tdee);
}

export interface ProfileValidation {
  ok: boolean;
  errors: string[];
}

export class ProfileValidator {
  static validate(input: ProfileInput): ProfileValidation {
    const errors: string[] = [];
    const { ageMin, ageMax, heightMin, heightMax, weightMin, weightMax } = PROFILE_LIMITS;

    if (typeof input.age !== "number" || input.age < ageMin || input.age > ageMax) {
      errors.push(`Umur harus ${ageMin}-${ageMax} tahun.`);
    }
    if (
      typeof input.height !== "number" ||
      input.height < heightMin ||
      input.height > heightMax
    ) {
      errors.push(`Tinggi badan harus ${heightMin}-${heightMax} cm.`);
    }
    if (
      typeof input.weight !== "number" ||
      input.weight < weightMin ||
      input.weight > weightMax
    ) {
      errors.push(`Berat badan harus ${weightMin}-${weightMax} kg.`);
    }
    if (input.gender !== "laki-laki" && input.gender !== "perempuan") {
      errors.push("Gender tidak valid.");
    }
    return { ok: errors.length === 0, errors };
  }
}

export class ProfileEntity {
  readonly id: string;
  readonly userId: string;
  readonly name: string | null;
  readonly age: number;
  readonly gender: "laki-laki" | "perempuan";
  readonly height: number;
  readonly weight: number;
  readonly activityLevel: ActivityLevel;
  readonly goal: Goal;

  constructor(data: {
    id: string;
    userId: string;
    name: string | null;
    age: number;
    gender: string;
    height: number;
    weight: number;
    activityLevel: string;
    goal: string;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.age = data.age;
    this.gender = data.gender === "perempuan" ? "perempuan" : "laki-laki";
    this.height = data.height;
    this.weight = data.weight;
    this.activityLevel = (data.activityLevel as ActivityLevel) ?? "moderate";
    this.goal = (data.goal as Goal) ?? "health";
  }

  toInput(): ProfileInput {
    return {
      name: this.name || undefined,
      age: this.age,
      gender: this.gender,
      height: this.height,
      weight: this.weight,
      activityLevel: this.activityLevel,
      goal: this.goal,
    };
  }

  getMetrics(): Metrics {
    return calcMetrics({
      age: this.age,
      gender: this.gender,
      height: this.height,
      weight: this.weight,
      activityLevel: this.activityLevel,
    });
  }
}