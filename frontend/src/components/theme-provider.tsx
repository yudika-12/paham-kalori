"use client";

import { useEffect } from "react";

// Dark mode dihapus (app selalu light). Kelas `.dark` tak pernah diterapkan
// sehingga semua varian `dark:` di stylesheet menjadi non-aktif.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    window.localStorage.removeItem("pk_theme");
  }, []);

  return <>{children}</>;
}