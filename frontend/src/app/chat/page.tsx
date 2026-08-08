"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { resolveProfile, resolveProfileId } from "@/lib/client/profile-local";
import { useRequireAuth } from "@/lib/client/use-require-auth";
import { ChatMessage, cleanMarkdown, dailyCalorieTarget, FoodEntry } from "@pk/core";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildQuickActions(hour: number): string[] {
  if (hour < 10) return ["🍳 Sarapan sehat", "🌾 Menu tinggi serat"];
  if (hour < 15) return ["🥪 Menu makan siang cepat", "⚖️ Bagi kalori untuk sisa hari ini"];
  return ["🌙 Menu makan malam ringan", "🍿 Masih boleh ngemil?"];
}

function buildGreeting(now: Date, todayCalories: number, target: number | null): string {
  const hour = now.getHours();
  const clock = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  let nextMeal = "makan siang";
  if (hour < 10) nextMeal = "sarapan";
  else if (hour >= 15) nextMeal = "makan malam";

  const total = todayCalories.toLocaleString("id-ID");

  if (target == null) {
    return `Halo! Aku Buddy, coach nutrisi kamu. Sudah ${clock} dan kamu baru makan ${total} kalori hari ini. Mau tanya soal kalori, makanan, atau cuma disemangati? Cerita aja 😊`;
  }

  const remaining = target - todayCalories;
  if (remaining > 0) {
    return `Halo! Sudah jam ${clock} dan kamu baru makan ${total} kalori. Masih ada ${remaining.toLocaleString("id-ID")} kalori tersisa buat ${nextMeal}. Mau nanya apa, Buddy siap bantu 😊`;
  }
  return `Halo! Sudah jam ${clock} dan kamu baru makan ${total} kalori — sudah melewati target harianmu. Pinter banget, jaga pola ya. Mau nanya apa lagi? 😊`;
}

interface StoredMessage extends ChatMessage {
  createdAt?: string;
}

function dayLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const date = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  if (sameDay(d, today)) return `Hari ini, ${date}`;
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (sameDay(d, y)) return `Kemarin, ${date}`;
  return date;
}

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

export default function ChatPage() {
  useRequireAuth();
  const [greeting, setGreeting] = useState(() => buildGreeting(new Date(), 0, null));
  const [quickActions, setQuickActions] = useState(() => buildQuickActions(new Date().getHours()));
  const [messages, setMessages] = useState<StoredMessage[]>([
    { role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await resolveProfile();
      if (!profile) return;
      try {
        const since = startOfToday();
        const until = new Date(since);
        until.setDate(until.getDate() + 1);
        const [metricsRes, foodRes, chatRes] = await Promise.all([
          fetch(`/api/metrics?profileId=${profile.id}`),
          fetch(
            `/api/food?profileId=${profile.id}&from=${since.toISOString()}&to=${until.toISOString()}`
          ),
          fetch(`/api/chat?profileId=${profile.id}`),
        ]);
        const m = await metricsRes.json();
        const food = await foodRes.json();
        const goal = profile.goal || "health";
        let target: number | null = null;
        if (m.metrics?.tdee) target = dailyCalorieTarget(m.metrics.tdee, goal);

        const start = startOfToday().getTime();
        let todayCalories = 0;
        if (Array.isArray(food.entries)) {
          todayCalories = (food.entries as FoodEntry[])
            .filter((e) => new Date(e.createdAt).getTime() >= start)
            .reduce((a, e) => a + e.calories, 0);
        }

        const now = new Date();
        const dynamicGreeting = buildGreeting(now, todayCalories, target);
        if (cancelled) return;
        setGreeting(dynamicGreeting);
        setQuickActions(buildQuickActions(now.getHours()));

        const data = await chatRes.json();
        if (data.messages?.length) {
          setMessages(() => [
            { role: "assistant", content: dynamicGreeting },
            ...data.messages.map((c: StoredMessage) => ({
              role: c.role,
              content: c.content,
              createdAt: c.createdAt,
            })),
          ]);
        } else {
          setMessages([{ role: "assistant", content: dynamicGreeting }]);
        }
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendText(text: string) {
    const profileId = await resolveProfileId();
    if (!profileId || loading) return;
    const userMsg = text.trim();
    setInput("");
    const now = new Date().toISOString();
    setMessages((m) => [...m, { role: "user", content: userMsg, createdAt: now }]);
    setLoading(true);
    setMessages((m) => [...m, { role: "assistant", content: "", createdAt: now }]);

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
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendText(input);
  }

  async function newChat() {
    const profileId = await resolveProfileId();
    if (!profileId) return;
    if (!window.confirm("Mulai chat baru? Riwayat percakapan ini akan dihapus.")) return;
    const res = await fetch(`/api/chat?profileId=${profileId}`, { method: "DELETE" });
    if (res.ok) {
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }

  const hasHistory = messages.length > 1;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M19 12h2M17.4 7.4 18.8 6M12 17v2" />
                  <path d="M8 12h.01M12 12h.01M16 12h.01" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Buddy — Coach Nutrisi</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online, siap bantu soal nutrisi
                </p>
              </div>
            </div>
            {hasHistory && (
              <button
                onClick={newChat}
                disabled={loading}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 transition hover:border-red-200 hover:text-red-500 disabled:opacity-40 dark:border-slate-700"
              >
                + Chat baru
              </button>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-6 py-5 dark:bg-slate-950/40">
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const showSeparator =
                msg.createdAt && (!prev?.createdAt || dayLabel(msg.createdAt) !== dayLabel(prev.createdAt));
              const isUser = msg.role === "user";
              return (
                <div key={i}>
                  {showSeparator && (
                    <div className="mb-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      <span className="text-[11px] font-medium text-slate-400">
                        {dayLabel(msg.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    </div>
                  )}
                  <div className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <span className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                        🤖
                      </span>
                    )}
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? "rounded-br-md bg-emerald-500 text-white"
                          : "rounded-bl-md bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 ring-1 ring-slate-200/70 dark:ring-slate-700 shadow-sm"
                      }`}
                    >
                      {cleanMarkdown(msg.content) || "..."}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex items-end gap-2.5 justify-start">
                <span className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                  🤖
                </span>
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 ring-1 ring-slate-200/70 shadow-sm dark:bg-slate-800 dark:ring-slate-700">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-100 px-4 pt-3 dark:border-slate-800">
            <div className="flex flex-wrap gap-2 pb-3">
              {quickActions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendText(q.replace(/^[^\s]+\s/, ""))}
                  disabled={loading}
                  className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-40 dark:hover:bg-emerald-900/40"
                >
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-3 pb-4">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya apa saja soal makanan & kalori... (misal: berapa kalori rendang?)"
                className="flex-1 rounded-full border border-slate-200 px-5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:opacity-40"
              >
                Kirim
              </button>
            </form>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
