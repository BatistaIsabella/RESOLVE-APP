'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useState, ChangeEvent } from 'react'

import { DemandCard } from "@/components/UI/DemandCard"
import { useDemandStore } from "@/stores/useDemandStore"
import Link from "next/link";

import { CATEGORIAS, REGIOES, STATUS, PRIORIDADES } from '@/constants/demanda'

type FilterKeys = "status" | "category" | "region" | "priority"

export default function TelaUsuarioPage() {
  const [isMounted, setIsMounted] = useState(false)

  const filters = useDemandStore((state) => state.filters)
  const isLoading = useDemandStore((state) => state.isLoading)
  const error = useDemandStore((state) => state.error)
  const token = useDemandStore((state) => state.token)
  const userName = useDemandStore((state) => state.userName)
  const logout = useDemandStore((state) => state.logout)
  const setFilters = useDemandStore((state) => state.setFilters)
  const resetFilters = useDemandStore((state) => state.resetFilters)
  const getFilteredDemands = useDemandStore((state) => state.getFilteredDemands)
  const fetchDemands = useDemandStore((state) => state.fetchDemands)

  const _hasHydrated = useDemandStore((state) => state._hasHydrated)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && _hasHydrated) {
      if (!token) {
        router.push("/login")
        return
      }
      fetchDemands()
    }
  }, [isMounted, _hasHydrated, token, router, fetchDemands])

  const filteredDemands = getFilteredDemands()

  if (!isMounted || !_hasHydrated) {
    return <div className="min-h-screen bg-neutral-100 flex items-center justify-center text-gray-500">Carregando dados...</div>
  }

  const getOptions = (key: FilterKeys) => {
    switch (key) {
      case "status": return ["", ...STATUS]
      case "category": return ["", ...CATEGORIAS]
      case "region": return ["", ...REGIOES]
      case "priority": return ["", ...PRIORIDADES]
      default: return [""]
    }
  }

  const handleFilterChange = (key: FilterKeys, value: string) => {
    setFilters({ [key]: value })
  }

  const handleViewDetails = (demandId: string) => {
    router.push(`/demandas/${demandId}`)
  }

  return (
    <div className="min-h-screen bg-neutral-100"> 
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-100 px-6 py-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl font-bold text-purple-600 cursor-pointer hover:opacity-80 transition-all hover:scale-105 active:scale-95">
            RESOLVE
          </h1>
        </Link>
        <div className="flex gap-4 items-center">
          <span className="text-sm font-medium text-purple-700">{userName ?? "Usuário"}</span>
          <button
            type="button"
            onClick={() => {
              logout()
              router.push("/login")
            }}
            className="text-sm text-gray-600 hover:text-red-500 cursor-pointer transition-colors font-semibold"
          >
            Sair
          </button>
        </div>
      </header> 

      <div className="h-[250px] flex items-center justify-center 
        bg-gradient-to-r from-purple-700 via-purple-500 to-orange-400 shadow-lg">
        <h1 className="text-white text-3xl md:text-5xl font-bold">
          Denúncias
        </h1>
      </div>

      <div className="max-w-5xl mx-auto -mt-16 pb-20 px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10">

          <div className="flex justify-center mb-10">
            <Link href="/demandas/nova">
              <button 
                type="button"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-95"
              >
                Criar Nova Solicitação
              </button>
            </Link>
          </div>

          <div className="mb-10">
            <p className="text-xs font-bold text-gray-400 mb-4 tracking-wider uppercase">
              FILTROS DE BUSCA
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <FilterItem
                label="Status"
                options={getOptions("status")}
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              />

              <FilterItem
                label="Categoria"
                options={getOptions("category")}
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
              />

              <FilterItem
                label="Região"
                options={getOptions("region")}
                value={filters.region}
                onChange={(e) => handleFilterChange("region", e.target.value)}
              />

              <FilterItem
                label="Prioridade"
                options={getOptions("priority")}
                value={filters.priority}
                onChange={(e) => handleFilterChange("priority", e.target.value)}
              />

              <button
                onClick={resetFilters}
                className="
                  h-[38px]
                  px-4
                  rounded-lg
                  text-sm font-semibold
                  bg-purple-600
                  text-white
                  hover:bg-purple-700
                  transition-all
                  cursor-pointer
                  hover:shadow-md
                  active:scale-95
                  flex items-center justify-center
                "
              >
                Limpar
              </button>
            </div>
          </div>

          {/* RESULTADOS */}
          <div className="space-y-4">
            <p className="font-bold text-gray-700">
              Resultados Recentes
            </p>

            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center py-10 text-gray-500">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                  Buscando denúncias...
                </div>
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
                <div className="text-center py-10 text-gray-400">
                  Nenhuma denúncia encontrada para esses filtros.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

interface FilterItemProps {
  label: string;
  options: string[];
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}

function FilterItem({ label, options, value, onChange }: FilterItemProps) {
  return (
    <div>
      <p className="text-xs font-bold mb-1 text-gray-600">
        {label}
      </p>

      <select
        value={value}
        onChange={onChange}
        className="
          w-full h-[38px]
          border border-gray-300
          rounded-lg
          px-3 py-1.5
          text-sm
          focus:outline-none
          focus:ring-2
          focus:ring-purple-500
          cursor-pointer
          hover:border-purple-400
          transition-colors
        "
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "" ? "Todos" : opt}
          </option>
        ))}
      </select>
    </div>
  )
}