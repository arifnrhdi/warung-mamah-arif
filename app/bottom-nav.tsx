"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, Package, Users, FileBarChart } from "lucide-react";

const menu = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/kasir", label: "Kasir", icon: ShoppingCart },
  { href: "/barang", label: "Barang", icon: Package },
  { href: "/hutang", label: "Utang", icon: Users },
  { href: "/laporan", label: "Laporan", icon: FileBarChart },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <nav className="max-w-md mx-auto flex justify-around items-center py-2.5 px-2">
        {menu.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold gap-1 transition-all duration-200 rounded-xl active:scale-95 ${
                active ? "text-[#2D8A5E]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors duration-200 ${
                  active ? "bg-emerald-50/60" : "bg-transparent"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} className="transition-transform" />
              </div>
              <span className="tracking-wide">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
