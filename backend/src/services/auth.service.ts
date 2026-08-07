import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/user.repository";
import { ProfileRepository } from "../repositories/profile.repository";
import { BadRequestError, ConflictError, ActivityLevel, Goal } from "@pk/core";

export interface RegisterInput {
  name?: string;
  email: string;
  password: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  activityLevel?: ActivityLevel;
  goal?: Goal;
}

const DEFAULT_PROFILE = {
  age: 25,
  gender: "laki-laki",
  height: 165,
  weight: 60,
  activityLevel: "moderate" as ActivityLevel,
  goal: "health" as Goal,
};

export class AuthService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly profiles = new ProfileRepository()
  ) {}

  async emailExists(email: string): Promise<boolean> {
    const normalized = String(email).trim().toLowerCase();
    return (await this.users.findByEmail(normalized)) !== null;
  }

  async login(email: string, password: string) {
    const normalized = String(email).trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    if (!user) return null;
    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) return null;
    return { id: user.id, name: user.name, email: user.email };
  }

  async register(input: RegisterInput) {
    const email = String(input.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestError("Format email tidak valid.");
    }
    if (String(input.password).length < 6) {
      throw new BadRequestError("Password minimal 6 karakter.");
    }

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictError("Email sudah terdaftar.");
    }

    const passwordHash = await bcrypt.hash(String(input.password), 10);
    const user = await this.users.create({
      name: input.name?.trim() ? String(input.name).trim() : null,
      email,
      passwordHash,
    });

    const profile = await this.profiles.create({
      userId: user.id,
      name: user.name,
      age: Number(input.age) || DEFAULT_PROFILE.age,
      gender: input.gender || DEFAULT_PROFILE.gender,
      height: Number(input.height) || DEFAULT_PROFILE.height,
      weight: Number(input.weight) || DEFAULT_PROFILE.weight,
      activityLevel: input.activityLevel || DEFAULT_PROFILE.activityLevel,
      goal: input.goal || DEFAULT_PROFILE.goal,
    });

    return { user, profile };
  }
}