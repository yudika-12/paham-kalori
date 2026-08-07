import { PROFILE_STORAGE_KEY } from "@pk/core";

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
  }

  async resolve(): Promise<string | null> {
    const res = await fetch("/api/onboarding");
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.profiles || data.profiles.length === 0) return null;

    const stored = this.get();
    const valid = data.profiles.find((p: { id: string }) => p.id === stored);
    const id = valid ? valid.id : data.profiles[0].id;
    if (id !== stored) this.set(id);
    return id;
  }

  async has(): Promise<boolean> {
    return (await this.resolve()) !== null;
  }
}

export const profileStore = new ProfileLocalStore();
export const getProfileId = () => profileStore.get();
export const setProfileId = (id: string) => profileStore.set(id);
export const clearProfileId = () => profileStore.clear();
export const resolveProfileId = () => profileStore.resolve();