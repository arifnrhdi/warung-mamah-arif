import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function filterByNama<T extends { nama: string }>(list: T[] | undefined, query: string) {
  return list?.filter((item) => item.nama.toLowerCase().includes(query.toLowerCase()));
}

/** Alokasikan satu jumlah bayar ke daftar hutang belum lunas secara FIFO (yang paling lama duluan). */
export function alokasikanPembayaran(
  daftarHutang: { id: number; jumlah: number; dibayar: number; lunas: boolean }[],
  jumlahBayar: number,
) {
  let sisaBayar = jumlahBayar;
  const alokasi: { id: number; dibayarBaru: number; lunas: boolean; potong: number }[] = [];

  for (const h of daftarHutang.filter((h) => !h.lunas)) {
    if (sisaBayar <= 0) break;
    const sisaItem = h.jumlah - h.dibayar;
    const potong = Math.min(sisaBayar, sisaItem);
    const dibayarBaru = h.dibayar + potong;
    alokasi.push({ id: h.id, dibayarBaru, lunas: dibayarBaru >= h.jumlah, potong });
    sisaBayar -= potong;
  }

  return alokasi;
}
