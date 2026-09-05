"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Home, Building2, Receipt, Settings, Menu, LogOut, Folder } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useYear } from "@/lib/contexts/YearContext";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Properties", href: "/properties", icon: Building2 },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Documents", href: "/documents", icon: Folder },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { selectedYear, setSelectedYear } = useYear();

  // Generate an array of years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="flex h-screen bg-[#09090b] selection:bg-indigo-500/30 overflow-hidden font-sans">
      {/* Sidebar with Glassmorphism and glow */}
      <aside className="w-72 bg-zinc-950/80 backdrop-blur-xl border-r border-white/10 flex flex-col hidden md:flex relative z-20 shadow-2xl">
        {/* Glow effect */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none"></div>

        <div className="h-24 flex items-center px-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 border border-white/10">
              <Image src="/logo.png" alt="Logo" fill className="object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">Hausverwaltung</h1>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Management Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 relative z-10">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <item.icon className={`mr-4 h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t border-white/5 relative z-10 bg-black/20">
          <div className="flex items-center mb-6 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {(user?.displayName || user?.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 truncate">
              <p className="text-sm font-medium text-zinc-200 truncate">{user?.displayName || user?.email}</p>
              <p className="text-xs text-zinc-500">Administrator</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full border-white/10 bg-transparent text-zinc-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all rounded-xl"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 pointer-events-none"></div>
        
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-zinc-950/50 border-b border-white/5 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center md:hidden">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="ml-3 text-lg font-bold text-zinc-100">Hausverwaltung</h1>
          </div>
          <div className="hidden md:block">
            {/* Breadcrumbs or contextual title can go here */}
          </div>
          
          <div className="flex items-center space-x-4 bg-white/5 p-1.5 rounded-xl border border-white/10 shadow-inner">
            <label htmlFor="year-select" className="text-xs font-semibold uppercase tracking-wider text-zinc-500 pl-3">
              Fiscal Year
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-zinc-900 border-none text-zinc-200 text-sm rounded-lg focus:ring-0 focus:outline-none py-1.5 pl-3 pr-8 font-medium cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 relative z-10 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
