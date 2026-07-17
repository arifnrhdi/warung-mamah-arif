"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { Settings, ScanText, ChevronRight, TrendingUp, TrendingDown, ShoppingBag, Download } from "lucide-react";
import { db } from "@/lib/dexie";

function isToday(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 4 && hour < 11) return "Pagi";
  if (hour >= 11 && hour < 15) return "Siang";
  if (hour >= 15 && hour < 18) return "Sore";
  return "Malam";
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function formatRp(value: number | undefined) {
  return value === undefined ? "…" : value.toLocaleString("id-ID");
}

export default function DashboardPage() {
  const [isStandalone, setIsStandalone] = useState<boolean | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function installApp() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  const ringkasan = useLiveQuery(async () => {
    const transaksi = await db.transaksi.toArray();
    const hariIni = transaksi.filter((t) => isToday(new Date(t.tanggal)));
    const tunaiHariIni = hariIni.filter((t) => t.metode === "tunai");

    const penjualanTunai = tunaiHariIni.reduce((sum, t) => sum + t.total, 0);

    const semuaPembayaran = await db.pembayaran.toArray();
    const pembayaranHariIni = semuaPembayaran.filter((p) => isToday(new Date(p.tanggal)));
    const totalPembayaranHariIni = pembayaranHariIni.reduce((sum, p) => sum + p.jumlah, 0);

    const penjualanHariIni = penjualanTunai + totalPembayaranHariIni;

    const barang = await db.barang.toArray();
    const barangMap = new Map(barang.map((b) => [b.id, b]));
    let laba = 0;
    for (const t of tunaiHariIni) {
      for (const item of t.items) {
        const b = barangMap.get(item.barangId);
        if (b) laba += (item.hargaJual - b.hargaBeli) * item.qty;
      }
    }

    const semuaHutang = await db.hutang.toArray();
    const hutangMap = new Map(semuaHutang.map((h) => [h.id, h]));
    const transaksiMap = new Map(transaksi.map((t) => [t.id, t]));

    // Laba dari pelunasan hutang hari ini: alokasikan proporsional dari margin transaksi asalnya,
    // karena barang di transaksi hutang belum masuk hitungan laba tunai di atas.
    for (const p of pembayaranHariIni) {
      const h = hutangMap.get(p.hutangId);
      const t = h ? transaksiMap.get(h.transaksiId) : undefined;
      if (!t || t.total <= 0) continue;

      let profitTransaksi = 0;
      for (const item of t.items) {
        const b = barangMap.get(item.barangId);
        if (b) profitTransaksi += (item.hargaJual - b.hargaBeli) * item.qty;
      }
      laba += p.jumlah * (profitTransaksi / t.total);
    }

    const hutang = semuaHutang.filter((h) => !h.lunas);
    const utangBelumLunas = hutang.reduce((sum, h) => sum + (h.jumlah - h.dibayar), 0);
    const pelangganBerutang = new Set(hutang.map((h) => h.pelangganId)).size;
    const pelangganList = await db.pelanggan.toArray();
    const pelangganMap = new Map(pelangganList.map((p) => [p.id, p.nama]));

    const transaksiTerakhir = transaksi
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
      .slice(0, 3)
      .map((t) => ({
        ...t,
        namaPelanggan: t.pelangganId ? pelangganMap.get(t.pelangganId) : null,
      }));

    const pengeluaran = await db.pengeluaran.orderBy("tanggal").reverse().first();

    return {
      penjualanHariIni,
      laba,
      utangBelumLunas,
      pelangganBerutang,
      belanjaTerakhir: pengeluaran?.jumlah ?? 0,
      belanjaTerakhirTanggal: pengeluaran ? new Date(pengeluaran.tanggal).toLocaleDateString("id-ID") : null,
      transaksiTerakhir,
    };
  }, []);

  if (isStandalone === null) {
    return <div className="max-w-md mx-auto min-h-screen bg-[#F9FBFA]" />;
  }

  if (isStandalone === false) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#F9FBFA] font-sans antialiased flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#218152] text-white flex items-center justify-center shadow-lg shadow-emerald-700/20 mb-5">
          <ShoppingBag size={40} strokeWidth={2} />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Warung Mamah</h1>
        <p className="text-gray-500 text-sm mt-1.5 mb-8">Aplikasi Kasir & Utang untuk Warung Mamah Arif</p>

        {deferredPrompt ? (
          <button
            onClick={installApp}
            className="w-full bg-[#218152] hover:bg-[#166940] active:scale-[0.99] transition-all text-white rounded-2xl py-4 text-center font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-700/10"
          >
            <Download size={18} />
            Download Aplikasi
          </button>
        ) : (
          <div className="w-full bg-white border border-gray-100 rounded-2xl p-5 shadow-xs text-left space-y-2">
            <p className="text-xs font-bold text-gray-700">Cara install ke HP:</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Buka menu browser (⋮ di Chrome, atau tombol Share di Safari), lalu pilih{" "}
              <span className="font-semibold text-gray-700">&quot;Tambahkan ke Layar Utama&quot;</span> /{" "}
              <span className="font-semibold text-gray-700">&quot;Install aplikasi&quot;</span>.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F9FBFA] pb-20 font-sans antialiased">
      {/* 1. Header (Selamat Pagi, Mamah) */}
      <div className="p-5 pb-2 flex justify-between items-center bg-white">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
            Selamat {getGreeting?.() ?? "Pagi"}, Mamah
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">Semangat berjualan hari ini!</p>
        </div>
        <Link
          href="/settings"
          className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Settings size={22} />
        </Link>
      </div>

      <div className="p-5 pt-2 space-y-4">
        {/* 2. Kartu Penjualan Hari Ini (Hijau Khas Warung Mamah) */}
        <div className="relative overflow-hidden bg-[#2D8A5E] text-white rounded-2xl p-6 shadow-md shadow-emerald-800/10">
          <p className="text-xs font-medium text-white/80 mb-1">Penjualan Hari Ini</p>
          <p className="text-3xl font-extrabold tracking-tight">
            Rp {formatRp(ringkasan?.penjualanHariIni)}
          </p>
          {/* Ilustrasi Kantong Belanja di Pojok Kanan Bawah */}
          <div className="absolute right-4 bottom-3 opacity-20 pointer-events-none">
            <ShoppingBag size={80} strokeWidth={1} />
          </div>
        </div>

        {/* 3. Grid Informasi (Utang & Belanja Terakhir) */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Kartu Utang (Oranye) */}
          <Link
            href="/hutang"
            className="bg-[#FF6D2B] text-white rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:opacity-95 transition-opacity"
          >
            <div>
              <p className="text-xs text-white/95 font-medium mb-2">Utang Belum Lunas</p>
              <p className="text-lg font-extrabold">Rp {formatRp(ringkasan?.utangBelumLunas)}</p>
            </div>
            <p className="text-[11px] text-[#FF6D2B] font-bold mt-3 bg-white self-start px-2 py-0.5 rounded-full shadow-sm">
              {ringkasan?.pelangganBerutang ?? 0} Pelanggan
            </p>
          </Link>

          {/* Kartu Belanja Terakhir (Kuning Lembut / Cream) */}
          <Link
            href="/baca-struk"
            className="bg-[#FFF9E6] border border-[#FAD05C]/30 text-amber-950 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:opacity-95 transition-opacity"
          >
            <div>
              <p className="text-xs text-amber-900/80 font-medium mb-2">Belanja Terakhir</p>
              <p className="text-lg font-extrabold text-amber-950">
                Rp {formatRp(ringkasan?.belanjaTerakhir)}
              </p>
            </div>
            <p className="text-[11px] text-amber-800 font-semibold mt-3 truncate">
              {ringkasan?.belanjaTerakhirTanggal ?? "Belum ada"}
            </p>
          </Link>
        </div>

        {/* 4. Kartu Laba Hari Ini (Desain Tipis & Minimalis) */}
        <div className="border border-gray-150 rounded-2xl p-4 flex justify-between items-center bg-white shadow-sm">
          <div>
            <p className="text-xs text-blue-700/70 font-medium mb-1">Laba Hari Ini</p>
            <p className={`text-xl font-extrabold ${(ringkasan?.laba ?? 0) < 0 ? "text-red-600" : "text-blue-900"}`}>
              Rp {Math.abs(ringkasan?.laba ?? 0).toLocaleString("id-ID")}
            </p>
            {(ringkasan?.laba ?? 0) < 0 && <p className="text-[10px] text-red-500 font-medium mt-0.5">Rugi hari ini</p>}
          </div>

          {(ringkasan?.laba ?? 0) >= 0 ? (
            <div className="text-blue-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <TrendingUp size={28} strokeWidth={2.5} />
            </div>
          ) : (
            <div className="text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100">
              <TrendingDown size={28} strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* 5. Tombol Utama: Mulai Jualan (Diletakkan di Tengah Sesuai Desain UX) */}
        <Link
          href="/kasir"
          className="bg-[#218152] hover:bg-[#166940] active:scale-[0.99] transition-all text-white rounded-2xl py-4 text-center font-extrabold block text-base shadow-md shadow-emerald-700/10"
        >
          Mulai Jualan
        </Link>

        {/* 6. Baca Struk Belanja (Grosir/OCR) */}
        <Link
          href="/baca-struk"
          className="bg-[#F1F9F4] hover:bg-[#e7f5eb] rounded-2xl p-4 shadow-sm border border-[#218152]/10 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[#218152] flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
              <ScanText size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Baca Struk Belanja</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {ringkasan?.belanjaTerakhirTanggal
                  ? `Terakhir: Rp ${(ringkasan.belanjaTerakhir ?? 0).toLocaleString("id-ID")} · ${ringkasan.belanjaTerakhirTanggal}`
                  : "Foto struk untuk input otomatis"}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400 shrink-0" />
        </Link>

        {/* 7. Daftar Transaksi Terakhir */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 text-sm">Transaksi Terakhir</h2>
            <Link href="/riwayat" className="text-xs text-[#2D8A5E] font-bold hover:underline">
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-2.5">
            {ringkasan?.transaksiTerakhir?.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-3.5 flex items-center justify-between shadow-sm border border-gray-100 hover:border-gray-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      t.metode === "tunai"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-orange-50 text-orange-600 border border-orange-100"
                    }`}
                  >
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {t.items.length} barang{t.namaPelanggan ? ` · ${t.namaPelanggan}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(t.tanggal).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-extrabold text-gray-900">Rp {t.total.toLocaleString("id-ID")}</p>
              </div>
            ))}

            {(!ringkasan?.transaksiTerakhir || ringkasan.transaksiTerakhir.length === 0) && (
              <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-xs">Belum ada transaksi hari ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
