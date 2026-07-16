"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useState } from "react";
import { db } from "@/lib/dexie";
import { filterByNama } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

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

export default function HutangPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mengambil dan memetakan data pelanggan, termasuk yang sudah lunas (untuk riwayat)
  const daftar = useLiveQuery(async () => {
    const hutang = await db.hutang.toArray();
    const pelanggan = await db.pelanggan.toArray();

    const map = new Map<number, { nama: string; sisa: number }>();
    for (const h of hutang) {
      const p = pelanggan.find((p) => p.id === h.pelangganId);
      if (!p) continue;
      const sisa = h.lunas ? 0 : h.jumlah - h.dibayar;
      const existing = map.get(p.id);
      map.set(p.id, { nama: p.nama, sisa: (existing?.sisa ?? 0) + sisa });
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, []);

  // Filter daftar pelanggan berdasarkan input pencarian
  const filteredDaftar = filterByNama(daftar, searchQuery);

  return (
    <div className="min-h-screen bg-gray-50 p-2 pb-20 text-gray-800">
      {/* Header Utama */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <h1 className="font-bold text-lg text-gray-900">Pelanggan Utang</h1>
        </div>
      </div>

      <div>
        {/* Search Bar Modern */}
        <div className="mt-4 mb-5 mx-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pelanggan..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#277b4e] focus:ring-1 focus:ring-[#277b4e] transition-all duration-200 shadow-sm"
          />
        </div>

        {/* Daftar Pelanggan */}
        <div className="space-y-2.5">
          {filteredDaftar && filteredDaftar.length > 0 ? (
            filteredDaftar.map((d) => {
              // Ambil warna acak yang terikat dengan ID pelanggan
              const color = getAvatarColor(d.id);

              return (
                <Link
                  key={d.id}
                  href={`/hutang/${d.id}`}
                  className="bg-white rounded-xl py-3 px-3.5 flex justify-between items-center border border-gray-100 hover:border-gray-200 shadow-xs transition-all active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar Bulat dengan Warna Random Berdasarkan ID */}
                    <div
                      className={`w-11 h-11 rounded-full ${color.bg} ${color.text} flex items-center justify-center shrink-0 font-bold text-sm shadow-xs`}
                    >
                      {d.nama.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Nama Pelanggan & Status */}
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {d.nama}
                      </span>
                      <span
                        className={`text-[11px] font-medium mt-0.5 ${d.sisa > 0 ? "text-orange-500" : "text-emerald-600"}`}
                      >
                        {d.sisa > 0 ? "Belum Lunas" : "Lunas"}
                      </span>
                    </div>
                  </div>

                  {/* Sisa Utang & Tombol Detail (Panah) */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900 block">
                        {d.sisa > 0 ? `Rp ${d.sisa.toLocaleString("id-ID")}` : "Lunas"}
                      </span>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                      className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">
                {searchQuery ? "Pelanggan tidak ditemukan." : "Tidak ada catatan utang aktif."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
