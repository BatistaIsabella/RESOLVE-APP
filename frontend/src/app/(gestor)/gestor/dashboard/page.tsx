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
    fetchMetrics,
    isLoading,
    error,
    apiMetrics,
    token,
    role,
    logout,
    _hasHydrated 
  } = useDemandStore();

  const [tempFilters, setTempFilters] = useState(filters);

  useEffect(() => {
    setMounted(true);
    if (!token || role !== 'gestor') {
      router.push('/logingestor');
      return;
    }
    fetchDemands();
    fetchMetrics();
  }, [fetchDemands, fetchMetrics, token, role, router]);

  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  if (!mounted || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
           <p className="text-gray-500 animate-pulse">Sincronizando dados...</p>
        </div>
      </div>
    );
  }

  const PRIORITY_ORDER: Record<string, number> = { Alta: 0, "Média": 1, Baixa: 2 };
  const filteredDemands = getFilteredDemands().slice().sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  );

  const ALL_CATEGORIES = [
    'Iluminação Pública', 'Manutenção de vias', 'Saneamento',
    'Coleta de lixo', 'Fiscalização', 'Segurança',
    'Sinalização de Trânsito', 'Outros Empecilhos',
  ];
  const ALL_REGIONS = [
    'Região Metropolitana do Recife', 'Zona da Mata',
    'Agreste', 'Sertão', 'Outra',
  ];
  
  const hasActiveFilters = !!(filters.status || filters.category || filters.region || filters.priority);
  const stats = hasActiveFilters ? getDemandStats() : (apiMetrics ?? getDemandStats());

  const handleFilterChange = (key: keyof DemandFilters, value: string) => {
    setTempFilters((prev) => ({ ...prev, [key]: value === "" ? "" : (value as any) }));
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
  };

  const handleViewDetails = (demandId: string) => {
    router.push(`/gestor/demandas/${demandId}`);
  };

  const handleResetFilters = () => {
    resetFilters();
    setTempFilters({ status: "", category: "", region: "", priority: "" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex justify-between items-center py-4 px-8 bg-white shadow-sm border-b border-gray-200">
        <h1 className="text-2xl font-bold text-purple-600">RESOLVE</h1>
        <div className="flex items-center gap-4">
          <Link href="/gestor/dashboard" className="text-purple-600 font-bold mr-4 hover:text-purple-700">
            Painel de Gestão
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/logingestor');
            }}
            className="text-purple-400 font-normal hover:text-purple-500"
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="w-full h-64 bg-linear-to-r from-indigo-900 via-fuchsia-500 to-orange-500 flex items-start justify-center pt-10">
        <h2 className="text-white text-4xl font-bold">Painel de Gestão</h2>
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
                {ALL_CATEGORIES.map((cat) => (
                  <div key={cat} className="flex items-center justify-between gap-1">
                    <span className="truncate">{cat}</span>
                    <span className="font-bold shrink-0">{stats.byCategory[cat] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-purple-600 rounded-xl p-6 text-white">
              <p className="text-lg font-bold mb-4 text-white/70">Demandas por região</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {ALL_REGIONS.map((reg) => (
                  <div key={reg} className="flex items-center justify-between gap-1">
                    <span className="truncate">{reg}</span>
                    <span className="font-bold shrink-0">{stats.byRegion[reg] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8 text-black">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Filtros
            </h3>
            <div className="flex flex-wrap gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex-1 min-w-[120px]">
                <Select
                  label="Status"
                  options={[
                    { value: "", label: "Todos" },
                    { value: "Aberta", label: "Aberta" },
                    { value: "Em análise", label: "Em Análise" },
                    { value: "Resolvida", label: "Resolvida" },
                  ]}
                  value={tempFilters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                />
              </div>

              <div className="flex-1 min-w-[120px]">
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
                  value={tempFilters.category}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                />
              </div>

              <div className="flex-1 min-w-[120px]">
                <Select
                  label="Região"
                  options={[
                    { value: "", label: "Todas" },
                    { value: "Região Metropolitana do Recife", label: "RMR" },
                    { value: "Zona da Mata", label: "Zona da Mata" },
                    { value: "Agreste", label: "Agreste" },
                    { value: "Sertão", label: "Sertão" },
                    { value: "Outra", label: "Outra" },
                  ]}
                  value={tempFilters.region}
                  onChange={(e) => handleFilterChange("region", e.target.value)}
                />
              </div>

              <div className="flex-1 min-w-[120px]">
                <Select
                  label="Prioridade"
                  options={[
                    { value: "", label: "Todas" },
                    { value: "Alta", label: "Alta" },
                    { value: "Média", label: "Média" },
                    { value: "Baixa", label: "Baixa" },
                  ]}
                  value={tempFilters.priority}
                  onChange={(e) => handleFilterChange("priority", e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="primary" 
                  size="md" 
                  onClick={handleApplyFilters}
                  className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                >
                  Aplicar Filtro
                </Button>
                <Button 
                  variant="secondary" 
                  size="md" 
                  onClick={handleResetFilters}
                  className="whitespace-nowrap"
                >
                  Limpar
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-black">Demandas</h3>
            <div className="flex flex-col gap-4">
              {isLoading ? (
                <div className="text-center py-10 italic text-gray-400">Atualizando lista...</div>
              ) : error ? (
                <div className="text-center py-10 text-red-500">{error}</div>
              ) : filteredDemands.length > 0 ? (
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