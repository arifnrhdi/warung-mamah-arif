"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { db } from "@/lib/dexie";

export default function RiwayatPage() {
  const router = useRouter();

  const transaksi = useLiveQuery(async () => {
    const semua = await db.transaksi.toArray();
    const pelanggan = await db.pelanggan.toArray();
    const pelangganMap = new Map(pelanggan.map((p) => [p.id, p.nama]));

    return semua
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
      .map((t) => ({
        ...t,
        namaPelanggan: t.pelangganId ? pelangganMap.get(t.pelangganId) : null,
      }));
  }, []);

  return (
    <div className="p-4 pb-24">
      <div className="relative flex items-center mb-4 h-10">
        <button onClick={() => router.back()} className="z-10 text-gray-500">
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="absolute inset-0 flex items-center justify-center text-xl font-bold pointer-events-none">
          Riwayat Transaksi
        </h1>
      </div>

      <ul className="space-y-2">
        {transaksi?.map((t) => (
          <li
            key={t.id}
            className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm shadow-black/5 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  t.metode === "tunai" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                }`}
              >
                <ShoppingBag size={18} />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {t.items.length} barang
                  {t.namaPelanggan ? ` · ${t.namaPelanggan}` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(t.tanggal).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">Rp {t.total.toLocaleString("id-ID")}</p>
              <p className={`text-xs ${t.metode === "tunai" ? "text-green-600" : "text-orange-600"}`}>
                {t.metode === "tunai" ? "Tunai" : "Utang"}
              </p>
            </div>
          </li>
        ))}
        {transaksi?.length === 0 && <p className="text-gray-400 text-center py-8">Belum ada transaksi.</p>}
      </ul>
    </div>
  );
}
