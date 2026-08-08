"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { resolveProfile } from "@/lib/client/profile-local";
import { useRequireAuth } from "@/lib/client/use-require-auth";
import { FoodEntry, Metrics, dailyCalorieTarget } from "@pk/core";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { thisWeek, thisMonth, nutritionGrade, DayTotals } from "@/lib/nutrition-stats";

const ACCENT = "#2E7D32";
const MAIN_SLOTS = ["Makan Pagi", "Makan Siang", "Makan Malam"] as const;

const SLOT_END_HOUR: Record<string, number> = {
  "Makan Pagi": 11,
  "Makan Siang": 17,
  "Makan Malam": 22,
};

function slotForHour(hour: number): string | null {
  if (hour >= 5 && hour < 11) return "Makan Pagi";
  if (hour >= 11 && hour < 17) return "Makan Siang";
  if (hour >= 17 || hour < 5) return "Makan Malam";
  return null;
}

function mealSlotForEntry(e: FoodEntry): string | null {
  return slotForHour(new Date(e.createdAt).getHours());
}

function slotIsOver(slot: string, dayKey: string, now: Date): boolean {
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const isToday = dayKey === toDayStr(now);
  if (!isToday) return true;
  return nowHour >= SLOT_END_HOUR[slot];
}

function toDayStr(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toLocaleDateString("en-CA");
}

function dayTitle(dayStr: string): string {
  return new Date(dayStr + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dayLabel(dayStr: string): string {
  const d = new Date(dayStr + "T00:00:00");
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const date = dayTitle(dayStr);
  if (sameDay(d, today)) return `Hari ini, ${date}`;
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (sameDay(d, y)) return `Kemarin, ${date}`;
  return date;
}

export default function HistoryPage() {
  const { status } = useRequireAuth();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [goal, setGoal] = useState("health");
  const [range, setRange] = useState<"week" | "month">("week");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const target = metrics ? dailyCalorieTarget(metrics.tdee, goal) : null;

  const periodStart = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (range === "week") {
      const dow = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dow);
      monday.setDate(monday.getDate() + offset * 7);
      return monday;
    }
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  }, [range, offset]);

  const days = useMemo(
    () => (range === "week" ? thisWeek(entries, target, periodStart) : thisMonth(entries, target, periodStart)),
    [entries, target, range, periodStart]
  );

  const load = useCallback(async () => {
    try {
      const profile = await resolveProfile();
      if (!profile) {
        setLoading(false);
        return;
      }
      const [foodRes, metricsRes] = await Promise.all([
        fetch(`/api/food?profileId=${profile.id}`),
        fetch(`/api/metrics?profileId=${profile.id}`),
      ]);
      const data = await foodRes.json();
      const m = await metricsRes.json();
      if (Array.isArray(data.entries)) setEntries(data.entries);
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

  async function remove(id: string) {
    const res = await fetch(`/api/food?id=${id}`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function update(id: string, data: { name: string; calories: number }) {
    const res = await fetch("/api/food", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.ok) {
      const { entry } = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
      setEditingId(null);
    }
  }

  const todayStr = toDayStr(new Date());

  const map = useMemo(() => {
    const m = new Map<string, FoodEntry[]>();
    for (const e of entries) {
      const key = toDayStr(new Date(e.createdAt));
      const arr = m.get(key);
      if (arr) arr.push(e);
      else m.set(key, [e]);
    }
    if (!m.has(todayStr)) m.set(todayStr, []);
    return m;
  }, [entries, todayStr]);

  const groups = useMemo(
    () =>
      [...map.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([dayKey, list]) => ({
          dayKey,
          list: [...list].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        })),
    [map]
  );

  return (
    <AppShell>
      <main className="px-4 pt-5 md:px-6">
        <h1 className="text-center text-xl font-extrabold text-slate-900">Statistik</h1>

        {loading ? (
          <div className="flex min-h-[60dvh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2E7D32] border-t-transparent" />
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <RangePanel range={range} onRange={(r) => { setOffset(0); setRange(r); }} />
            <DateRangeSelector
              range={range}
              periodStart={periodStart}
              onPrev={() => setOffset((o) => o - 1)}
              onNext={() => setOffset((o) => o + 1)}
            />

            <ChartPanel days={days} target={target} range={range} />

            {entries.length > 0 && (
              <div className="pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[14px] font-bold text-slate-900">Log Harian</h2>
                    <p className="text-xs text-slate-400">Timeline makanmu dari hari ke hari</p>
                  </div>
                  <Link href="/scan" className="text-[12px] font-bold text-[#2E7D32]">
                    + Catat
                  </Link>
                </div>

                <div className="mt-4 space-y-8">
                  {groups.map((group) => {
                    if (group.list.length === 0) return null;
                    const total = group.list.reduce((a, e) => a + e.calories, 0);
                    return (
                      <div key={group.dayKey}>
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-700">{dayLabel(group.dayKey)}</h3>
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-600">
                            {total} kkal
                          </span>
                        </div>
                        <div className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-4 dark:border-slate-700 sm:pl-5">
                          {MAIN_SLOTS.map((slot) => {
                            const slotEntries = group.list.filter((e) => mealSlotForEntry(e) === slot);
                            if (slotEntries.length > 0) {
                              return slotEntries.map((e) => (
                                <TimelineEntry
                                  key={e.id}
                                  entry={e}
                                  label={slot}
                                  editing={editingId === e.id}
                                  onEdit={() => setEditingId(e.id)}
                                  onRemove={() => remove(e.id)}
                                  onCancelEdit={() => setEditingId(null)}
                                  onSave={(data) => update(e.id, data)}
                                />
                              ));
                            }
                            const over = slotIsOver(slot, group.dayKey, new Date());
                            return (
                              <div key={slot}>
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                                  <p className="text-[12px] font-bold text-slate-500">{slot}</p>
                                </div>
                                {over ? (
                                  <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 opacity-70">
                                    <p className="text-[12px] font-medium text-slate-400">
                                      Waktu pencatatan telah berakhir pada pukul {SLOT_END_HOUR[slot]}.00
                                    </p>
                                  </div>
                                ) : (
                                  <Link
                                    href="/scan"
                                    className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 transition hover:border-[#2E7D32] hover:bg-emerald-50/50"
                                  >
                                    <span className="text-[12px] font-semibold text-slate-500">Belum ada makan</span>
                                    <span className="text-[12px] font-bold text-[#2E7D32]">+ Tap untuk catat</span>
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {entries.length === 0 && (
              <div className="pt-6 text-center">
                <p className="text-5xl">🍽️</p>
                <h2 className="mt-3 text-lg font-bold text-slate-900">Belum ada data</h2>
                <p className="mt-1 text-sm text-slate-500">Mulai dengan memfoto makanan pertamamu.</p>
                <Link
                  href="/scan"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#2E7D32] px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-700/25 transition hover:bg-emerald-700"
                >
                  + Catat Makanan
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="h-4" />
      </main>
    </AppShell>
  );
}

function RangePanel({ range, onRange }: { range: "week" | "month"; onRange: (r: "week" | "month") => void }) {
  const pill = (active: boolean) =>
    `flex-1 rounded-full py-1.5 text-[13px] font-bold transition ${
      active ? "bg-[#2E7D32] text-white shadow-sm" : "text-slate-500"
    }`;
  return (
    <div className="flex rounded-full bg-slate-200/70 p-1">
      <button onClick={() => onRange("week")} className={pill(range === "week")}>
        Minggu
      </button>
      <button onClick={() => onRange("month")} className={pill(range === "month")}>
        Bulan
      </button>
    </div>
  );
}

function DateRangeSelector({
  range,
  periodStart,
  onPrev,
  onNext,
}: {
  range: "week" | "month";
  periodStart: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const labels =
    range === "week"
      ? (() => {
          const start = new Date(periodStart);
          const end = new Date(periodStart);
          end.setDate(end.getDate() + 6);
          const fmt = (x: Date) =>
            x.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
          return `${fmt(start)} – ${fmt(end)}`;
        })()
      : periodStart.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50";
  return (
    <div className="flex items-center justify-between px-1">
      <button className={btn} aria-label="Periode sebelumnya" onClick={onPrev}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <p className="text-center text-[13px] font-bold text-slate-700">{labels}</p>
      <button className={btn} aria-label="Periode berikutnya" onClick={onNext}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

function ChartPanel({
  days,
  target,
  range,
}: {
  days: DayTotals[];
  target: number | null;
  range: "week" | "month";
}) {
  const data = days;
  const weeklyMax = Math.max(...data.map((d) => d.kalori), target ?? 0, 300);
  const chartTop = Math.ceil(weeklyMax / 500) * 500;
  const maxVal = Math.max(0, ...data.filter((d) => !d.empty && !d.over).map((d) => d.kalori));
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-slate-900">Grafik Asupan Kalori</h2>
      </div>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              interval={range === "month" ? 3 : 0}
            />
            <YAxis
              width={38}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              domain={[0, chartTop]}
              tickCount={5}
              tickFormatter={(v: number) => v.toLocaleString("id-ID")}
            />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              formatter={(value) => [`${Number(value ?? 0).toLocaleString("id-ID")} kkal`]}
              labelFormatter={(label) => (range === "week" ? `Hari ${label}` : `Tgl ${label}`)}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
            />
            {target != null && (
              <ReferenceLine y={target} stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth={1.5} strokeOpacity={0.9} />
            )}
            <Bar dataKey="kalori" radius={[6, 6, 6, 6]} maxBarSize={range === "week" ? 30 : 12}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.empty
                      ? "#e2e8f0"
                      : d.over
                        ? "#F5A623"
                        : d.kalori === maxVal
                          ? ACCENT
                          : "#a7d7b5"
                  }
                  fillOpacity={d.empty ? 0.5 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TimelineEntry({
  entry,
  label,
  editing,
  onEdit,
  onRemove,
  onCancelEdit,
  onSave,
}: {
  entry: FoodEntry;
  label?: string;
  editing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onCancelEdit: () => void;
  onSave: (data: { name: string; calories: number }) => void;
}) {
  const time = new Date(entry.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const grade = nutritionGrade({
    carbs: entry.carbs ?? 0,
    protein: entry.protein ?? 0,
    fat: entry.fat ?? 0,
    fiber: entry.fiber ?? 0,
    sugar: entry.sugar ?? 0,
    sodium: entry.sodium ?? 0,
  });
  const gradeColor =
    grade.grade === "A" ? "#2E7D32" : grade.grade === "B" ? "#ca8a04" : grade.grade === "C" ? "#ea580c" : "#dc2626";
  return (
    <div className="relative">
      <span className="absolute -left-[27px] top-5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {time}{label ? ` ${label}` : ""}
      </p>
      {editing ? (
        <EditCard entry={entry} onCancel={onCancelEdit} onSave={onSave} />
      ) : (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold leading-snug text-slate-800 dark:text-slate-200">{entry.name}</p>
            <p className="text-[11px] text-slate-400">
              K {entry.carbs ?? "—"}g • P {entry.protein ?? "—"}g • L {entry.fat ?? "—"}g
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold text-white"
              style={{ background: gradeColor }}
              title={`Grade ${grade.grade}`}
            >
              {grade.grade}
            </span>
            <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-extrabold text-orange-600">
              {entry.calories} kkal
            </span>
            <div className="flex shrink-0 gap-0.5">
              <IconButton title="Edit" onClick={onEdit} hover="hover:bg-emerald-50 hover:text-emerald-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </IconButton>
              <IconButton title="Hapus" onClick={onRemove} hover="hover:bg-red-50 hover:text-red-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </IconButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  hover,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  hover: string;
}) {
  return (
    <button onClick={onClick} title={title} className={`rounded-lg p-2 text-slate-400 transition ${hover}`}>
      {children}
    </button>
  );
}

function EditCard({
  entry,
  onCancel,
  onSave,
}: {
  entry: FoodEntry;
  onCancel: () => void;
  onSave: (data: { name: string; calories: number }) => void;
}) {
  const [name, setName] = useState(entry.name);
  const [calories, setCalories] = useState(String(entry.calories));
  return (
    <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama makanan</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <label className="mb-1 mt-3 block text-xs font-semibold text-slate-600 dark:text-slate-300">Kalori (kkal)</label>
      <input
        type="number"
        value={calories}
        onChange={(e) => setCalories(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Batal
        </button>
        <button
          onClick={() => onSave({ name, calories: Number(calories) })}
          className="rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
        >
          Simpan
        </button>
      </div>
    </div>
  );
}