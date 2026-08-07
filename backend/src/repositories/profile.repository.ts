import { prismaClient } from "../db/prisma";
import { ActivityLevel, Goal } from "@pk/core";

export interface NewProfile {
  userId: string;
  name?: string | null;
  age: number;
  gender: string;
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export class ProfileRepository {
  async create(data: NewProfile) {
    return prismaClient.profile.create({ data });
  }

  async listByUser(userId: string) {
    return prismaClient.profile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOwnedById(profileId: string, userId: string) {
    return prismaClient.profile.findFirst({
      where: { id: profileId, userId },
    });
  }
}