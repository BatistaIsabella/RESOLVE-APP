"use client";

import { useState } from "react";
import { Demand, DemandStatus, DemandPriority } from "@/types/demand";

interface DemandDetailsProps {
  demand: Demand;
  onBack: () => void;
  isManager: boolean;
  onStatusChange?: (status: DemandStatus) => void;
  onPriorityChange?: (priority: DemandPriority) => void;
  /** Ações do cidadão sobre a própria denúncia; só passe enquanto ela está aberta. */
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const statusOptions: DemandStatus[] = ["Aberta", "Em análise", "Resolvida"];
const priorityOptions: DemandPriority[] = ["Alta", "Media", "Baixa"];

export function DemandDetails({
  demand,
  onBack,
  isManager,
  onStatusChange,
  onPriorityChange,
  onEdit,
  onDelete,
  isDeleting = false,
}: DemandDetailsProps) {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [tempStatus, setTempStatus] = useState(demand.status);
  const [tempPriority, setTempPriority] = useState(demand.priority);

  const handleStatusSave = () => {
    onStatusChange?.(tempStatus);
    setIsEditingStatus(false);
  };

  const handlePrioritySave = () => {
    onPriorityChange?.(tempPriority);
    setIsEditingPriority(false);
  };

  return (
    <div className="border border-gray-300 rounded-lg p-8 mt-6 bg-white shadow-sm">
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
        <div className="w-6 h-6 rounded-full bg-red-600" />
        <h2 className="text-xl font-bold text-gray-800">{demand.problema}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
       
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-gray-700 mb-2">Foto(s) anexada(s):</p>
          {demand.imagens && demand.imagens.length > 0 ? (
            <>
              <div className="bg-gray-100 border border-gray-200 rounded-md h-48 w-full overflow-hidden">
                <img src={demand.imagens[0]} alt={demand.problema} className="w-full h-full object-cover" />
              </div>
              {demand.imagens.length > 1 && (
                <div className="flex gap-2 w-full">
                  {demand.imagens.slice(1).map((url, i) => (
                    <div key={i} className="flex-1 h-20 bg-gray-100 border border-gray-200 rounded-md overflow-hidden">
                      <img src={url} alt={`Foto ${i + 2}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-100 border border-gray-200 rounded-md h-48 w-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="text-2xl block">📷</span>
                <span className="text-xs">Sem imagem</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 text-sm text-gray-800">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Categoria</p>
            <p className="text-sm font-medium">{demand.category}</p>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Prioridade</span>
              {isManager && !isEditingPriority && (
                <button onClick={() => setIsEditingPriority(true)} className="text-xs hover:opacity-70">✏️</button>
              )}
            </div>
            {isManager && isEditingPriority ? (
              <div className="flex gap-2 items-center mt-1">
                <select
                  value={tempPriority}
                  onChange={(e) => setTempPriority(e.target.value as DemandPriority)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:border-purple-500"
                >
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>{p === "Media" ? "Média" : p}</option>
                  ))}
                </select>
                <button onClick={handlePrioritySave} className="bg-green-500 text-white p-1 px-2 rounded text-xs">✓</button>
                <button onClick={() => setIsEditingPriority(false)} className="bg-gray-300 text-gray-700 p-1 px-2 rounded text-xs">✕</button>
              </div>
            ) : (
              <p className="text-sm font-bold text-gray-900">{demand.priority === "Media" ? "Média" : demand.priority}</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Status Atual</span>
              {isManager && !isEditingStatus && (
                <button onClick={() => setIsEditingStatus(true)} className="text-xs hover:opacity-70">✏️</button>
              )}
            </div>
            {isManager && isEditingStatus ? (
              <div className="flex gap-2 items-center mt-1">
                <select
                  value={tempStatus}
                  onChange={(e) => setTempStatus(e.target.value as DemandStatus)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:border-purple-500"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button onClick={handleStatusSave} className="bg-green-500 text-white p-1 px-2 rounded text-xs">✓</button>
                <button onClick={() => setIsEditingStatus(false)} className="bg-gray-300 text-gray-700 p-1 px-2 rounded text-xs">✕</button>
              </div>
            ) : (
              <p className="text-sm font-bold text-gray-900">{demand.status}</p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Solicitante</p>
            <p className="text-sm font-medium text-gray-800">{demand.solicitante || "Não identificado"}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Endereço da Ocorrência</p>
            <p className="text-sm">{demand.endereco}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Data do Registro</p>
            <p className="text-sm text-gray-600">{demand.dataRegistro}</p>
          </div>
        </div>

        <div className="flex flex-col">
          <p className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider">Descrição Detalhada:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 min-h-[200px] text-sm text-gray-700 shadow-inner">
            {demand.detalhes}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-gray-200">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-purple-700 transition-all cursor-pointer"
          >
            Editar
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-red-50 text-red-600 border border-red-200 px-6 py-2 rounded-full text-sm font-bold hover:bg-red-100 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </button>
        )}
        <button
          onClick={onBack}
          className="bg-gray-100 text-gray-600 px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-all"
        >
          ← Voltar para Lista
        </button>
      </div>
    </div>
  );
}