"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, type TransaksiItem } from "@/lib/dexie";
import { filterByNama } from "@/lib/utils";
import { ChevronLeft, ShoppingBasket, Plus, Minus, X } from "lucide-react";
import Link from "next/link";

export default function KasirPage() {
  const barang = useLiveQuery(() => db.barang.toArray(), []);
  const pelanggan = useLiveQuery(() => db.pelanggan.toArray(), []);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<TransaksiItem[]>([]);
  const [pickingPelanggan, setPickingPelanggan] = useState(false);
  const [namaBaru, setNamaBaru] = useState("");

  const filtered = filterByNama(barang, query);

  const total = cart.reduce((sum, i) => sum + i.qty * i.hargaJual, 0);

  function addToCart(b: { id: number; nama: string; hargaJual: number }) {
    setCart((prev) => {
      const existing = prev.find((i) => i.barangId === b.id);
      if (existing) {
        return prev.map((i) => (i.barangId === b.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { barangId: b.id, nama: b.nama, qty: 1, hargaJual: b.hargaJual }];
    });
  }

  function updateQty(barangId: number, delta: number) {
    setCart((prev) =>
      prev.map((i) => (i.barangId === barangId ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0),
    );
  }

  async function finalizeCheckout(metode: "tunai" | "hutang", pelangganId?: number) {
    if (cart.length === 0) return;

    const transaksiId = await db.transaksi.add({
      tanggal: new Date(),
      items: cart,
      total,
      metode,
      pelangganId,
    });

    if (metode === "hutang" && pelangganId) {
      await db.hutang.add({
        pelangganId,
        transaksiId,
        jumlah: total,
        dibayar: 0,
        lunas: false,
        tanggal: new Date(),
      });
    }

    setCart([]);
    setPickingPelanggan(false);
    setNamaBaru("");
  }

  async function handlePilihPelanggan(id: number) {
    await finalizeCheckout("hutang", id);
  }

  async function handleTambahPelanggan() {
    if (!namaBaru.trim()) return;
    const id = await db.pelanggan.add({ nama: namaBaru.trim() });
    await finalizeCheckout("hutang", id);
  }

  const isCartOpen = cart.length > 0;

  return (
    <div className="p-2 pb-20 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1 -ml-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>

          <h1 className="font-bold text-lg text-gray-900">Kasir</h1>
        </div>
      </div>

      <div>
        <div className="mt-4 mb-5 mx-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari barang atau scan barcode..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#277b4e] focus:ring-1 focus:ring-[#277b4e] transition-all duration-200 shadow-sm"
          />
        </div>

        {/* Daftar Barang */}
        <ul className="space-y-3">
          {filtered?.map((b) => (
            <li
              key={b.id}
              className="group bg-white rounded-2xl p-3 border border-gray-100 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-px active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                {/* Info Barang */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {b.gambar ? (
                    <img
                      src={b.gambar}
                      alt={b.nama}
                      className="w-14 h-14 object-contain rounded-xl shrink-0 bg-gray-50"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-emerald-50/80 flex items-center justify-center shrink-0 transition-colors group-hover:bg-emerald-100/80">
                      <ShoppingBasket size={24} className="text-[#277b4e]" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 truncate text-[15px]">{b.nama}</h3>
                    <p className="text-[#277b4e] font-bold mt-0.5 text-sm">Rp {b.hargaJual.toLocaleString("id-ID")}</p>
                  </div>
                </div>

                {/* Tombol Tambah ke Keranjang */}
                <button
                  onClick={() => addToCart(b)}
                  className="w-10 h-10 rounded-full bg-[#277b4e] hover:bg-[#1e5e3a] text-white flex items-center justify-center shadow-md shadow-emerald-700/10 transition-all duration-200 active:scale-90"
                >
                  <Plus size={18} className="stroke-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Bottom Sheet Keranjang Belanja dengan Transisi Masuk Ke Atas */}
        <div
          className={`fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 rounded-t-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.06)] p-5 space-y-4 z-40 transition-all duration-200 ease-in-out transform ${
            isCartOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
          }`}
        >
          {/* List Ringkas Item Keranjang */}
          <div className="max-h-40 overflow-y-auto space-y-3 pr-1">
            {cart.map((i) => (
              <div
                key={i.barangId}
                className="flex justify-between items-center text-[14px] text-gray-700 font-medium py-1 animate-fade-in"
              >
                <span className="truncate max-w-[45%]">{i.nama}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                    <button
                      onClick={() => updateQty(i.barangId, -1)}
                      className="px-2.5 py-1 text-gray-500 hover:bg-gray-150 hover:text-gray-700 active:bg-gray-200 transition-colors"
                    >
                      <Minus size={12} className="stroke-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-gray-800">{i.qty}</span>
                    <button
                      onClick={() => updateQty(i.barangId, 1)}
                      className="px-2.5 py-1 text-gray-500 hover:bg-gray-150 hover:text-gray-700 active:bg-gray-200 transition-colors"
                    >
                      <Plus size={12} className="stroke-3" />
                    </button>
                  </div>
                  <span className="w-20 text-right font-bold text-gray-900">
                    Rp {(i.qty * i.hargaJual).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between font-bold text-lg pt-3.5 border-t border-gray-100 text-gray-900">
            <span>Total</span>
            <span className="text-[#277b4e]">Rp {total.toLocaleString("id-ID")}</span>
          </div>

          {/* Tombol Skenario Pembayaran */}
          <div className="flex gap-3">
            <button
              onClick={() => finalizeCheckout("tunai")}
              className="flex-1 bg-[#277b4e] hover:bg-[#1e5e3a] text-white rounded-xl py-3.5 font-bold shadow-lg shadow-emerald-700/10 active:scale-[0.98] transition-all duration-200"
            >
              Tunai
            </button>
            <button
              onClick={() => setPickingPelanggan(true)}
              className="flex-1 bg-[#f07223] hover:bg-[#d45d15] text-white rounded-xl py-3.5 font-bold shadow-lg shadow-orange-700/10 active:scale-[0.98] transition-all duration-200"
            >
              Utang
            </button>
          </div>
        </div>

        {/* Dialog Modal Pilih Pelanggan */}
        {pickingPelanggan && (
          <div className="fixed bottom-16 inset-0 bg-black/50 flex items-end justify-center z-50 transition-opacity duration-200">
            {/* Backdrop tap to close */}
            <div className="absolute inset-0 -z-10" onClick={() => setPickingPelanggan(false)} />

            <div className="bg-white rounded-t-[28px] p-5 w-full max-h-[75vh] overflow-y-auto space-y-4 shadow-2xl transition-transform duration-200 translate-y-0">
              <div className="flex justify-between items-center pb-2">
                <h2 className="font-extrabold text-lg text-gray-800">Pilih Pelanggan</h2>
                <button
                  onClick={() => setPickingPelanggan(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-90 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* List Pelanggan */}
              <ul className="space-y-2 overflow-y-auto max-h-[30vh] pr-1">
                {pelanggan?.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => handlePilihPelanggan(p.id)}
                      className="w-full text-left border border-gray-100 hover:border-[#f07223]/30 hover:bg-orange-50/20 active:bg-orange-50/50 rounded-xl p-3.5 font-semibold text-gray-700 transition-all duration-150"
                    >
                      {p.nama}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Form Pelanggan Baru */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <input
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  placeholder="Nama pelanggan baru..."
                  className="border border-gray-200 rounded-xl px-4 py-3 flex-1 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#f07223] focus:ring-1 focus:ring-[#f07223] transition-all duration-200"
                />
                <button
                  onClick={handleTambahPelanggan}
                  className="bg-[#f07223] hover:bg-[#d45d15] text-white rounded-xl px-5 font-bold transition-all duration-200 active:scale-95 shadow-md shadow-orange-700/10"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
