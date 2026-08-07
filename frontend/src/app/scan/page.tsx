"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { resolveProfileId } from "@/lib/client/profile-local";
import { imageCompressor } from "@/lib/image";
import { useRequireAuth } from "@/lib/client/use-require-auth";
import { FoodAnalysis, mealTypeForHour } from "@pk/core";
import { nutritionGrade, MACRO_TARGETS } from "@/lib/nutrition-stats";

interface SavedEntry {
  id: string;
  name: string;
  calories: number;
  createdAt: string;
}

const GRADE_LABEL: Record<string, string> = {
  A: "Sangat Baik",
  B: "Cukup Baik",
  C: "Cukup",
  D: "Kurang Baik",
  E: "Perlu Diwaspadai",
};

function recommendations(analysis: FoodAnalysis): string[] {
  const list: string[] = [];
  const protein = analysis.protein ?? 0;
  const fat = analysis.fat ?? 0;
  const carbs = analysis.carbs ?? 0;
  if (protein < MACRO_TARGETS.protein * 0.2) {
    list.push("Tambah sumber protein seperti telur, ayam, atau tahu agar kenyang lebih lama.");
  } else {
    list.push("Kandungan protein cukup baik. Pertahankan porsi protein ini.");
  }
  if (fat > MACRO_TARGETS.fat * 0.15) {
    list.push("Lemak sedikit tinggi — pertimbangkan cara masak panggang/rebus untuk menurunkannya.");
  }
  if (carbs > MACRO_TARGETS.carbs * 0.2) {
    list.push("Seimbangkan karbohidrat dengan sayur dan protein agar gula darah lebih stabil.");
  }
  return list.slice(0, 2);
}

export default function ScanPage() {
  useRequireAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [saved, setSaved] = useState<SavedEntry | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [estimating, setEstimating] = useState(false);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError("");
    setResult(null);
    setSaved(null);
    setEditingName(false);
    try {
      const compressed = await imageCompressor.compress(file);
      setPreview(compressed.dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat gambar.");
    }
  }

  useEffect(() => {
    if (!cameraOpen) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {});
    const started = () => video.play().catch(() => {});
    video.addEventListener("loadedmetadata", started);
    return () => {
      video.removeEventListener("loadedmetadata", started);
    };
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function openCamera() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Kamera tidak didukung di perangkat/browser ini.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Akses kamera ditolak. Izinkan kamera di browser lalu coba lagi."
          : "Tidak bisa mengakses kamera.";
      setError(msg);
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      closeCamera();
      await handleFile(new File([blob], "foto-makanan.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  async function analyze() {
    if (!preview) return;
    setAnalyzing(true);
    setError("");
    setResult(null);
    setSaved(null);
    setEditingName(false);
    try {
      const profileId = await resolveProfileId();
      if (!profileId) throw new Error("Belum ada profil. Selesaikan onboarding dulu ya.");
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, image: preview, mealType: mealTypeForHour(new Date().getHours()) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menganalisis.");
      setResult(data.analysis);
      setSaved(data.saved);
      if (data.analysis && !data.saved) {
        setError("Foto tidak jelas atau bukan makanan. Coba foto ulang ya.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setAnalyzing(false);
    }
  }

  function startEditName() {
    if (!result) return;
    setNameDraft(result.name);
    setEditingName(true);
    setError("");
  }

  async function saveEditedName() {
    const name = nameDraft.trim();
    if (!name || estimating) return;
    setEstimating(true);
    setError("");
    try {
      const profileId = await resolveProfileId();
      if (!profileId) throw new Error("Belum ada profil. Selesaikan onboarding dulu ya.");
      const res = await fetch("/api/food/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui perkiraan.");
      const analysis = data.analysis as FoodAnalysis;
      if (!analysis || analysis.name === "Tidak dapat dikenali" || !analysis.calories) {
        setError("Nama makanan tidak dikenali. Coba tulis lebih spesifik ya.");
        return;
      }
      setResult(analysis);
      setEditingName(false);
      if (saved) {
        const patch = await fetch("/api/food", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: saved.id,
            name: analysis.name,
            calories: analysis.calories,
            protein: analysis.protein,
            carbs: analysis.carbs,
            fat: analysis.fat,
            mealType: analysis.mealType,
          }),
        });
        if (patch.ok) {
          const { entry } = await patch.json();
          setSaved(entry);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setEstimating(false);
    }
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setSaved(null);
    setEditingName(false);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const showUpload = !preview;

  return (
    <AppShell>
      <main className="px-4 pt-5 md:px-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />

        {showUpload ? (
          <UploadView
            dragging={dragging}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onPickGallery={() => fileRef.current?.click()}
            onCapture={openCamera}
          />
        ) : analyzing ? (
          <AnalyzingView onReset={reset} />
        ) : result ? (
          <ResultView
            result={result}
            saved={saved}
            preview={preview!}
            editingName={editingName}
            nameDraft={nameDraft}
            estimating={estimating}
            onNameDraftChange={setNameDraft}
            onStartEdit={startEditName}
            onCancelEdit={() => setEditingName(false)}
            onSaveName={saveEditedName}
            onReset={reset}
          />
        ) : (
          <ActionsView
            preview={preview!}
            onPickGallery={() => fileRef.current?.click()}
            onCapture={openCamera}
            onAnalyze={analyze}
            onReset={reset}
          />
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="h-4" />
      </main>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full object-contain" />
          <div className="flex items-center justify-center gap-6 px-6 py-6">
            <button
              onClick={closeCamera}
              className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              Batal
            </button>
            <button
              onClick={capturePhoto}
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/10 transition hover:bg-white/25"
              aria-label="Ambil foto"
            >
              <span className="h-11 w-11 rounded-full bg-white" />
            </button>
            <span className="w-16" />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function UploadView({
  dragging,
  onDragEnter,
  onDragLeave,
  onDrop,
  onPickGallery,
  onCapture,
}: {
  dragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onPickGallery: () => void;
  onCapture: () => void;
}) {
  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-3xl border-2 p-2 transition ${
        dragging ? "border-[#2E7D32] bg-emerald-50" : "border-transparent"
      }`}
    >
      <button
        onClick={onPickGallery}
        className="mb-3 flex w-full items-center gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:border-emerald-300 hover:shadow-md"
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
            <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-slate-900">Upload dari Galeri</span>
          <span className="block text-[12px] text-slate-400">Pilih foto dari galeri</span>
        </span>
      </button>

      <button
        onClick={onCapture}
        className="mb-5 flex w-full items-center gap-3 rounded-3xl border border-emerald-200/70 bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:border-[#2E7D32] hover:shadow-md"
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-slate-900">Ambil Foto</span>
          <span className="block text-[12px] text-slate-400">Gunakan kamera</span>
        </span>
      </button>

      <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50/70 p-3.5 ring-1 ring-emerald-100">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          </svg>
        </span>
        <p className="text-[12px] leading-snug text-slate-600">
          Foto hanya digunakan untuk analisis AI dan <span className="font-semibold text-slate-800">tidak akan disimpan</span>.
        </p>
      </div>
    </div>
  );
}

function AnalyzingView({ onReset }: { onReset: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <BackButton onClick={onReset} />
        <h1 className="text-lg font-extrabold text-slate-900">Hasil Analisis</h1>
      </div>
      <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-slate-200/70 bg-white px-6 py-14 text-center shadow-sm">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-100 border-t-[#2E7D32]" />
          <span className="text-3xl">🔍</span>
        </div>
        <p className="mt-6 text-[15px] font-bold text-slate-800">Menganalisis makanan...</p>
        <p className="mt-1 text-[12px] text-slate-400">AI menghitung kalori &amp; makronutrien</p>
      </div>
    </div>
  );
}

function ActionsView({
  preview,
  onPickGallery,
  onCapture,
  onAnalyze,
  onReset,
}: {
  preview: string;
  onPickGallery: () => void;
  onCapture: () => void;
  onAnalyze: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <BackButton onClick={onReset} />
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Tambah Makanan</h1>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview}
        alt="Foto makanan"
        className="max-h-72 w-full rounded-3xl bg-slate-100 object-cover shadow-sm"
      />
      <div key="actions" className="mt-4 flex flex-wrap items-center justify-center gap-3 anim-notif-in">
        <button
          onClick={onPickGallery}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Ganti foto
        </button>
        <button
          onClick={onCapture}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          📷 Foto ulang
        </button>
        <button
          onClick={onReset}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-500"
        >
          Hapus
        </button>
        <button
          onClick={onAnalyze}
          className="rounded-xl bg-[#2E7D32] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-700/25 transition hover:bg-emerald-700"
        >
          Hitung Kalori ✨
        </button>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Kembali"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

function ResultView({
  result,
  saved,
  preview,
  editingName,
  nameDraft,
  estimating,
  onNameDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveName,
  onReset,
}: {
  result: FoodAnalysis;
  saved: SavedEntry | null;
  preview: string;
  editingName: boolean;
  nameDraft: string;
  estimating: boolean;
  onNameDraftChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveName: () => void;
  onReset: () => void;
}) {
  const grade = nutritionGrade({
    carbs: result.carbs ?? 0,
    protein: result.protein ?? 0,
    fat: result.fat ?? 0,
    fiber: result.fiber ?? 0,
    sugar: result.sugar ?? 0,
    sodium: result.sodium ?? 0,
  });
  const recs = recommendations(result);
  const gradeColor =
    grade.grade === "A" ? "#2E7D32" : grade.grade === "B" ? "#ca8a04" : grade.grade === "C" ? "#ea580c" : "#dc2626";
  const gradeBg =
    grade.grade === "A" ? "#dcfce7" : grade.grade === "B" ? "#fef9c3" : grade.grade === "C" ? "#ffedd5" : "#fee2e2";

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <BackButton onClick={onReset} />
        <h1 className="text-lg font-extrabold text-slate-900">Hasil Analisis</h1>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt={result.name} className="h-48 w-full object-cover" />

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{result.mealType}</p>
              {editingName ? (
                <div className="mt-1">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => onNameDraftChange(e.target.value)}
                    placeholder="Nama makanan"
                    className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-lg font-bold text-slate-900 outline-none focus:border-emerald-500"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={onCancelEdit}
                      disabled={estimating}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      onClick={onSaveName}
                      disabled={estimating || !nameDraft.trim()}
                      className="rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {estimating ? "Hitung ulang..." : "Simpan & hitung ulang"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-[20px] font-extrabold leading-snug text-slate-900">{result.name}</h2>
                  <button
                    onClick={onStartEdit}
                    title="Koreksi nama makanan"
                    className="shrink-0 rounded-lg p-1 text-slate-300 transition hover:bg-slate-100 hover:text-emerald-600"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{result.note}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[30px] font-extrabold leading-none text-orange-500">
                {result.calories.toLocaleString("id-ID")}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-orange-400">kkal</p>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: gradeBg }}>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[13px] font-extrabold text-white"
              style={{ background: gradeColor }}
            >
              {grade.grade}
            </span>
            <div>
              <p className="text-[12px] font-bold text-slate-800">Grade {grade.grade}</p>
              <p className="text-[11px] font-medium" style={{ color: gradeColor }}>
                {GRADE_LABEL[grade.grade]} · Skor {grade.score}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <MacroBullet label="Karbohidrat" grams={result.carbs ?? 0} color="#2E7D32" />
            <MacroBullet label="Protein" grams={result.protein ?? 0} color="#2563eb" />
            <MacroBullet label="Lemak" grams={result.fat ?? 0} color="#f59e0b" />
          </div>

          {recs.length > 0 && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.3.3.5.8.5 1.2V15h7v-.3c0-.4.2-.9.5-1.2A6 6 0 0 0 12 3Z" />
                  </svg>
                </span>
                <h3 className="text-[14px] font-bold text-slate-900">Rekomendasi AI</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {recs.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-[13px] leading-snug text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                      ✓
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {saved ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100">
          <p className="text-sm font-bold text-emerald-800">✅ Tersimpan ke riwayat</p>
          <div className="mt-2 flex justify-center gap-4 text-xs font-semibold">
            <Link href="/dashboard" className="text-emerald-700 underline">
              Dasbor →
            </Link>
          </div>
        </div>
      ) : (
        <button
          onClick={onReset}
          className="mt-4 w-full rounded-2xl bg-[#2E7D32] py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-700"
        >
          Simpan ke Riwayat
        </button>
      )}
    </div>
  );
}

function MacroBullet({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[13px] font-semibold text-slate-700">{label}</span>
      </div>
      <div>
        <span className="text-sm font-bold text-slate-900">{grams.toLocaleString("id-ID")}</span>
        <span className="ml-0.5 text-[11px] font-medium text-slate-400">g</span>
      </div>
    </div>
  );
}