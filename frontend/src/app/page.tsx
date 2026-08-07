import Link from "next/link";

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

function FoodTarget() {
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full">
      <circle cx="120" cy="120" r="108" fill="rgba(16,185,129,0.06)" />
      <rect x="14" y="14" width="212" height="212" rx="14" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="7 8" opacity="0.55" />

      <ellipse cx="120" cy="152" rx="78" ry="22" fill="#333D3C" />
      <ellipse cx="120" cy="150" rx="74" ry="20" fill="#E8ECEF" />
      <ellipse cx="120" cy="147" rx="60" ry="16" fill="#F5F7F9" />

      <ellipse cx="100" cy="136" rx="34" ry="15" fill="#E7E5E4" />
      <ellipse cx="100" cy="132" rx="30" ry="13" fill="#FFFFFF" />
      <ellipse cx="100" cy="129" rx="22" ry="9" fill="#F8FAFC" />

      <g transform="rotate(-18 150 138)">
        <ellipse cx="150" cy="138" rx="21" ry="14" fill="#A16207" />
        <ellipse cx="149" cy="135" rx="15" ry="10" fill="#D97706" />
        <ellipse cx="146" cy="133" rx="6" ry="4" fill="#F59E0B" />
        <circle cx="168" cy="147" r="4.5" fill="#EF4444" />
        <circle cx="171" cy="151" r="3.5" fill="#F87171" />
        <path d="M168 141.5 l0 -3" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="175" cy="147" r="4" fill="#4ADE80" opacity="0.9" />
        <circle cx="175" cy="147" r="2.2" fill="#86EFAC" />
      </g>

      <line x1="48" y1="140" x2="192" y2="140" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
        <animate attributeName="y1" values="112;180;112" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="y2" values="112;180;112" dur="2.2s" repeatCount="indefinite" />
      </line>
      <line x1="48" y1="140" x2="192" y2="140" stroke="#FDE68A" strokeWidth="6" strokeLinecap="round" opacity="0.25">
        <animate attributeName="y1" values="112;180;112" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="y2" values="112;180;112" dur="2.2s" repeatCount="indefinite" />
      </line>

<ellipse cx="70" cy="152" rx="12" ry="5" fill="#16A34A" />
      <ellipse cx="63" cy="148" rx="7" ry="4" fill="#22C55E" transform="rotate(-25 63 148)" />
      <ellipse cx="78" cy="149" rx="7" ry="4" fill="#4ADE80" transform="rotate(20 78 149)" />
    </svg>
  );
}

function PhoneScene() {
  return (
    <>
      <div className="absolute left-1/2 top-3.5 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
      <div className="absolute right-6 top-6 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </div>
      <div className="absolute left-6 top-6 text-[11px] font-bold text-white/90">09:41</div>

      <div className="absolute inset-x-0 top-14 flex justify-center">
        <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400 backdrop-blur">
          Scan makanan
        </p>
      </div>

      <div className="absolute left-1/2 top-1/2 flex w-[210px] -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="relative h-[210px] w-[210px]">
          <div className="anim-ping absolute inset-0 rounded-full border-2 border-emerald-400/40" />
          <div className="absolute inset-0">
            <FoodTarget />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 shadow-lg shadow-emerald-500/30">
          <span className="text-[11px] font-bold text-white">400 kkal</span>
          <span className="text-[9px] font-semibold text-emerald-100">terhitung</span>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#F3FFF8] text-slate-900">
      {/* Soft mint → white gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#F3FFF8] via-[#F7FFFA] to-white" />

      {/* Header */}
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Paham <span className="text-emerald-600">Kalori</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="hidden rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 active:scale-[0.98] sm:inline-flex"
          >
            Daftar gratis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-8 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:py-12">
        {/* Text content */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
            Pantau{" "}
            <span className="bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400 bg-clip-text text-transparent">
              asupan harianmu
            </span>
          </h1>

          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
            Cukup foto untuk cek kalori.
          </p>

          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-9 py-4 text-base font-bold text-white shadow-xl shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-[0.98]"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>

        {/* Phone mockup */}
        <div className="relative mx-auto flex w-full max-w-md items-center justify-center py-2 lg:max-w-none">
          {/* Soft blurred green glow behind phone */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/25 blur-3xl" />

          <div
            className="relative lg:rotate-[5deg]"
            style={{ animation: "float 7s ease-in-out infinite" }}
          >
            {/* Realistic ground shadow */}
            <div className="absolute -bottom-12 left-1/2 h-12 w-72 -translate-x-1/2 rounded-[100%] bg-emerald-900/30 blur-2xl" />

            {/* Phone frame */}
            <div className="relative w-[280px] rounded-[2.7rem] bg-[#1B2026] p-2.5 shadow-2xl shadow-emerald-950/40 ring-1 ring-white/15 lg:w-[300px]">
              <div className="relative aspect-[9/19.4] overflow-hidden rounded-[2.15rem] bg-[#0A0D10]">
                <PhoneScene />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 pb-6 pt-12">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm shadow-md shadow-emerald-500/30">
                      ✨
                    </div>
                    <div className="h-14 w-14 rounded-full border-4 border-emerald-400/70 bg-emerald-400/10" />
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm ring-1 ring-white/20 backdrop-blur">
                      🍽️
                    </div>
                  </div>
                </div>
              </div>
            </div>

            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-emerald-900/5 py-6">
        <p className="text-center text-sm text-slate-400">
          Paham Kalori — bukan pengganti nasihat medis.
        </p>
      </footer>
    </main>
  );
}