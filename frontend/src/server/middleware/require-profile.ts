import { ProfileRepository } from "../repositories/profile.repository";
import { ProfileEntity, NotFoundError } from "@pk/core";

const profiles = new ProfileRepository();

export async function requireProfile(profileId: string, userId: string): Promise<ProfileEntity> {
  const profile = await profiles.findOwnedById(profileId, userId);
  if (!profile) throw new NotFoundError("Profil tidak ditemukan.");
  return new ProfileEntity(profile);
}