import { PROFILE_STORAGE_KEY } from "@pk/core";

export interface StoredProfile {
  id: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
}

let profilesCache: StoredProfile[] | null = null;

export class ProfileLocalStore {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(PROFILE_STORAGE_KEY);
  }

  set(id: string) {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, id);
  }

  clear() {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    profilesCache = null;
  }

  async getProfiles(force = false): Promise<StoredProfile[] | null> {
    if (!force && profilesCache) return profilesCache;
    const res = await fetch("/api/onboarding");
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.profiles) || data.profiles.length === 0) return null;
    profilesCache = data.profiles;
    return profilesCache;
  }

  async resolve(): Promise<string | null> {
    return (await resolveProfile())?.id ?? null;
  }

  async has(): Promise<boolean> {
    return (await this.resolve()) !== null;
  }
}

export const profileStore = new ProfileLocalStore();
export const getProfileId = () => profileStore.get();
export const setProfileId = (id: string) => profileStore.set(id);
export const clearProfileId = () => profileStore.clear();

export async function resolveProfile(): Promise<StoredProfile | null> {
  const profiles = await profileStore.getProfiles();
  if (!profiles) return null;
  const stored = profileStore.get();
  const current = profiles.find((p) => p.id === stored) ?? profiles[0];
  if (current.id !== stored) profileStore.set(current.id);
  return current;
}

export const resolveProfileId = async () => (await resolveProfile())?.id ?? null;
