"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const fieldClasses =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-[#0E1114] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/10";

const fieldErrorClasses =
  "border-red-500/70 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:bg-red-950/20 dark:focus:border-red-400 dark:focus:ring-red-500/10";

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
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

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"email" | "password" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      let message = "Email atau password salah.";
      try {
        const check = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const { exists } = await check.json();
        if (exists) {
          message = "Password salah. Periksa kembali kata sandimu.";
          setFieldError("password");
        } else {
          message = "Email tidak terdaftar. Silakan daftar dulu.";
          setFieldError("email");
        }
      } catch {
        setFieldError(null);
      }
      setError(message);
      return;
    }
    const callback = searchParams.get("callbackUrl");
    if (callback) {
      router.push(callback);
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
          Alamat Email
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <MailIcon />
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@gmail.com"
            list="email-suggestions"
            required
            className={`${fieldClasses} ${fieldError === "email" ? fieldErrorClasses : ""}`}
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
        <label className="mb-1 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
          Password
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <LockIcon />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={`${fieldClasses} ${fieldError === "password" ? fieldErrorClasses : ""}`}
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
      </div>

      {error && (
        <div
          role="alert"
          className="anim-notif-in flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertIcon />
          <div className="flex-1">
            <p className="font-extrabold">Gagal Masuk</p>
            <p className="mt-0.5 leading-snug">{error}</p>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-[0.99] disabled:opacity-60 dark:hover:bg-emerald-400"
      >
        {loading ? "Memeriksa..." : "MASUK SEKARANG"}
      </button>

      <p className="text-center text-[13px] text-slate-500 dark:text-slate-400">
        Belum punya akun?{" "}
        <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
          Daftar gratis
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  const router = useRouter();
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

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16 pt-6">
        <div className="w-full max-w-sm">
          <div className="mb-5 text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Masuk
            </h1>
            <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400">
              Lanjutkan perjalananmu.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100 dark:border dark:border-white/10 dark:bg-[#161B20] dark:shadow-2xl dark:shadow-black/40">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-5 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Paham Kalori — bukan pengganti nasihat medis.
          </p>
        </div>
      </main>
    </div>
  );
}
