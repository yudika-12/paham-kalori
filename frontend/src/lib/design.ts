export const MACRO_ORDER: ("carbs" | "protein" | "fat")[] = ["carbs", "protein", "fat"];

export const MACRO_UI: Record<
  "carbs" | "protein" | "fat",
  { label: string; short: string; color: string }
> = {
  carbs: { label: "Karbohidrat", short: "Karbo", color: "#F5A623" },
  protein: { label: "Protein", short: "Protein", color: "#2FA96B" },
  fat: { label: "Lemak", short: "Lemak", color: "#3B82F6" },
};

export const BANNER_DANGER = "#E85D5D";
export const BANNER_DANGER_BG = "#FDEDED";

export const NEUTRAL_BMI = {
  bg: "#FFF7E0",
  color: "#B45309",
};