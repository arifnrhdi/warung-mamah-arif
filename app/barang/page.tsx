"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, type Barang } from "@/lib/dexie";
import { filterByNama } from "@/lib/utils";
import { ChevronLeft, Package, Plus, Trash2, Edit3, Image as ImageIcon, X } from "lucide-react";
import Link from "next/link";

export default function BarangPage() {
  const barang = useLiveQuery(() => db.barang.toArray(), []);
  const [editing, setEditing] = useState<Barang | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = filterByNama(barang, query);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget; // simpan referensi sebelum await, currentTarget bisa null setelahnya
    const form = new FormData(formEl);
    const data = {
      nama: String(form.get("nama")),
      hargaBeli: Number(form.get("hargaBeli")),
      hargaJual: Number(form.get("hargaJual")),
      gambar: preview ?? editing?.gambar,
    };
    if (editing) {
      await db.barang.update(editing.id, data);
    } else {
      await db.barang.add(data as Barang);
    }
    formEl.reset();
    setOpen(false);
    setEditing(null);
    setPreview(null);
  }

  async function handleDelete(id: number) {
    if (confirm("Hapus barang ini?")) await db.barang.delete(id);
  }

  function openAdd() {
    setEditing(null);
    setPreview(null);
    setOpen(true);
  }

  function openEdit(b: Barang) {
    setEditing(b);
    setPreview(b.gambar ?? null);
    setOpen(true);
  }

  return (
    <div className="p-2 pb-20 min-h-screen bg-gray-50/50 text-gray-800">
      {/* Header - Dengan Tema Biru & Badge "KELOLA" */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1 -ml-1 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-gray-900">Daftar Barang</h1>
          </div>
        </div>
      </div>

      <div>
        {/* Input Pencarian */}
        <div className="mt-4 mb-5 mx-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari barang untuk diedit..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-all duration-200 shadow-sm"
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
                    <div className="w-14 h-14 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 transition-colors group-hover:bg-blue-100/70">
                      <Package size={24} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 truncate text-[15px]">{b.nama}</h3>
                    <p className="text-[#2563eb] font-bold mt-0.5 text-sm">Rp {b.hargaJual.toLocaleString("id-ID")}</p>
                  </div>
                </div>

                {/* Tombol Aksi Edit & Hapus */}
                <div className="flex gap-1 shrink-0 items-center">
                  <button
                    onClick={() => openEdit(b)}
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors active:scale-90"
                    title="Edit Barang"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-90"
                    title="Hapus Barang"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filtered?.length === 0 && (
          <div className="mx-2 text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 shadow-xs">
            <p className="text-gray-400 text-sm font-medium">
              {query ? "Barang tidak ditemukan." : "Belum ada barang di toko Mamah."}
            </p>
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={openAdd}
        className="fixed bottom-16 left-1/2 -translate-x-1/2 w-16 h-8 rounded-t-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-lg shadow-green-600/30 flex items-start justify-center pt-1.5 z-40"
      >
        <Plus size={22} />
      </button>

      {/* Backdrop & Dialog Modal Form Barang dengan Efek Transisi Masuk ke Atas secara Halus */}
      <div
        className={`fixed inset-0 bg-black/50 flex items-end justify-center z-50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop tap to close */}
        <div className="absolute inset-0 -z-10" onClick={() => setOpen(false)} />

        <form
          onSubmit={handleSubmit}
          className={`bg-white rounded-t-[28px] p-5 w-full max-w-md space-y-4 shadow-2xl transition-transform duration-300 ease-in-out transform bottom-16 relative z-15 mb-1 ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h2 className="font-extrabold text-lg text-gray-800">{editing ? "Edit Barang" : "Tambah Barang Baru"}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-90 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <label className="cursor-pointer group flex flex-col items-center">
              {preview ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#2563eb] shadow-md">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] hover:bg-blue-50/50 transition-all">
                  <ImageIcon size={24} className="mb-1" />
                  <span className="text-[10px] font-bold">Foto Barang</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Nama Barang</label>
              <input
                name="nama"
                defaultValue={editing?.nama}
                placeholder="Contoh: Indomie Goreng"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:bg-white transition-all text-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Harga Beli</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs font-bold text-gray-400">Rp</span>
                  <input
                    name="hargaBeli"
                    type="number"
                    defaultValue={editing?.hargaBeli}
                    placeholder="0"
                    required
                    min={0}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-3 text-sm font-semibold focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:bg-white transition-all text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Harga Jual</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs font-bold text-gray-400">Rp</span>
                  <input
                    name="hargaJual"
                    type="number"
                    defaultValue={editing?.hargaJual}
                    placeholder="0"
                    required
                    min={0}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-3 text-sm font-semibold focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:bg-white transition-all text-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl py-3 text-sm font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl py-3 text-sm font-bold transition-all shadow-md shadow-blue-700/10"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
