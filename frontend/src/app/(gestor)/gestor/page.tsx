"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemandStore } from "@/stores/useDemandStore";
import { DemandFilters } from "@/types/demand";
import { Button } from "@/components/UI/Button";
import { Select } from "@/components/UI/Select";
import { DemandCard } from "@/components/UI/DemandCard";
import Link from "next/link"; 

export default function Page() {
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);

  const { 
    filters, 
    setFilters, 
    resetFilters, 
    getFilteredDemands, 
    getDemandStats, 
    fetchDemands,
    error,
    token,
    role,
    logout,
    _hasHydrated 
  } = useDemandStore();

  useEffect(() => {
    setMounted(true);
    if (!token || role !== 'gestor') {
      router.push('/logingestor');
      return;
    }
    fetchDemands();
  }, [fetchDemands, token, role, router]);

  if (!mounted || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const filteredDemands = getFilteredDemands();
  const stats = getDemandStats();

  const handleFilterChange = (key: keyof DemandFilters, value: string) => {
    setFilters({ [key]: value === "" ? "" : (value as any) });
  };

  const handleApplyFilters = () => {
    console.log("Filtros aplicados:", filters);
  };

  const handleViewDetails = (demandId: string) => {
    router.push(`/gestor/demandas/${demandId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
  
      <nav className="flex justify-between items-center py-4 px-8 bg-white shadow-sm border-b border-gray-200">
        <h1 className="text-2xl font-bold text-purple-600">RESOLVE</h1>
        <div className="flex items-center gap-4">
          <Link href="/gestor/dashboard" className="text-purple-600 font-bold mr-4 hover:text-purple-700">
            Painel de gestão
          </Link>
          <Link href="/login" className="text-purple-400 font-normal hover:text-purple-500">
            Sair
          </Link>
        </div>
      </nav>

      <div className="w-full h-64 bg-linear-to-r from-indigo-900 via-fuchsia-500 to-orange-500 flex items-start justify-center pt-10">
        <h2 className="text-white text-4xl font-bold">Painel de gestão</h2>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="-mt-24 bg-white rounded-2xl shadow-xl p-8 relative z-10">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-purple-600 rounded-xl p-6 text-white flex flex-col items-center justify-center min-h-[160px] gap-2">
              <p className="text-base font-semibold text-white/70 uppercase tracking-widest">Demandas registradas</p>
              <p className="text-7xl font-extrabold leading-none">{stats.total}</p>
            </div>

            <div className="bg-purple-600 rounded-xl p-6 text-white">
              <p className="text-lg font-bold mb-4 text-white/70">Demandas por categoria</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {Object.entries(stats.byCategory).map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between gap-1">
                    <span className="truncate">{cat}</span>
                    <span className="font-bold shrink-0">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-purple-600 rounded-xl p-6 text-white">
              <p className="text-lg font-bold mb-4 text-white/70">Demandas por região</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {Object.entries(stats.byRegion).map(([reg, val]) => (
                  <div key={reg} className="flex items-center justify-between gap-1">
                    <span className="truncate">{reg}</span>
                    <span className="font-bold shrink-0">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8 text-black">
            <h3 className="text-xl font-bold mb-4">Filtros</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <Select
                label="Status"
                options={[
                  { value: "", label: "Todos" },
                  { value: "Aberta", label: "Aberta" },
                  { value: "Em análise", label: "Em Análise" },
                  { value: "Resolvida", label: "Resolvida" },
                ]}
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="flex-1 min-w-[150px]"
              />
              <Select
                label="Categoria"
                options={[
                  { value: "", label: "Todas" },
                  { value: "Iluminação Pública", label: "Iluminação Pública" },
                  { value: "Manutenção de vias", label: "Manutenção de vias" },
                  { value: "Saneamento", label: "Saneamento" },
                  { value: "Coleta de lixo", label: "Coleta de lixo" },
                  { value: "Fiscalização", label: "Fiscalização" },
                  { value: "Segurança", label: "Segurança" },
                  { value: "Sinalização de Trânsito", label: "Sinalização de Trânsito" },
                  { value: "Outros Empecilhos", label: "Outros Empecilhos" },
                ]}
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="flex-1 min-w-[150px]"
              />
              
              <div className="flex gap-2">
                <Button variant="primary" size="md" onClick={handleApplyFilters}>
                  Aplicar Filtro
                </Button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-black">Demandas</h3>
            <div className="flex flex-col gap-4">
              {filteredDemands.length > 0 ? (
                filteredDemands.map((demand) => (
                  <DemandCard
                    key={demand.id}
                    demand={demand}
                    onViewDetails={handleViewDetails}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-xl">
                  <p>Nenhuma demanda encontrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-12" />
    </div>
  );
}