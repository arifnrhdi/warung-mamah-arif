"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/dexie";
import { useRouter } from "next/navigation";
import { ChevronLeft, Store, Database, ShieldAlert, Save, Download, Upload, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [namaWarung, setNamaWarung] = useState("");
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNamaWarung(localStorage.getItem("namaWarung") ?? "Warung Mamah");
    setLastBackup(localStorage.getItem("lastBackup"));
  }, []);

  function simpanProfil() {
    localStorage.setItem("namaWarung", namaWarung);
    alert("Profil disimpan.");
  }

  async function resetData() {
    if (
      !confirm(
        "Semua data penjualan (transaksi, utang, pengeluaran, pembayaran) akan dihapus. Data barang tidak akan terhapus. Yakin?",
      )
    )
      return;
    if (!confirm("Ini tidak bisa dibatalkan. Lanjutkan?")) return;

    await db.transaction("rw", [db.transaksi, db.hutang, db.pengeluaran, db.pembayaran], async () => {
      await Promise.all([db.transaksi.clear(), db.hutang.clear(), db.pengeluaran.clear(), db.pembayaran.clear()]);
    });

    alert("Data penjualan telah direset. Data barang tetap tersimpan.");
  }

  async function backup() {
    const data = {
      transaksi: await db.transaksi.toArray(),
      pelanggan: await db.pelanggan.toArray(),
      hutang: await db.hutang.toArray(),
      pengeluaran: await db.pengeluaran.toArray(),
      pembayaran: await db.pembayaran.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warung-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const now = new Date().toLocaleString("id-ID");
    localStorage.setItem("lastBackup", now);
    setLastBackup(now);
  }

  async function restore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Ini akan menimpa transaksi, pelanggan, utang, pengeluaran & pembayaran saat ini (data barang tidak berubah). Lanjutkan?")) return;

    const text = await file.text();
    const data = JSON.parse(text);

    await db.transaction(
      "rw",
      [db.transaksi, db.pelanggan, db.hutang, db.pengeluaran, db.pembayaran],
      async () => {
      await Promise.all([
        db.transaksi.clear(),
        db.pelanggan.clear(),
        db.hutang.clear(),
        db.pengeluaran.clear(),
        db.pembayaran.clear(),
      ]);
      await Promise.all([
        db.transaksi.bulkAdd(data.transaksi ?? []),
        db.pelanggan.bulkAdd(data.pelanggan ?? []),
        db.hutang.bulkAdd(data.hutang ?? []),
        db.pengeluaran.bulkAdd(data.pengeluaran ?? []),
        db.pembayaran.bulkAdd(data.pembayaran ?? []),
      ]);
      },
    );

    alert("Data berhasil dipulihkan.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Wrapper lokal untuk mengamankan eksekusi dari window.backup bawaan browser
  const handleBackupClick = (e: React.MouseEvent) => {
    e.preventDefault();
    backup();
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F9FBFA] pb-28 font-sans antialiased text-gray-800">
      {/* 1. Header Navigasi */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between z-10">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <h1 className="font-bold text-lg text-gray-900 text-center flex-1 pr-6">Pengaturan</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Profil Warung */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-1 border-b border-gray-50">
            <Store size={18} className="text-[#218152]" />
            <h2 className="font-bold text-sm text-gray-900">Profil Toko</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1.5">NAMA WARUNG</label>
              <input
                value={namaWarung}
                onChange={(e) => setNamaWarung(e.target.value)}
                placeholder="Masukkan nama warung..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-hidden focus:border-[#218152] focus:bg-white transition-all placeholder:text-gray-400 text-gray-900"
              />
            </div>

            <button
              onClick={simpanProfil}
              className="w-full bg-[#218152] hover:bg-[#1a6641] active:scale-98 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Save size={14} />
              Simpan Profil
            </button>
          </div>
        </div>

        {/* 3. Backup & Sinkronisasi */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-gray-50">
            <div className="flex items-center gap-2.5">
              <Database size={18} className="text-[#218152]" />
              <h2 className="font-bold text-sm text-gray-900">Backup & Sinkronisasi</h2>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Status Cadangan</p>
            <p className="text-xs font-semibold text-gray-600 bg-gray-50 py-1 rounded-lg border border-gray-100">
              {lastBackup ? `Terakhir backup: ${lastBackup}` : "Belum pernah backup"}
            </p>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleBackupClick}
              className="flex-1 bg-[#218152] hover:bg-[#1a6641] active:scale-98 text-white rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Download size={14} />
              Backup Data
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Upload size={14} />
              Pulihkan Data
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={restore} className="hidden" />
        </div>

        {/* 4. Reset Data Penjualan (Danger Zone) */}
        <div className="bg-red-50/20 border border-red-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-1 border-b border-red-50">
            <ShieldAlert size={18} className="text-red-500" />
            <h2 className="font-bold text-sm text-red-600">Reset Data Penjualan</h2>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-red-600/80 leading-relaxed font-medium">
              Menghapus transaksi, utang, dan pengeluaran. Tindakan ini tidak bisa dibatalkan secara manual.
            </p>

            <button
              onClick={resetData}
              className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-xs"
            >
              <Trash2 size={14} />
              Reset Data Penjualan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
