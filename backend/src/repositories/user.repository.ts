import { prismaClient } from "../db/prisma";

export interface NewUser {
  name: string | null;
  email: string;
  passwordHash: string;
}

export class UserRepository {
  async create(data: NewUser) {
    return prismaClient.user.create({ data });
  }

  async findByEmail(email: string) {
    return prismaClient.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prismaClient.user.findUnique({ where: { id } });
  }
}