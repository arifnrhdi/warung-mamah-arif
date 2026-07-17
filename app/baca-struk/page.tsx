"use client";

import { useState } from "react";
import Tesseract from "tesseract.js";
import { db } from "@/lib/dexie";
import { ChevronLeft, Camera, FileText, Loader2, Sparkles, Save, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BacaStrukPage() {
  const router = useRouter();
  const [gambar, setGambar] = useState<string | null>(null);
  const [teks, setTeks] = useState("");
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState("");
  const [baristTotal, setBarisTotal] = useState("");

  /** Cari baris yang mengandung kata "total", ambil angka terakhir di baris itu. */
  function cariTotalDariTeks(teksOcr: string): { angka: number | null; baris: string | null } {
    const baris = teksOcr
      .split("\n")
      .find((line) => /total/i.test(line));

    if (!baris) return { angka: null, baris: null };

    const angkaDitemukan = baris.match(/[\d.,]+/g);
    if (!angkaDitemukan) return { angka: null, baris };

    const mentah = angkaDitemukan[angkaDitemukan.length - 1].replace(/[.,]/g, "");
    const angka = parseInt(mentah, 10);
    return { angka: Number.isFinite(angka) ? angka : null, baris };
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setGambar(URL.createObjectURL(file));
    setTeks("");
    setTotal("");
    setBarisTotal("");
    setLoading(true);

    try {
      const result = await Tesseract.recognize(file, "ind");
      const teksOcr = result.data.text.trim();
      setTeks(teksOcr);

      const { angka, baris } = cariTotalDariTeks(teksOcr);
      if (angka !== null) setTotal(String(angka));
      if (baris) setBarisTotal(baris.trim());
    } catch (error) {
      console.error("Gagal memproses gambar:", error);
      alert("Gagal membaca struk. Pastikan gambar cukup jelas.");
    } finally {
      setLoading(false);
    }
  }

  async function simpanBelanja() {
    const jumlah = Number(total);
    if (!jumlah || jumlah <= 0) return;

    await db.pengeluaran.add({
      tanggal: new Date(),
      keterangan: baristTotal ? `Belanja (${baristTotal})` : "Belanja (dari struk)",
      jumlah,
    });

    alert("Belanja berhasil disimpan!");
    setGambar(null);
    setTeks("");
    setTotal("");
    setBarisTotal("");
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F9FBFA] pb-24 font-sans antialiased text-gray-800">
      {/* 1. Header Navigasi */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>
          <h1 className="font-bold text-lg text-gray-900">Scan Struk Belanja</h1>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* 2. Area Scanner Foto Struk */}
        <label className="relative block bg-white border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-3xl p-6 text-center cursor-pointer transition-all shadow-xs overflow-hidden group">
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />

          {gambar ? (
            <div className="relative inline-block max-w-full">
              <img src={gambar} alt="Struk" className="max-h-64 mx-auto rounded-2xl object-contain shadow-md" />

              {/* Animasi Sinar Laser Pemindai saat Loading */}
              {loading && (
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-emerald-500/30 to-transparent w-full h-8 animate-bounce" />
              )}
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 border-2 border-gray-300 rounded-xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#218152] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Camera size={48} className="stroke-2" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Ambil Foto Struk</p>
                <p className="text-xs text-gray-400 mt-1">Ketuk untuk membuka kamera atau galeri</p>
              </div>
            </div>
          )}
        </label>

        {/* 3. Loading State dengan Animasi Putar */}
        {loading && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#218152] animate-spin" />
            <p className="text-sm font-semibold text-gray-600">AI sedang memproses teks struk...</p>
          </div>
        )}

        {/* 4. Tampilan Hasil Bacaan ala "Kertas Struk" */}
        {teks && !loading && (
          <div className="relative bg-white rounded-t-2xl shadow-xs border border-gray-100 overflow-hidden">
            {/* Header Kertas Struk */}
            <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center gap-2">
              <FileText size={16} className="text-[#218152]" />
              <p className="text-xs font-bold text-gray-500 tracking-wider uppercase">Teks Terdeteksi</p>
            </div>

            {/* Isi Teks Struk */}
            <div className="p-5 space-y-1.5 max-h-64 overflow-y-auto bg-neutral-50/50 font-mono text-xs text-neutral-700 leading-relaxed">
              {teks
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .map((line, i) => (
                  <p key={i} className="border-b border-neutral-100/40 pb-1">
                    {line}
                  </p>
                ))}
            </div>

            {/* Efek Bergerigi kertas di bagian bawah */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[radial-gradient(ellipse_at_bottom,var(--tw-gradient-stops))] from-neutral-200 via-white to-white bg-size-[10px_6px] bg-repeat-x" />
          </div>
        )}

        {/* 5. Bagian Catat Total Belanja */}
        {teks && !loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500 fill-amber-500" />
              <p className="text-xs font-bold text-gray-500 tracking-wider uppercase">Catat ke Pengeluaran</p>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <span className="absolute left-4 top-3 text-sm font-semibold text-gray-400">Rp</span>
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="total belanja"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold focus:outline-hidden focus:border-[#218152] focus:bg-white transition-all placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={simpanBelanja}
                className="bg-[#218152] hover:bg-[#1a6641] active:scale-95 text-white rounded-2xl px-6 flex items-center justify-center gap-2 font-bold transition-all shadow-md shadow-emerald-700/10"
              >
                <Save size={16} />
                <span className="text-base font-semibold">Simpan</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
