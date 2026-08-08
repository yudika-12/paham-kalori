import { BANNER_DANGER, BANNER_DANGER_BG } from "@/lib/design";

export default function ErrorBanner({
  children,
  retry,
  onRetry,
}: {
  children: React.ReactNode;
  retry?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-2xl border border-red-100 px-4 py-3"
      style={{ background: BANNER_DANGER_BG, borderColor: "#F6C8C8" }}
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "#FADCDC", color: BANNER_DANGER }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: "#B93A3A" }}>
          {children}
        </p>
        {retry && onRetry ? (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-bold transition hover:bg-white"
            style={{ color: BANNER_DANGER }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Coba lagi
          </button>
        ) : null}
      </div>
    </div>
  );
}