import { ActivityLevel, Goal } from "./constants";

export interface ProfileInput {
  name?: string;
  age: number;
  gender: "laki-laki" | "perempuan";
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface NutritionItem {
  name: string;
  quantity?: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  iron?: number;
  vitaminC?: number;
}

export interface FoodAnalysis {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  iron?: number;
  vitaminC?: number;
  mealType: string;
  note?: string;
  items?: NutritionItem[];
}

export interface FoodEntry {
  id: string;
  profileId: string;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  iron?: number | null;
  vitaminC?: number | null;
  mealType: string | null;
  note: string | null;
  image: string | null;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}