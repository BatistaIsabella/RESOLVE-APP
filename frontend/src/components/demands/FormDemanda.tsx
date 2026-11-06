'use client'

import { useState, useRef } from 'react'
import { useDemandStore } from '@/stores/useDemandStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { Demand, DemandCategory, DemandRegion } from '@/types/demand'
import { useRouter } from "next/navigation"
import { ApiError } from '@/lib/api'

const CATEGORIAS = [
  "Iluminação Pública", "Manutenção de vias", "Saneamento", 
  "Coleta de lixo", "Fiscalização", "Segurança", 
  "Sinalização de Trânsito", "Outros Empecilhos"
]

const REGIOES = ["Região Metropolitana do Recife", "Zona da Mata", "Agreste", "Sertão", "Outra"]

const PROBLEMAS_POR_CATEGORIA: Record<string, string[]> = {
  "Iluminação Pública": ["Poste com lâmpada apagada", "Lâmpada acesa durante o dia", "Poste caído", "Fiação exposta", "Rua inteira sem iluminação"],
  "Manutenção de vias": ["Buraco no asfalto", "Calçada irregular", "Meio-fio quebrado", "Tampa de bueiro solta ou batendo"],
  "Saneamento": ["Vazamento de água limpa", "Esgoto a céu aberto", "Bueiro entupido", "Mau cheiro", "Inundação recorrente"],
  "Coleta de lixo": ["Lixo acumulado", "Caminhão da coleta não passou", "Descarte de entulhos", "Lixeira pública quebrada", "Acúmulo de lixo em bueiros"],
  "Fiscalização": ["Obra irregular", "Invasão de área pública", "Poluição sonora", "Comércio ambulante sem autorização", "Terreno baldio com mato alto"],
  "Segurança": ["Câmera quebrada", "Atividade suspeita", "Praça sem policiamento", "Vidros quebrados", "Vandalismo"],
  "Sinalização de Trânsito": ["Semáforo com defeito", "Placa caída ou pichada", "Faixa de pedestre apagada", "Placa de sinalização faltando", "Semáforo de pedestre sem som"],
  "Outros Empecilhos": ["Risco de queda de árvore", "Carro abandonado", "Animal morto na pista", "Criadouro de insetos", "Objeto obstruindo passagem"]
};

interface FormDemandaProps {
  /** Quando informada, o formulário edita esta denúncia em vez de criar uma nova. */
  demand?: Demand
}

export function FormDemanda({ demand }: FormDemandaProps = {}) {
  const isEdit = !!demand
  const router = useRouter()
  const createDemand = useDemandStore((state) => state.createDemand)
  const editDemand = useDemandStore((state) => state.editDemand)
  const token = useAuthStore((state) => state.token)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [images, setImages] = useState<(string | null)[]>([null, null, null])
  const [imagesBase64, setImagesBase64] = useState<(string | null)[]>([null, null, null])
  const [targetIndex, setTargetIndex] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [formData, setFormData] = useState({
    problema: demand?.problema ?? '',
    categoria: demand?.category ?? '',
    regiao: demand?.region ?? '',
    endereco: demand?.endereco ?? '',
    descricao: demand?.description ?? demand?.detalhes ?? ''
  })

  const openExplorer = (index: number) => {
    setTargetIndex(index)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string
        const idx = targetIndex
        setImages((prev) => { const n = [...prev]; n[idx] = base64; return n })
        setImagesBase64((prev) => { const n = [...prev]; n[idx] = base64; return n })
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    }
  }

  const removeImage = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const newImages = [...images]
    newImages[indexToRemove] = null
    setImages(newImages)
    const newBase64 = [...imagesBase64]
    newBase64[indexToRemove] = null
    setImagesBase64(newBase64)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!token) {
      alert("⚠️ Faça login para registrar uma denúncia!")
      router.push("/login")
      return
    }
    
    if (!formData.problema || !formData.categoria || !formData.regiao || !formData.endereco || !formData.descricao) {
      alert("⚠️ Preencha todos os campos obrigatórios!")
      return
    }

    setLoading(true)

    try {
      if (demand) {
        await editDemand(demand.id, {
          titulo: formData.problema,
          categoria: formData.categoria as DemandCategory,
          regiao: formData.regiao as DemandRegion,
          descricao: formData.descricao,
          endereco: formData.endereco,
        })
        alert("✅ Denúncia atualizada com sucesso!")
        router.push(`/demandas/${demand.id}`)
        return
      }

      const imagensEnviar = imagesBase64.filter((img): img is string => img !== null)

      await createDemand({
        titulo: formData.problema,
        categoria: formData.categoria as DemandCategory,
        regiao: formData.regiao as DemandRegion,
        descricao: formData.descricao,
        endereco: formData.endereco,
        imagens: imagensEnviar.length > 0 ? imagensEnviar : undefined,
      })

      alert("✅ Denúncia salva com sucesso!")
      router.push("/telaUsuario")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao salvar denúncia"
      setErro(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-4xl shadow-xl w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
      
      <div className="flex flex-col gap-5">
        <select 
          required 
          className="w-full py-3 border border-gray-300 rounded-full text-center outline-none bg-white text-gray-600 focus:border-purple-500 cursor-pointer"
          value={formData.categoria}
          onChange={(e) => setFormData({...formData, categoria: e.target.value, problema: ''})}
        >
          <option value="" disabled> Selecione a Categoria *</option>
          {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <select 
          required 
          disabled={!formData.categoria} 
          className="w-full py-3 border border-gray-300 rounded-full text-center outline-none bg-white text-gray-600 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed cursor-pointer"
          value={formData.problema}
          onChange={(e) => setFormData({...formData, problema: e.target.value})}
        >
          <option value="" disabled> Problema Urbano Encontrado*</option>
          {formData.categoria && PROBLEMAS_POR_CATEGORIA[formData.categoria].map(prob => (
            <option key={prob} value={prob}>{prob}</option>
          ))}
        </select>        

        <select 
          required 
          className="w-full py-3 border border-gray-300 rounded-full text-center outline-none bg-white text-gray-600 focus:border-purple-500 cursor-pointer"
          value={formData.regiao}
          onChange={(e) => setFormData({...formData, regiao: e.target.value})}
        >
          <option value="" disabled>Selecione a Região *</option>
          {REGIOES.map(reg => <option key={reg} value={reg}>{reg}</option>)}
        </select>

        <input 
          type="text" required placeholder="Endereço Completo *" 
          className="w-full py-3 border border-gray-300 rounded-full text-center outline-none focus:border-purple-500"
          value={formData.endereco}
          onChange={(e) => setFormData({...formData, endereco: e.target.value})}
        />

        <textarea 
          required placeholder="Descrição detalhada *" rows={4}
          className="w-full py-4 px-6 border border-gray-300 rounded-2xl outline-none focus:border-purple-500 resize-none text-center"
          value={formData.descricao}
          onChange={(e) => setFormData({...formData, descricao: e.target.value})}
        />
      </div>

      <div className="flex flex-col gap-6">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

        {isEdit ? (
          <p className="grow text-center text-sm text-gray-500 flex items-center justify-center px-4">
            As fotos enviadas no registro não podem ser alteradas na edição.
          </p>
        ) : (
        <>
        <div 
          onClick={() => openExplorer(0)} 
          className="relative grow border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer min-h-[200px] bg-gray-50"
        >
          {images[0] ? (
            <>
              <img src={images[0]} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={(e) => removeImage(0, e)} className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors cursor-pointer">✕</button>
            </>
          ) : (
            <div className="text-center">
              <span className="text-4xl mb-2 block">📷</span>
              <p className="font-semibold text-gray-500 px-4">Anexar imagem principal</p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          {[1, 2].map((i) => (
            <div 
              key={i} 
              onClick={() => openExplorer(i)} 
              className="relative w-1/2 h-32 border border-gray-300 rounded-2xl flex items-center justify-center overflow-hidden hover:bg-gray-100 hover:border-purple-300 cursor-pointer bg-white transition-all"
            >
              {images[i] ? (
                <>
                  <img src={images[i]} alt="Preview small" className="w-full h-full object-cover" />
                  <button type="button" onClick={(e) => removeImage(i, e)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors cursor-pointer">✕</button>
                </>
              ) : (
                <span className="text-4xl text-gray-300">+</span>
              )}
            </div>
          ))}
        </div>
        </>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button 
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl uppercase tracking-wider transition-all duration-200 cursor-pointer hover:shadow-md border border-gray-300 active:scale-95 text-center"
          >
            Voltar
          </button>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full sm:w-2/3 bg-purple-600 text-white font-bold py-4 rounded-xl uppercase tracking-wider transition-all duration-200 cursor-pointer hover:bg-purple-700 hover:shadow-2xl hover:-translate-y-1 active:scale-95 active:translate-y-0 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Salvar Denúncia"}
          </button>
        </div>
        
        {erro && <p className="text-sm text-red-500 text-center">{erro}</p>}
      </div>
    </form>
  )
}