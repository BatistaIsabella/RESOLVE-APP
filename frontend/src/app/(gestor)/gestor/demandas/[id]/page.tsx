'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDemandStore } from '@/stores/useDemandStore';
import { Button } from '@/components/UI/Button';
import { DemandDetails } from '@/components/UI/DemandDetails';
import { useEffect, useState } from 'react';
import Link from "next/link";
import { Demand, DemandPriority, DemandStatus } from '@/types/demand';
import { ApiError } from '@/lib/api';

export default function DemandDetailsManagerPage() {
  const params = useParams();
  const router = useRouter();
  const demandId = params.id as string;
  const [isMounted, setIsMounted] = useState(false);
  const [demand, setDemand] = useState<Demand | null>(null);
  const [erro, setErro] = useState('');

  const token = useDemandStore((state) => state.token);
  const role = useDemandStore((state) => state.role);
  const logout = useDemandStore((state) => state.logout);
  const fetchDemandById = useDemandStore((state) => state.fetchDemandById);
  const updateDemandStatus = useDemandStore((state) => state.updateDemandStatus);
  const updateDemandPriority = useDemandStore((state) => state.updateDemandPriority);
  const isLoading = useDemandStore((state) => state.isLoading);
  const _hasHydrated = useDemandStore((state) => state._hasHydrated);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !_hasHydrated) return;
    if (!token || role !== 'gestor') {
      router.push('/logingestor');
      return;
    }

    fetchDemandById(demandId).then(setDemand);
  }, [isMounted, _hasHydrated, demandId, fetchDemandById, token, role, router]);

  const handleBack = () => {
    router.push('/gestor/dashboard');
  };

  const handleStatusChange = async (newStatus: DemandStatus) => {
    setErro('');
    setDemand((prev) => prev ? { ...prev, status: newStatus } : prev);
    try {
      await updateDemandStatus(demandId, newStatus);
      const updated = await fetchDemandById(demandId);
      setDemand(updated);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao atualizar status');
      const rollback = await fetchDemandById(demandId);
      setDemand(rollback);
    }
  };

  const handlePriorityChange = async (newPriority: DemandPriority) => {
    setErro('');
    setDemand((prev) => prev ? { ...prev, priority: newPriority } : prev);
    try {
      await updateDemandPriority(demandId, newPriority);
      const updated = await fetchDemandById(demandId);
      setDemand(updated);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao atualizar prioridade');
      const rollback = await fetchDemandById(demandId);
      setDemand(rollback);
    }
  };

  if (!isMounted || !_hasHydrated) return <div className="min-h-screen bg-white" />;

  if (isLoading && !demand) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Demanda não encontrada</p>
          <Button
            onClick={handleBack}
            variant="primary"
            className="cursor-pointer hover:shadow-lg transition-all"
          >
            Voltar às Demandas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Link href="/gestor/dashboard">
          <h1 className="text-2xl font-bold text-purple-600 cursor-pointer hover:scale-105 transition-transform active:scale-95">
            Smart City
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-purple-700 bg-purple-50 px-3 py-1 rounded-full">Gestor</span>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/logingestor');
            }}
            className="text-sm font-semibold text-gray-600 hover:text-red-500 cursor-pointer transition-colors"
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="w-full h-72 bg-gradient-to-r from-indigo-700 via-purple-600 to-orange-500 flex items-center justify-center">
        <h2 className="text-white text-4xl font-bold text-center mt-10">Gerenciamento de Demanda</h2>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="-mt-24 bg-white rounded-3xl shadow-2xl p-6 md:p-10 relative z-10 mb-10">
          <div className="flex justify-between items-center mb-8 border-b pb-6 border-gray-100">
            <span className="text-gray-400 text-sm font-mono">ID: #{demandId}</span>
          </div>

          {erro && (
            <p className="text-sm text-red-500 text-center mb-4">{erro}</p>
          )}

          <DemandDetails
            demand={demand}
            onBack={handleBack}
            isManager={true}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
          />
        </div>
      </div>

      <div className="h-12" />
    </div>
  );
}
