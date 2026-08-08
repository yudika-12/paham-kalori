"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { resolveProfile } from "@/lib/client/profile-local";
import { useRequireAuth } from "@/lib/client/use-require-auth";
import { FoodEntry, Metrics, dailyCalorieTarget, cleanMarkdown } from "@pk/core";
import {
  MACRO_TARGETS,
  startOfToday,
  todayLabel,
  MacroState,
} from "@/lib/nutrition-stats";
import { MACRO_UI, MACRO_ORDER } from "@/lib/design";

const QUICK_ASKS = [
  "🍽️ Menu makan malam",
  "🍗 Menu tinggi protein",
  "⚖️ Cara kurangi gorengan",
  "🤖 Rekap makroku",
];

async function streamChat(
  profileId: string,
  userMsg: string,
  onChunk: (reply: string) => void
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, message: userMsg }),
  });
  if (!res.ok || !res.body) {
    throw new Error("Gagal terhubung");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const evt of events) {
      const line = evt.trim();
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        if (typeof payload === "string") {
          reply += payload;
          onChunk(cleanMarkdown(reply));
        }
      } catch {
        /* skip non-data */
      }
    }
  }
}

export default function DashboardPage() {
  const { status } = useRequireAuth();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [goal, setGoal] = useState("health");
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [macroOpen, setMacroOpen] = useState(false);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const profile = await resolveProfile();
      if (!profile) {
        setLoading(false);
        return;
      }
      setProfileId(profile.id);
      const since = startOfToday();
      const until = new Date(since);
      until.setDate(until.getDate() + 1);
      const [foodRes, metricsRes] = await Promise.all([
        fetch(
          `/api/food?profileId=${profile.id}&from=${since.toISOString()}&to=${until.toISOString()}`
        ),
        fetch(`/api/metrics?profileId=${profile.id}`),
      ]);
      const food = await foodRes.json();
      const m = await metricsRes.json();
      if (Array.isArray(food.entries)) setEntries(food.entries);
      if (m.metrics) setMetrics(m.metrics);
      if (profile.goal) setGoal(profile.goal);
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

  const todayStart = startOfToday().getTime();
  const todayEntries = useMemo(
    () => entries.filter((e) => new Date(e.createdAt).getTime() >= todayStart),
    [entries, todayStart]
  );
  const todayCalories = todayEntries.reduce((a, e) => a + e.calories, 0);
  const target = metrics ? dailyCalorieTarget(metrics.tdee, goal) : null;
  const remaining = target ? target - todayCalories : null;
  const pct = target ? Math.min(100, Math.round((todayCalories / target) * 100)) : 0;

  const macros: MacroState = useMemo(
    () => ({
      carbs: todayEntries.reduce((a, e) => a + (e.carbs ?? 0), 0),
      protein: todayEntries.reduce((a, e) => a + (e.protein ?? 0), 0),
      fat: todayEntries.reduce((a, e) => a + (e.fat ?? 0), 0),
    }),
    [todayEntries]
  );

  const micros = useMemo(
    () => ({
      serat: todayEntries.reduce((a, e) => a + (e.fiber ?? 0), 0),
      gula: todayEntries.reduce((a, e) => a + (e.sugar ?? 0), 0),
      natrium: todayEntries.reduce((a, e) => a + (e.sodium ?? 0), 0),
    }),
    [todayEntries]
  );

  const alerts = useMemo(() => {
    const proteinGap = Math.max(0, Math.round(MACRO_TARGETS.protein - macros.protein));
    const list: { title: string; suggestions: string[] }[] = [];
    if (proteinGap > 0) {
      list.push({
        title: `Protein masih kurang ${proteinGap} g. Fokus protein di menu berikutnya!`,
        suggestions: ["2 butir telur", "100g dada ayam panggang", "150g tempe"],
      });
    }
    if (target && remaining != null && remaining > 0) {
      list.push({
        title: `Kalori hari ini masih kurang ${remaining.toLocaleString("id-ID")} kkal.`,
        suggestions: ["1 porsi nasi merah", "1 buah pisang", "Segenggam kacang almond"],
      });
    }
    return list;
  }, [macros, target, remaining]);

  if (loading) {
    return (
      <AppShell>
        <main className="flex min-h-[70dvh] items-center justify-center px-6">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2E7D32] border-t-transparent" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="px-4 pt-5 md:px-6">
        <Header alerts={alerts} />

        <section className="mt-4 rounded-3xl bg-gradient-to-br from-[#2FA96B] via-[#2C9B66] to-[#2E8B5C] p-4 text-white shadow-[0_8px_24px_rgba(46,125,50,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[12px] font-bold text-white/90">Kalori Hari Ini</h2>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold leading-none tracking-tight">
                  {target ? todayCalories.toLocaleString("id-ID") : "—"}
                </span>
                {target ? (
                  <span className="text-xs font-semibold text-white/80">kcal</span>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] font-medium text-white/70">
                {target
                  ? `dari ${target.toLocaleString("id-ID")} kcal`
                  : "Lengkapi data tubuh untuk menghitung target"}
              </p>
            </div>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
                <path d="M3 3v18h18" />
                <path d="M7 15v-3M12 15V8M17 15v-6" />
              </svg>
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-[11px] font-bold text-white">{pct}%</span>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-white/15 pt-2.5">
            <span className="text-[11px] font-semibold text-white/75">Sisa</span>
            <span className="text-[13px] font-extrabold">
              {remaining != null
                ? `${remaining < 0 ? "−" : ""}${Math.abs(remaining).toLocaleString("id-ID")} kcal`
                : "—"}
            </span>
          </div>
        </section>

        <section className="mt-5">
          <button
            onClick={() => setMacroOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-[15px] font-bold text-slate-900">Makronutrien</h2>
            <span className="flex items-center gap-1 text-[12px] font-bold text-[#2E7D32]">
              Lihat Detail
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-3.5 w-3.5 transition-transform ${macroOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </button>
          {macroOpen && (
            <div className="mt-3 border-t border-slate-100 pt-4 anim-notif-in" key="micro">
              <p className="text-[12px] font-bold text-slate-700">Mikronutrisi</p>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {[
                  { label: "Serat", value: micros.serat, unit: "g" },
                  { label: "Gula", value: micros.gula, unit: "g" },
                  { label: "Natrium", value: micros.natrium, unit: "mg" },
                ].map((t) => (
                  <div key={t.label} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400">{t.label}</p>
                    <p className="mt-0.5 text-lg font-extrabold text-slate-900">
                      {Math.round(t.value).toLocaleString("id-ID")}
                      <span className="ml-0.5 text-[10px] font-semibold text-slate-400">{t.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 space-y-2.5">
            {MACRO_ORDER.map((key) => (
              <MacroCard
                key={key}
                kind={key}
                label={MACRO_UI[key].label}
                grams={macros[key]}
                target={MACRO_TARGETS[key]}
                color={MACRO_UI[key].color}
              />
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-900">Makanan Hari Ini</h2>
            <Link href="/history" className="text-[12px] font-bold text-[#2E7D32]">
              Lihat Semua →
            </Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {todayEntries.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                    <path d="M7 2v20" />
                    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                  </svg>
                </span>
                <p className="mt-3 text-[14px] font-bold text-slate-700">Belum ada catatan makanan</p>
                <p className="mt-1 text-[12px] text-slate-400">Yuk, catat makanan pertama Anda</p>
                <Link
                  href="/scan"
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#2E7D32] px-6 py-3 text-[13px] font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-700"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Catat Makanan
                </Link>
              </div>
            ) : (
              todayEntries.map((e) => <MealRow key={e.id} entry={e} />)
            )}
          </div>
        </section>

        <div className="h-4" />
      </main>

      <CoachFloating profileId={profileId} />
    </AppShell>
  );
}

function Header({
  alerts,
}: {
  alerts: { title: string; suggestions: string[] }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mb-2">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-[13px] font-medium text-slate-400">{todayLabel()}</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          title="Notifikasi"
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {alerts.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>
      </div>

      {open && alerts.length === 0 && (
        <div className="absolute right-0 top-14 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 anim-notif-in">
          <p className="text-sm font-bold text-slate-900">✨ Semua sudah sesuai target</p>
        </div>
      )}
      {open && alerts.length > 0 && (
        <div className="absolute right-0 top-14 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 anim-notif-in">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              Notifikasi
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">{alerts.length}</span>
            </p>
            <button
              onClick={() => setOpen(false)}
              title="Tutup"
              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-3">
            {alerts.map((a) => (
              <div
                key={a.title}
                className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5"
              >
                <p className="text-[13px] font-bold leading-snug text-slate-900">
                  <span className="mr-1.5">💡</span>
                  {a.title}
                </p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Bisa coba:
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {a.suggestions.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-[13px] leading-snug text-slate-600">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          </div>
        </div>
      )}
    </div>
  );
}

function macroGlyph(kind: "carbs" | "protein" | "fat") {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {kind === "carbs" ? (
        <>
          <path d="M2 22 16 8" />
          <path d="M17.5 8 16 9.5 14.5 8" />
          <path d="M20.5 5 19 6.5 17.5 5" />
          <path d="M20.5 11l-1.5 1.5-1.5-1.5" />
          <path d="M12 6l-1.5 1.5L9 6" />
          <path d="M12 12l-1.5 1.5L9 12" />
        </>
      ) : kind === "protein" ? (
        <>
          <path d="M6.5 3h11C18.5 5 19 7.5 19 10.5c0 4.5-3.1 8.5-7 8.5s-7-4-7-8.5C5 7.5 5.5 5 6.5 3Z" />
          <path d="M9 8.5c.5 1.2 1.5 2 2.5 2.2" />
        </>
      ) : (
        <path d="M12 2.7S6 9 6 14a6 6 0 0 0 12 0c0-5-6-11.3-6-11.3Z" />
      )}
    </svg>
  );
}

function MacroCard({ kind, label, grams, target, color }: { kind: "carbs" | "protein" | "fat"; label: string; grams: number; target: number; color: string }) {
  const pct = Math.min(100, (grams / target) * 100);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-sm">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: color }}
      >
        {macroGlyph(kind)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-slate-800">{label}</p>
        <p className="mt-0.5 text-[12px] font-semibold text-slate-400">
          {grams.toLocaleString("id-ID")} g
        </p>
      </div>
      <div className="flex w-[42%] shrink-0 items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span className="w-9 shrink-0 text-right text-[11px] font-bold text-slate-600">
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

function MealRow({ entry }: { entry: FoodEntry }) {
  const time = new Date(entry.createdAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50">
        {entry.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.image} alt={entry.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xl">🍽️</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-slate-900">{entry.name}</p>
        <p className="text-[11px] text-slate-400">{entry.mealType || "Makanan"} · {time}</p>
      </div>
      <div className="shrink-0 rounded-xl bg-orange-50 px-2.5 py-1 text-center">
        <p className="text-[13px] font-extrabold text-orange-600">{entry.calories}</p>
        <p className="text-[9px] font-bold uppercase text-orange-400">kkal</p>
      </div>
    </div>
  );
}

function CoachFloating({ profileId }: { profileId: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Halo! Aku Coach AI kamu. Mau tanya soal menu, kalori, atau makro? 😊" },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  async function sendChat(text: string) {
    if (!profileId || chatLoading) return;
    const userMsg = text.trim();
    if (!userMsg) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    setChatLoading(true);
    try {
      await streamChat(profileId, userMsg, (reply) => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: reply };
          return copy;
        });
      });
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Maaf, terjadi kendala. Coba lagi ya." },
      ]);
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim() && !chatLoading) sendChat(input);
  }

  function quickAsk(text: string) {
    setIsOpen(true);
    sendChat(text);
  }

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-[4.5rem] right-4 z-40 flex flex-col items-end">
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-[#2E7D32] py-2.5 pl-3 pr-4 text-sm font-bold text-white shadow-xl shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <span className="absolute -top-0.5 right-2 rounded-full bg-amber-400 px-1.5 py-[2px] text-[9px] font-extrabold leading-none text-amber-950 shadow-sm">
              AI
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
              <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
            </svg>
            <span className="hidden sm:inline text-[13px]">Tanya AI</span>
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/20 backdrop-blur-sm sm:items-end sm:justify-end sm:pr-6 sm:pb-6">
          <div className="flex h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:h-[min(600px,80dvh)] sm:rounded-3xl anim-notif-in">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-[#2E7D32] text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                  <path d="M8 9h8M8 13h5" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">Coach AI</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Chat pribadi dengan AI</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup"
                className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-4 pt-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tanya cepat</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {QUICK_ASKS.map((q) => (
                  <button
                    key={q}
                    onClick={() => quickAsk(q)}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              <div className="max-h-full flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-br-md bg-[#2E7D32] text-white"
                          : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {cleanMarkdown(msg.content) || "..."}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-3 dark:bg-slate-800">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="mt-3 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanya soal makanan & kalori..."
                  className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !input.trim()}
                  className="shrink-0 rounded-full bg-[#2E7D32] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                >
                  Kirim
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}