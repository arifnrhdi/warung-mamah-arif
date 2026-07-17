"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { db } from "@/lib/dexie";
import { alokasikanPembayaran } from "@/lib/utils";
import { ChevronLeft, Pencil, Check, X } from "lucide-react";

// Daftar kombinasi warna background dan teks yang lembut & ramah di mata
const COLORS = [
  { bg: "bg-orange-100", text: "text-orange-600" },
  { bg: "bg-blue-100", text: "text-blue-600" },
  { bg: "bg-purple-100", text: "text-purple-600" },
  { bg: "bg-pink-100", text: "text-pink-600" },
  { bg: "bg-cyan-100", text: "text-cyan-600" },
  { bg: "bg-indigo-100", text: "text-indigo-600" },
  { bg: "bg-rose-100", text: "text-rose-600" },
  { bg: "bg-amber-100", text: "text-amber-600" },
];

// Fungsi untuk menentukan warna berdasarkan ID agar warnanya selalu konsisten & tidak berubah saat refresh
function getAvatarColor(id: number) {
  const index = Math.abs(id) % COLORS.length;
  return COLORS[index];
}

export default function DetailHutangPage() {
  const { id } = useParams<{ id: string }>();
  const pelangganId = Number(id);
  const router = useRouter();
  const [bayar, setBayar] = useState("");
  const [activeTab, setActiveTab] = useState<"riwayat" | "pembayaran">("riwayat");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editJumlah, setEditJumlah] = useState("");

  // Fetch Data menggunakan Dexie Live Query
  const pelanggan = useLiveQuery(() => db.pelanggan.get(pelangganId), [pelangganId]);
  const daftarHutang = useLiveQuery(() => db.hutang.where({ pelangganId }).toArray(), [pelangganId]);

  // Mengambil data riwayat cicilan/pembayaran langsung
  const daftarPembayaran = useLiveQuery(() => db.pembayaran.where({ pelangganId }).toArray(), [pelangganId]);

  // Kalkulasi total sisa utang
  const sisa = daftarHutang?.filter((h) => !h.lunas).reduce((sum, h) => sum + (h.jumlah - h.dibayar), 0) ?? 0;

  async function bayarJumlah(jumlahBayar: number) {
    if (!daftarHutang || jumlahBayar <= 0) return;

    for (const a of alokasikanPembayaran(daftarHutang, jumlahBayar)) {
      await db.hutang.update(a.id, { dibayar: a.dibayarBaru, lunas: a.lunas });
      await db.pembayaran.add({ hutangId: a.id, pelangganId, jumlah: a.potong, tanggal: new Date() });
    }
  }

  async function handleBayar() {
    const jumlahBayar = Number(bayar);
    if (!jumlahBayar || jumlahBayar <= 0) return;
    await bayarJumlah(jumlahBayar);
    setBayar("");
  }

  async function handleLunas() {
    if (!confirm(`Bayar lunas semua utang Rp ${sisa.toLocaleString("id-ID")}?`)) return;
    await bayarJumlah(sisa);
  }

  function mulaiEdit(id: number, jumlahSaatIni: number) {
    setEditingId(id);
    setEditJumlah(String(jumlahSaatIni));
  }

  async function simpanEdit(hutangId: number, dibayarSaatIni: number) {
    const jumlahBaru = Number(editJumlah);
    if (!jumlahBaru || jumlahBaru <= 0) return;

    if (jumlahBaru < dibayarSaatIni) {
      alert(
        `Nominal tidak boleh kurang dari yang sudah dibayar (Rp ${dibayarSaatIni.toLocaleString("id-ID")}).`,
      );
      return;
    }

    await db.hutang.update(hutangId, {
      jumlah: jumlahBaru,
      lunas: dibayarSaatIni >= jumlahBaru,
    });

    setEditingId(null);
    setEditJumlah("");
  }
  const avatarColor = getAvatarColor(pelangganId);
  return (
    <div className="min-h-screen bg-gray-50 p-2 pb-56 text-gray-800">
      {/* Header Navigasi */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between z-10">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-50"
        >
          <ChevronLeft />
        </button>
        <h1 className="font-bold text-lg text-gray-900 text-center flex-1 pr-6">Detail Utang</h1>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Ringkasan Profil & Utang Pelanggan */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full ${avatarColor.bg} ${avatarColor.text} flex items-center justify-center font-bold text-xl mb-3 shadow-inner`}>
            {pelanggan?.nama?.slice(0, 2).toUpperCase() || "PL"}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{pelanggan?.nama || "Memuat..."}</h2>
          <span
            className={`mt-1 px-3 py-1 text-xs font-medium rounded-full border ${
              sisa > 0
                ? "bg-orange-50 text-orange-600 border-orange-100"
                : "bg-green-50 text-green-600 border-green-100"
            }`}
          >
            {sisa > 0 ? "Belum Lunas" : "Lunas"}
          </span>

          <div className="w-full border-t border-dashed border-gray-200 my-4" />

          <div className="w-full flex justify-between items-center px-2">
            <span className="text-gray-500 text-sm">Total Utang</span>
            <span className="text-2xl font-black text-gray-900">Rp {sisa.toLocaleString("id-ID")}</span>
          </div>
        </div>

        {/* Tab Navigasi Internal */}
        <div className="flex border border-gray-100 bg-white rounded-xl p-1 shadow-xs">
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "riwayat" ? "bg-[#218152] text-white shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Riwayat Bon
          </button>
          <button
            onClick={() => setActiveTab("pembayaran")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "pembayaran" ? "bg-[#218152] text-white shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Pembayaran
          </button>
        </div>

        {/* Konten Tab Riwayat Bon */}
        {activeTab === "riwayat" && (
          <div className="space-y-2.5">
            {daftarHutang && daftarHutang.length > 0 ? (
              daftarHutang.map((h) => (
                <div
                  key={h.id}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-xs"
                >
                  {editingId === h.id ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-900 text-sm">Edit Nominal Bon</p>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">Rp</span>
                        <input
                          type="number"
                          value={editJumlah}
                          onChange={(e) => setEditJumlah(e.target.value)}
                          autoFocus
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm font-medium focus:outline-hidden focus:border-[#218152]"
                        />
                      </div>
                      {h.dibayar > 0 && (
                        <p className="text-[0.7rem] text-gray-400">
                          Sudah dibayar Rp {h.dibayar.toLocaleString("id-ID")} — nominal baru tidak boleh kurang dari ini.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <X size={14} /> Batal
                        </button>
                        <button
                          onClick={() => simpanEdit(h.id, h.dibayar)}
                          className="flex-1 bg-[#218152] text-white rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <Check size={14} /> Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">Bon Belanja</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(h.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-[0.7rem] text-gray-500">
                          <span>Total: Rp {h.jumlah.toLocaleString("id-ID")}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>Sisa: Rp {(h.jumlah - h.dibayar).toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => mulaiEdit(h.id, h.jumlah)}
                          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50"
                        >
                          <Pencil size={14} />
                        </button>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                            h.lunas ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                          }`}
                        >
                          {h.lunas ? "Lunas" : "Sisa Bon"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">Belum ada riwayat utang.</p>
            )}
          </div>
        )}

        {/* Konten Tab Pembayaran (Cicilan) */}
        {activeTab === "pembayaran" && (
          <div className="space-y-2.5">
            {daftarPembayaran && daftarPembayaran.length > 0 ? (
              daftarPembayaran.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-xs flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-gray-900">Cicilan Diterima</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(p.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">- Rp {p.jumlah.toLocaleString("id-ID")}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">Belum ada catatan pembayaran.</p>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Container */}
      {sisa > 0 && (
        // Perhatikan bagian bottom-[68px] untuk memberikan celah pas setinggi BottomNav (64-68px)
        <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-150 p-4 pb-4 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] z-40">
          <div className="max-w-md mx-auto space-y-2.5">
            {/* Input Nominal Cicil */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-gray-400">Rp</span>
                <input
                  type="number"
                  value={bayar}
                  onChange={(e) => setBayar(e.target.value)}
                  placeholder="Masukkan nominal cicilan"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-3 text-sm font-medium focus:outline-hidden focus:border-[#218152] focus:bg-white transition-all placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={handleBayar}
                className="bg-[#218152] hover:bg-[#1a6641] active:scale-95 text-white rounded-xl px-5 text-sm font-bold transition-all shadow-xs"
              >
                Bayar Sebagian
              </button>
            </div>

            {/* Button Lunas Langsung */}
            <button
              onClick={handleLunas}
              className="w-full bg-[#FF6D2B] hover:bg-[#e0561a] active:scale-[0.99] text-white rounded-xl py-3 text-sm font-bold shadow-md shadow-orange-500/10 transition-all tracking-wide"
            >
              Tambah Pembayaran Lunas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
