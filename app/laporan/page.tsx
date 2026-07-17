"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/lib/dexie";
import { ChevronLeft, Calendar } from "lucide-react";
import Link from "next/link";

type Periode = "hari" | "minggu" | "bulan";

function dalamPeriode(tanggal: Date, periode: Periode) {
  const now = new Date();
  const d = new Date(tanggal);
  if (periode === "hari") {
    return d.toDateString() === now.toDateString();
  }
  if (periode === "minggu") {
    const awalMinggu = new Date(now);
    awalMinggu.setDate(now.getDate() - now.getDay());
    awalMinggu.setHours(0, 0, 0, 0);
    return d >= awalMinggu;
  }
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function LaporanPage() {
  const [periode, setPeriode] = useState<Periode>("hari");

  const data = useLiveQuery(async () => {
    const transaksi = (await db.transaksi.toArray()).filter((t) => dalamPeriode(new Date(t.tanggal), periode));
    const tunai = transaksi.filter((t) => t.metode === "tunai");

    const pembayaran = (await db.pembayaran.toArray()).filter((p) => dalamPeriode(new Date(p.tanggal), periode));
    const totalPembayaran = pembayaran.reduce((sum, p) => sum + p.jumlah, 0);

    const pengeluaran = (await db.pengeluaran.toArray()).filter((p) => dalamPeriode(new Date(p.tanggal), periode));
    const barang = await db.barang.toArray();
    const barangMap = new Map(barang.map((b) => [b.id, b]));

    const penjualan = tunai.reduce((sum, t) => sum + t.total, 0) + totalPembayaran;
    const totalPengeluaran = pengeluaran.reduce((sum, p) => sum + p.jumlah, 0);

    function marginTransaksi(t: { items: { barangId: number; hargaJual: number; qty: number }[] }) {
      let margin = 0;
      for (const item of t.items) {
        const b = barangMap.get(item.barangId);
        if (b) margin += (item.hargaJual - b.hargaBeli) * item.qty;
      }
      return margin;
    }

    // laba tunai diakui penuh, laba dari pembayaran utang diakui proporsional ke porsi dibayar
    let laba = tunai.reduce((sum, t) => sum + marginTransaksi(t), 0);

    const semuaHutangUntukLaba = await db.hutang.toArray();
    const hutangMap = new Map(semuaHutangUntukLaba.map((h) => [h.id, h]));
    const semuaTransaksiUntukLaba = await db.transaksi.toArray();
    const transaksiMap = new Map(semuaTransaksiUntukLaba.map((t) => [t.id, t]));

    for (const p of pembayaran) {
      const h = hutangMap.get(p.hutangId);
      const t = h ? transaksiMap.get(h.transaksiId) : null;
      if (!h || !t || h.jumlah <= 0) continue;
      laba += marginTransaksi(t) * (p.jumlah / h.jumlah);
    }

    // barang terlaris tetap dihitung dari semua transaksi (tunai+utang) -
    // ini ngukur seberapa laku barangnya, bukan seberapa banyak duit kepegang
    const terlaris = new Map<string, number>();
    for (const t of transaksi) {
      for (const item of t.items) {
        terlaris.set(item.nama, (terlaris.get(item.nama) ?? 0) + item.qty);
      }
    }

    const barangTerlaris = Array.from(terlaris.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      penjualan,
      laba,
      totalPengeluaran,
      jumlahTransaksi: transaksi.length,
      barangTerlaris,
    };
  }, [periode]);

  return (
    <div className="min-h-screen bg-gray-50 p-2 pb-24 text-gray-800">
      {/* Header Utama */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <h1 className="font-bold text-lg text-gray-900">Laporan Keuangan</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-5">
        {/* Dropdown / Segmented Filter Periode Waktu */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-2xs border border-gray-100">
          {(["hari", "minggu", "bulan"] as Periode[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all ${
                periode === p ? "bg-emerald-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {p === "hari" ? "Hari Ini" : p === "minggu" ? "Minggu Ini" : "Bulan Ini"}
            </button>
          ))}
        </div>

        {/* Ringkasan Kartu Dashboard 2 Kolom (Sesuai Visual Poin 9) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Penjualan - Hijau Mint Mulus */}
          <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/70 mb-1">Penjualan</p>
            <p className="text-lg font-black text-emerald-900">Rp {(data?.penjualan ?? 0).toLocaleString("id-ID")}</p>
          </div>

          {/* Laba - Biru Soft */}
          <div className="bg-blue-50/60 border border-blue-100/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700/70 mb-1">Laba</p>
            <p className="text-lg font-black text-blue-900">Rp {(data?.laba ?? 0).toLocaleString("id-ID")}</p>
          </div>

          {/* Transaksi - Ungu Soft */}
          <div className="bg-purple-50/60 border border-purple-100/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700/70 mb-1">Transaksi</p>
            <p className="text-lg font-black text-purple-900">{data?.jumlahTransaksi ?? 0}</p>
          </div>

          {/* Pengeluaran - Jingga/Kemerahan Soft */}
          <div className="bg-orange-50/60 border border-orange-100/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700/70 mb-1">Pengeluaran</p>
            <p className="text-lg font-black text-orange-900">
              Rp {(data?.totalPengeluaran ?? 0).toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Bagian Produk Terlaris */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-0.5">
            <h2 className="font-bold text-gray-900 text-sm tracking-wide">Barang Terlaris</h2>
          </div>

          <div className="space-y-2">
            {data?.barangTerlaris.map(([nama, qty], i) => (
              <div
                key={nama}
                className="bg-white rounded-xl p-3.5 flex justify-between items-center border border-gray-100 shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  {/* Indeks Urutan Bulat */}
                  <div className="w-6 h-6 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center shrink-0 font-bold text-xs border border-gray-100">
                    {i + 1}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">
                    {nama}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100/80">
                  {qty} pcs
                </span>
              </div>
            ))}

            {data?.barangTerlaris.length === 0 && (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Belum ada aktivitas penjualan pada periode ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
