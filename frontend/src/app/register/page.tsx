"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ActivityLevel, Goal, calcMetrics } from "@pk/core";
import { setProfileId } from "@/lib/client/profile-local";

type StrengthLevel = 0 | 1 | 2 | 3;

function getStrength(pw: string): StrengthLevel {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/(?=.*[A-Za-z])(?=.*\d)/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score as StrengthLevel;
}

function strengthHint(strength: StrengthLevel): string {
  if (strength === 1) return "Kekuatan: lemah — tambahkan angka biar lebih kuat.";
  if (strength === 2) return "Kekuatan: cukup kuat — tambahkan angka & simbol biar lebih kuat.";
  if (strength === 3) return "Kekuatan: kuat. Passwordmu sudah aman 💪";
  return "Kekuatan: —";
}

const STEPS = ["Akun", "Data diri", "Tujuan"];

const activityOptions: { value: ActivityLevel; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "sedentary", label: "Jarang bergerak", desc: "Banyak duduk, kerja depan komputer", icon: <SedentaryIcon /> },
  { value: "light", label: "Cukup aktif", desc: "Sesekali jalan kaki / naik tangga", icon: <LightIcon /> },
  { value: "moderate", label: "Aktif", desc: "Rutin aktivitas fisik 1-3x seminggu", icon: <ActiveIcon /> },
  { value: "active", label: "Sangat aktif", desc: "Aktivitas fisik hampir setiap hari", icon: <VeryActiveIcon /> },
];

const goalOptions: { value: Goal; label: string; emoji: string }[] = [
  { value: "lose", label: "Turunkan berat badan", emoji: "⚖️" },
  { value: "health", label: "Jaga pola makan sehat", emoji: "💚" },
  { value: "muscle", label: "Bangun massa otot", emoji: "💪" },
];

const fieldClasses =
  "h-12 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-[#0E1114] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/10";

const labelClasses = "mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300";

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
      {children}
    </span>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="m2 2 20 20" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="9" width="18" height="6" rx="2" />
      <path d="M7 12v-1M11 12v2M15 12v-1M19 12v1" />
    </svg>
  );
}

function WeightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="5" r="2.2" />
      <path d="M6.5 21a2 2 0 0 1-1.9-2.6L7 9h10l2.4 9.4a2 2 0 0 1-1.9 2.6Z" />
      <path d="M12 5v4" />
    </svg>
  );
}

function GenderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="6" cy="12" r="2.6" />
      <path d="M3 21c0-2 1.5-3 3-3s3 1 3 3" />
      <path d="M16.4 4h4v4M20 4l-7 7" />
      <circle cx="18" cy="16" r="2.6" />
      <path d="M15 21c0-2 1.5-3 3-3s3 1 3 3" />
    </svg>
  );
}

function SedentaryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3" y="12" width="18" height="8" rx="2" />
      <path d="M6 20V9a6 6 0 0 1 12 0v11" />
      <path d="M3 12h18" />
    </svg>
  );
}

function LightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="14" cy="6" r="2" />
      <path d="M12 9l-2 5 3 2 .5 4M9 21l0.5-5 3-2" />
      <path d="M6 21l1-5 2-2" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 12 17 8" />
      <path d="M12 12l-3-4" />
      <path d="M3.5 12H7M20.5 12H17" />
    </svg>
  );
}

function VeryActiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M13 2 3 14h7l-1 8L20 10h-7l1-8Z" />
    </svg>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="7" fill="url(#logoGrad)" />
      <path d="M7.5 14.5c2.5 2.5 6.5 2.5 9 0-1-1-2.5-1.5-4.5-1s-3 .5-4.5 1Z" fill="#fff" />
      <path d="M8.5 7c.5 1.5 1.5 3 3.5 3s3-1.5 3.5-3c-1-.5-2.5-.5-3.5.5-.5-1-2.5-1.5-3.5-.5Z" fill="#fff" opacity="0.9" />
      <path d="M12 10v3.5" stroke="#10B981" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"laki-laki" | "perempuan">("laki-laki");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<Goal>("health");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = getStrength(password);
  const segments = [1, 2, 3] as const;
  const maxStep = STEPS.length - 1;

  const canNext =
    step === 0
      ? name.trim() !== "" && email.includes("@") && password.length >= 8
      : step === 1
        ? Number(age) >= 12 && Number(age) <= 100 &&
          Number(height) >= 100 && Number(height) <= 250 &&
          Number(weight) >= 25 && Number(weight) <= 250
        : true;

  function validateStep(): boolean {
    if (step === 0) {
      if (!name.trim() || !email || !password) {
        setError("Lengkapi nama, email, dan password.");
        return false;
      }
      if (!email.includes("@")) {
        setError("Format email tidak valid.");
        return false;
      }
      if (password.length < 8) {
        setError("Password minimal 8 karakter.");
        return false;
      }
      setError("");
      return true;
    }
    if (step === 1) {
      const a = Number(age);
      const h = Number(height);
      const w = Number(weight);
      if (!a || !h || !w) {
        setError("Lengkapi umur, tinggi, dan berat badanmu.");
        return false;
      }
      if (a < 12 || a > 100) {
        setError("Umur sepertinya tidak valid (12-100).");
        return false;
      }
      if (h < 100 || h > 250) {
        setError("Tinggi badan sepertinya tidak valid (100-250 cm).");
        return false;
      }
      if (w < 25 || w > 250) {
        setError("Berat badan sepertinya tidak valid (25-250 kg).");
        return false;
      }
      setError("");
      return true;
    }
    return true;
  }

  function goNext() {
    if (!validateStep()) return;
    setStep((s) => Math.min(maxStep, s + 1));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const reg = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          age: Number(age),
          gender,
          height: Number(height),
          weight: Number(weight),
          activityLevel,
          goal,
        }),
      });
      const regData = await reg.json().catch(() => ({}));
      if (!reg.ok) throw new Error(regData.error || "Gagal mendaftar");

      const sres = await signIn("credentials", { email, password, redirect: false });
      if (sres?.error) throw new Error("Gagal masuk setelah mendaftar.");

      if (regData.profileId) setProfileId(regData.profileId);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  const metrics =
    age && height && weight
      ? calcMetrics({
          age: Number(age),
          gender,
          height: Number(height),
          weight: Number(weight),
          activityLevel,
        })
      : null;

  const active = step;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#EDFCF7] via-[#F5FEFA] to-white text-slate-900 dark:text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[26rem] w-[26rem] rounded-full bg-teal-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-emerald-100/40 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            Paham <span className="text-emerald-600 dark:text-emerald-400">Kalori</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-10 pt-6">
        <div className="w-full max-w-lg">
          <div className="mb-5 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Daftar
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Buat akun &amp; mulai sekarang.
            </p>
          </div>

          <div className="mb-6 flex items-center">
            {STEPS.map((label, i) => {
              const done = i < active;
              const isActive = i === active;
              return (
                <Fragment key={label}>
                  {i > 0 && (
                    <span
                      className={`mx-1.5 h-1 flex-1 rounded-full transition-colors ${
                        done || isActive ? "bg-emerald-500" : "bg-slate-200 dark:bg-white/10"
                      }`}
                    />
                  )}
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                        isActive
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/15"
                          : done
                            ? "bg-emerald-500/80 text-white"
                            : "bg-slate-100 text-slate-400 ring-1 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:ring-white/10"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={`text-[10px] font-semibold ${isActive ? "text-emerald-600 dark:text-emerald-400" : done ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
                      {label}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100 dark:border dark:border-white/10 dark:bg-[#161B20] dark:shadow-2xl dark:shadow-black/40">
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Buat akunmu.</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nama, email, dan password untuk login.</p>
                </div>

                <div>
                  <label className={labelClasses}>Nama lengkap</label>
                  <div className="relative">
                    <FieldIcon><UserIcon /></FieldIcon>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="contoh: Budi Santoso"
                      list="name-suggestions"
                      className={`${fieldClasses} pl-11`}
                    />
                    <datalist id="name-suggestions">
                      <option value="Budi Santoso" />
                      <option value="Siti Rahayu" />
                      <option value="Andi Pratama" />
                      <option value="Dewi Lestari" />
                      <option value="Rizky Ramadhan" />
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>Alamat Email</label>
                  <div className="relative">
                    <FieldIcon><MailIcon /></FieldIcon>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="kamu@gmail.com"
                      list="email-suggestions"
                      className={`${fieldClasses} pl-11`}
                    />
                    <datalist id="email-suggestions">
                      <option value="kamu@gmail.com" />
                      <option value="nama@gmail.com" />
                      <option value="kamu@yahoo.com" />
                      <option value="kamu@outlook.com" />
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>Password</label>
                  <div className="relative">
                    <FieldIcon><LockIcon /></FieldIcon>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className={`${fieldClasses} pl-11 pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <EyeIcon off={showPassword} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {segments.map((seg) => (
                        <span
                          key={seg}
                          className="h-1.5 flex-1 rounded-full transition-colors"
                          style={{ backgroundColor: seg <= strength ? "#10B981" : "rgba(15,23,42,0.1)" }}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{strengthHint(strength)}</p>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Data dirimu.</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Biar target kalorimu akurat.</p>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Tingkat aktivitas</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {activityOptions.map((opt) => {
                      const selected = activityLevel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setActivityLevel(opt.value)}
                          className={`rounded-2xl border-2 p-3 text-left transition ${
                            selected
                              ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10"
                              : "border-slate-200 bg-white hover:border-emerald-400/40 hover:bg-emerald-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-emerald-400/40 dark:hover:bg-emerald-400/5"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                              selected
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-400 dark:bg-white/5"
                            }`}
                          >
                            {opt.icon}
                          </span>
                          <p className={`mt-2 truncate text-sm font-bold ${selected ? "text-emerald-600 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>
                            {opt.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Umur</label>
                    <div className="relative">
                      <FieldIcon><CalendarIcon /></FieldIcon>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="25"
                        className={`${fieldClasses} pl-11 pr-14`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-slate-400">
                        tahun
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Gender</label>
                    <div className="relative">
                      <FieldIcon><GenderIcon /></FieldIcon>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as "laki-laki" | "perempuan")}
                        className={`${fieldClasses} appearance-none pl-11 pr-10 capitalize`}
                      >
                        <option value="laki-laki">Laki-laki</option>
                        <option value="perempuan">Perempuan</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Tinggi (cm)</label>
                    <div className="relative">
                      <FieldIcon><RulerIcon /></FieldIcon>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="165"
                        className={`${fieldClasses} pl-11 pr-14`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-slate-400">
                        cm
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Berat (kg)</label>
                    <div className="relative">
                      <FieldIcon><WeightIcon /></FieldIcon>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="60"
                        className={`${fieldClasses} pl-11 pr-14`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-slate-400">
                        kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Apa tujuan utamamu?</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kami sesuaikan target kalori harian dengan tujuan ini.</p>
                </div>
                <div className="space-y-2">
                  {goalOptions.map((opt) => {
                    const selected = goal === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setGoal(opt.value)}
                        className={`flex w-full items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left transition ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10"
                            : "border-slate-200 bg-white hover:border-emerald-400/40 hover:bg-emerald-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-emerald-400/40 dark:hover:bg-emerald-400/5"
                        }`}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className={`flex-1 text-base font-bold ${selected ? "text-emerald-600 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>
                          {opt.label}
                        </span>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${selected ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500" : "border-slate-300 dark:border-white/20"}`}>
                          {selected && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-3 w-3">
                              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {metrics && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                    <p className="text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      BMI <b>{metrics.bmi}</b> • {metrics.bmiCategory}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white p-3 text-center ring-1 ring-emerald-500/10 dark:bg-white/[0.04] dark:ring-0">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Target kalori</p>
                        <p className="mt-0.5 text-base font-extrabold text-emerald-600 dark:text-emerald-300">
                          ±{metrics.tdee} kkal
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center ring-1 ring-emerald-500/10 dark:bg-white/[0.04] dark:ring-0">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tujuan</p>
                        <p className="mt-0.5 text-base font-extrabold text-emerald-600 dark:text-emerald-300">
                          {goalOptions.find((o) => o.value === goal)?.label}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">{error}</p>}

            <div className="mt-7 space-y-3">
              {step < maxStep ? (
                <button
                  onClick={goNext}
                  disabled={!canNext}
                  className="w-full rounded-2xl bg-emerald-500 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-emerald-400"
                >
                  Lanjut
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-[0.99] disabled:opacity-50 dark:hover:bg-emerald-400"
                >
                  {loading ? "Mendaftar..." : "Daftar ✨"}
                </button>
              )}
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
            Paham Kalori — bukan pengganti nasihat medis.
          </p>
        </div>
      </main>
    </div>
  );
}
