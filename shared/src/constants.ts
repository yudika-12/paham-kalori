export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GOALS = ["lose", "health", "muscle"] as const;
export type Goal = (typeof GOALS)[number];

export const MEAL_TYPES = ["Sarapan", "Makan siang", "Makan malam", "Camilan", "Makan larut malam"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export function mealTypeForHour(hour: number): MealType {
  if (hour >= 5 && hour < 11) return "Sarapan";
  if (hour >= 11 && hour < 17) return "Makan siang";
  return "Makan malam";
}

export const PROFILE_LIMITS = {
  ageMin: 12,
  ageMax: 100,
  heightMin: 100,
  heightMax: 250,
  weightMin: 25,
  weightMax: 250,
} as const;

export const MACRO_TARGETS = { carbs: 200, protein: 120, fat: 70 } as const;

export const PROFILE_STORAGE_KEY = "fitpemula_profile_id";