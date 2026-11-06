'use client'

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FormDemanda } from "@/components/demands/FormDemanda";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDemandStore } from "@/stores/useDemandStore";
import { Demand } from "@/types/demand";

export default function EditarDemandaPage() {
  const params = useParams();
  const router = useRouter();
  const demandId = params.id as string;
  const [demand, setDemand] = useState<Demand | null>(null);
  const [loaded, setLoaded] = useState(false);

  const userName = useAuthStore((state) => state.userName);
  const logout = useAuthStore((state) => state.logout);
  const fetchDemandById = useDemandStore((state) => state.fetchDemandById);

  useEffect(() => {
    fetchDemandById(demandId).then((found) => {
      setDemand(found);
      setLoaded(true);
    });
  }, [demandId, fetchDemandById]);

  // Só a denúncia ainda aberta pode ser editada.
  const editavel = demand?.status === "Aberta";

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
        <h2 className="text-4xl font-bold text-white px-4">Editar Denúncia</h2>
      </div>

      <main className="flex justify-center -mt-20 px-4 pb-16">
        {!loaded ? (
          <div className="bg-white p-8 rounded-4xl shadow-xl w-full max-w-5xl flex justify-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : demand && editavel ? (
          <FormDemanda demand={demand} />
        ) : (
          <div className="bg-white p-8 rounded-4xl shadow-xl w-full max-w-5xl text-center">
            <p className="text-gray-600 mb-4">
              {demand
                ? "Só é possível editar uma denúncia enquanto ela está aberta."
                : "Denúncia não encontrada."}
            </p>
            <Link href="/telaUsuario" className="text-purple-600 font-semibold hover:underline">
              Voltar às Denúncias
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
