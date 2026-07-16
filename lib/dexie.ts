import Dexie, { type EntityTable } from "dexie";

interface Barang {
  id: number;
  nama: string;
  hargaBeli: number;
  hargaJual: number;
  gambar?: string;
}

interface TransaksiItem {
  barangId: number;
  nama: string;
  qty: number;
  hargaJual: number;
}

interface Transaksi {
  id: number;
  tanggal: Date;
  items: TransaksiItem[];
  total: number;
  metode: "tunai" | "hutang";
  pelangganId?: number;
}

interface Pelanggan {
  id: number;
  nama: string;
}

interface Hutang {
  id: number;
  pelangganId: number;
  transaksiId: number;
  jumlah: number;
  dibayar: number;
  lunas: boolean;
  tanggal: Date;
}

interface Pengeluaran {
  id: number;
  tanggal: Date;
  keterangan: string;
  jumlah: number;
}

const db = new Dexie("warung") as Dexie & {
  barang: EntityTable<Barang, "id">;
  transaksi: EntityTable<Transaksi, "id">;
  pelanggan: EntityTable<Pelanggan, "id">;
  hutang: EntityTable<Hutang, "id">;
  pengeluaran: EntityTable<Pengeluaran, "id">;
  pembayaran: EntityTable<Pembayaran, "id">;
};

interface Pembayaran {
  id: number;
  hutangId: number;
  pelangganId: number;
  jumlah: number;
  tanggal: Date;
}

db.version(2).stores({
  barang: "++id, nama",
  transaksi: "++id, tanggal, metode, pelangganId",
  pelanggan: "++id, nama",
  hutang: "++id, pelangganId, lunas",
  pengeluaran: "++id, tanggal",
  pembayaran: "++id, hutangId, pelangganId, tanggal",
});

export { db };
export type { Barang, Transaksi, TransaksiItem, Pelanggan, Hutang, Pengeluaran, Pembayaran };
