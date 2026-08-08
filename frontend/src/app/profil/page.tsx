"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { resolveProfile } from "@/lib/client/profile-local";
import { useRequireAuth } from "@/lib/client/use-require-auth";
import { useSession, signOut } from "next-auth/react";
import { dailyCalorieTarget } from "@pk/core";
import { NEUTRAL_BMI } from "@/lib/design";

const GOAL_LABEL: Record<string, string> = {
  lose: "Menurunkan berat badan",
  health: "Menjaga kesehatan",
  muscle: "Membangun otot",
};

interface ProfileInfo {
  name: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
}

function bmiStatusClass(bmi: number): { label: string; color: string; bg: string } {
  if (bmi < 18.5) return { label: "Kurang", color: "#B45309", bg: "#FFF7E0" };
  if (bmi < 25) return { label: "Normal", color: "#1E8E5A", bg: "#E7F6EF" };
  if (bmi < 30) return { label: "Berlebih", color: "#B45309", bg: "#FFF7E0" };
  return { label: "Obesitas", color: "#C62828", bg: "#FDE8E8" };
}

function bmiInsight(category: string): { title: string; body: string } {
  switch (category) {
    case "Kurang":
      return {
        title: "Satu langkah kecil setiap hari sudah bagus",
        body: "Beratmu sedikit di bawah rentang sehat. Menambah kalori bergizi secara bertahap — protein, lemak baik, nasi/roti gandum — bisa membantu tubuh terasa lebih berenergi.",
      };
    case "Normal":
      return {
        title: "Kamu berada di rentang sehat 👏",
        body: "Pertahankan pola makan dan aktivitas yang sekarang. Dengan target kalori yang sudah disesuaikan, kamu bisa tetap fleksibel di hari-hari yang padat.",
      };
    case "Berlebih":
      return {
        title: "Perubahan kecil lebih penting daripada sebenarnya",
        body: "Kamu sedikit di atas rentang sehat. Coba mulai dari satu kebiasaan kecil — porsi teratur, kurangi gorengan, atau jalan kaki 20 menit — tanpa perlu pola makan ekstrem.",
      };
    default:
      return {
        title: "Yang terpenting adalah konsistensi, bukan kesempurnaan",
        body: "BMI hanyalah salah satu angka, dan tubuhmu punya banyak cerita. Mulai dari satu kebiasaan kecil yang realistis, catat makananmu, dan biarkan data memandu langkah berikutnya. Konsultasi dengan tenaga kesehatan juga selalu boleh.",
      };
  }
}

export default function ProfilPage() {
  const { status } = useRequireAuth();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [metrics, setMetrics] = useState<{ bmi: number; bmiCategory: string; tdee: number } | null>(null);
  const [recoOpen, setRecoOpen] = useState(false);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const profile = await resolveProfile();
      if (!profile) {
        setLoading(false);
        return;
      }
      const metricsRes = await fetch(`/api/metrics?profileId=${profile.id}`).then((r) =>
        r.json()
      );
      setProfile({
        name: profile.name,
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        goal: profile.goal,
      });
      if (metricsRes.metrics) setMetrics(metricsRes.metrics);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [status, load]);

  const target = profile && metrics ? dailyCalorieTarget(metrics.tdee, profile.goal) : null;
  const displayName = profile?.name || session?.user?.name || "Pengguna";
  const bmiStatus = metrics ? bmiStatusClass(metrics.bmi) : null;

  return (
    <AppShell>
      <main className="px-4 pt-5 md:px-6">
        <h1 className="text-center text-xl font-extrabold text-slate-900">Profil</h1>

        {loading ? (
          <div className="flex min-h-[60dvh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2E7D32] border-t-transparent" />
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-[#2E7D32] text-xl font-extrabold text-white">
                {displayName[0].toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold text-slate-900">{displayName}</p>
                <p className="truncate text-[11px] text-slate-400">{session?.user?.email}</p>
{profile?.goal ? (
                <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  🎯 {GOAL_LABEL[profile.goal] ?? profile.goal}
                </span>
              ) : null}
            </div>
          </div>

            {!profile ? (
              <div className="pt-6 text-center">
                <p className="text-5xl">🍽️</p>
                <h2 className="mt-3 text-lg font-bold text-slate-900">Belum ada profil</h2>
                <p className="mt-1 text-sm text-slate-500">Selesaikan data dirimu agar target kalori bisa dihitung.</p>
              </div>
            ) : (
              <>
                <section>
                  <SectionTitle title="Data Tubuh" />
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                  <ListRow
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    }
                    label="Umur"
                    value={`${profile.age} tahun`}
                  />
                  <ListRow
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <circle cx="12" cy="5" r="3" />
                        <path d="M6.5 8a2 2 0 0 0-1.96 1.57l-2.03 7A2 2 0 0 0 4.44 19h15.12a2 2 0 0 0 1.93-2.43l-2.03-7A2 2 0 0 0 17.5 8Z" />
                      </svg>
                    }
                    label="Berat Badan"
                    value={`${profile.weight} kg`}
                    divide
                  />
                  <ListRow
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0l-11.2 11.2a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l11.2-11.2a1 1 0 0 0 0-1.4Z" />
                        <path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2" />
                      </svg>
                    }
                    label="Tinggi Badan"
                    value={`${profile.height} cm`}
                    divide
                  />
                  {metrics ? (
                    <>
                      <ListRow
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                          </svg>
                        }
                        label="IMT (BMI)"
                        value={String(metrics.bmi)}
                        badge={bmiStatus ? { label: bmiStatus.label, color: bmiStatus.color, bg: bmiStatus.bg } : undefined}
                        divide
                        last
                      />
                      <button
                        onClick={() => setRecoOpen((o) => !o)}
                        className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: NEUTRAL_BMI.color }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                          </svg>
                          Lihat rekomendasi
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`h-4 w-4 text-slate-300 transition-transform ${recoOpen ? "rotate-180" : ""}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      {recoOpen && bmiStatus && (
                        <div className="px-4 pb-4 anim-notif-in">
                          <div className="rounded-2xl p-3.5" style={{ background: NEUTRAL_BMI.bg }}>
                            <p className="text-[13px] font-bold" style={{ color: NEUTRAL_BMI.color }}>
                              {bmiInsight(bmiStatus.label).title}
                            </p>
                            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                              {bmiInsight(bmiStatus.label).body}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
                </section>

                <section>
                  <SectionTitle title="Target Harian" />
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                    <ListRow
                      icon={
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-5 4-7 5-11Z" />
                            <path d="M12 22c2.5-1 3.5-3 3.5-5.5M9 20c-1-1.5-1-3 0-4.5" />
                          </svg>
                        </span>
                      }
                      label="Kalori"
                      value={target ? `${target.toLocaleString("id-ID")} kkal` : "—"}
                      last
                    />
                  </div>
                </section>

                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Keluar
                </button>
              </>
            )}
          </div>
        )}

        <div className="h-4" />
      </main>
    </AppShell>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="px-1 text-[12px] font-bold uppercase tracking-wider text-slate-400">{title}</h2>;
}

function ListRow({
  icon,
  label,
  value,
  badge,
  chevron = false,
  divide = false,
  danger = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: { label: string; color: string; bg: string };
  chevron?: boolean;
  divide?: boolean;
  last?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-700"}`}>
        {icon}
      </span>
      <span className={`flex-1 text-[14px] font-semibold ${danger ? "text-red-600" : "text-slate-800"}`}>{label}</span>
      {value ? <span className="text-[13px] font-bold text-slate-900">{value}</span> : null}
      {badge ? (
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ color: badge.color, background: badge.bg }}>
          {badge.label}
        </span>
      ) : null}
      {chevron ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-300">
          <path d="m9 18 6-6-6-6" />
        </svg>
      ) : null}
    </>
  );
  const cls = `flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition ${divide ? "border-t border-slate-100" : ""} ${danger ? "hover:bg-red-50/50" : onClick ? "hover:bg-slate-50" : ""}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}