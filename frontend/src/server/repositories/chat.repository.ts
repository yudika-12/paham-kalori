import { prismaClient } from "../db/prisma";

export class ChatRepository {
  async listByProfile(profileId: string) {
    return prismaClient.chat.findMany({
      where: { profileId },
      orderBy: { createdAt: "asc" },
    });
  }

  async listRecent(profileId: string, take: number) {
    return prismaClient.chat.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async add(profileId: string, role: "user" | "assistant", content: string) {
    return prismaClient.chat.create({
      data: { profileId, role, content },
    });
  }

  async clearByProfile(profileId: string) {
    return prismaClient.chat.deleteMany({ where: { profileId } });
  }
}