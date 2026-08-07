import { prismaClient } from "../db/prisma";

export interface NewFoodEntry {
  profileId: string;
  name: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  iron?: number | null;
  vitaminC?: number | null;
  mealType?: string | null;
  note?: string | null;
  image?: string | null;
}

export interface FoodUpdateInput {
  name?: string;
  calories?: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  iron?: number | null;
  vitaminC?: number | null;
  mealType?: string;
}

export class FoodRepository {
  async listByProfile(profileId: string) {
    return prismaClient.foodEntry.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listToday(profileId: string, from: Date, to: Date) {
    return prismaClient.foodEntry.findMany({
      where: { profileId, createdAt: { gte: from, lt: to } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: NewFoodEntry) {
    return prismaClient.foodEntry.create({ data });
  }

  async findById(id: string) {
    return prismaClient.foodEntry.findUnique({ where: { id } });
  }

  async update(id: string, data: FoodUpdateInput) {
    return prismaClient.foodEntry.update({ where: { id }, data });
  }

  async remove(id: string) {
    return prismaClient.foodEntry.delete({ where: { id } });
  }
}