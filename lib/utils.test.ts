// Jalankan: npx tsx lib/utils.test.ts
import { alokasikanPembayaran } from "./utils";

const hutang = [
  { id: 1, jumlah: 10000, dibayar: 0, lunas: false },
  { id: 2, jumlah: 5000, dibayar: 2000, lunas: false },
  { id: 3, jumlah: 8000, dibayar: 8000, lunas: true }, // sudah lunas, harus dilewati
];

// Bayar 12000: melunasi hutang #1 (10000), sisa 2000 masuk ke #2, #3 dilewati karena sudah lunas.
const hasil = alokasikanPembayaran(hutang, 12000);

console.assert(hasil.length === 2, `expect 2 alokasi, dapat ${hasil.length}`);
console.assert(hasil[0].id === 1 && hasil[0].potong === 10000 && hasil[0].lunas === true, "hutang #1 harus lunas terpotong 10000");
console.assert(hasil[1].id === 2 && hasil[1].potong === 2000 && hasil[1].lunas === false, "hutang #2 terpotong 2000, belum lunas");

// Bayar 0 atau lebih dari total sisa: tidak boleh mengalokasikan melebihi sisa hutang.
const totalSisa = hutang.filter((h) => !h.lunas).reduce((s, h) => s + (h.jumlah - h.dibayar), 0);
const hasilBerlebih = alokasikanPembayaran(hutang, totalSisa + 5000);
const totalTerpotong = hasilBerlebih.reduce((s, a) => s + a.potong, 0);
console.assert(totalTerpotong === totalSisa, `total terpotong (${totalTerpotong}) harus sama dengan sisa hutang (${totalSisa}), bukan lebih`);

console.log("lib/utils.test.ts: semua assert lolos");
