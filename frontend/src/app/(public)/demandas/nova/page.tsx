'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormDemanda } from "../../../../components/demands/FormDemanda";
import Link from "next/link";
import { useDemandStore } from "@/stores/useDemandStore";

export default function NovaDemandaPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const token = useDemandStore((state) => state.token);
  const userName = useDemandStore((state) => state.userName);
  const logout = useDemandStore((state) => state.logout);
  const hasHydrated = useDemandStore((state) => state._hasHydrated);

  useEffect(() => {
    setMounted(true);
    if (hasHydrated && !token) {
      router.push("/login");
    }
  }, [hasHydrated, token, router]);

  if (!mounted || !hasHydrated) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-gray-500 animate-pulse">Sincronizando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-100 px-6 py-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl font-bold text-purple-600 cursor-pointer hover:opacity-80 transition-opacity">
            RESOLVE
          </h1>
        </Link>
        <div className="flex gap-4 items-center">
          <span className="text-sm font-medium text-purple-700">{userName ?? "Usuário"}</span>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="h-64 bg-gradient-to-r from-violet-800 to-orange-500 flex items-center justify-center text-center mt-16 pt-8 pb-12">
        <h2 className="text-4xl font-bold text-white px-4">Nova Denúncia</h2>
      </div>

      <main className="flex justify-center -mt-20 px-4 pb-16">
        <FormDemanda />
      </main>
    </div>
  );
}