export type DemandStatus = "Aberta" | "Em análise" | "Resolvida";
export type DemandCategory = "Iluminação Pública" | "Manutenção de vias" | "Saneamento" | "Coleta de lixo" | "Fiscalização" | "Segurança" | "Sinalização de Trânsito" | "Outros Empecilhos";
export type DemandPriority = "Alta" | "Media" | "Baixa";
export type DemandRegion = "Região Metropolitana do Recife" | "Zona da Mata" | "Agreste" | "Sertão" | "Outra";
export type ProblemaUrbano = 
  | "Poste com lâmpada apagada" | "Lâmpada acesa durante o dia" | "Poste caído" | "Fiação exposta" 
  | "Rua inteira sem iluminação" | "Buraco no asfalto" | "Calçada irregular" | "Meio-fio quebrado"
  | "Tampa de bueiro solta ou batendo" | "Vazamento de água limpa" | "Esgoto a céu aberto" 
  | "Bueiro entupido" | "Mau cheiro" | "Inundação recorrente" | "Lixo acumulado" 
  | "Caminhão da coleta não passou" | "Descarte de entulhos" | "Lixeira pública quebrada"
  | "Acúmulo de lixo em bueiros" | "Obra irregular" | "Invasão de área pública"
  | "Poluição sonora" | "Comércio ambulante sem autorização" | "Terreno baldio com mato alto"
  | "Câmera quebrada" | "Atividade suspeita" | "Praça sem policiamento" 
  | "Vidros quebrados" | "Vandalismo" | "Semáforo com defeito" | "Placa caída ou pichada"
  | "Faixa de pedestre apagada" | "Placa de sinalização faltando" | "Semáforo de pedestre sem som"
  | "Risco de queda de árvore" | "Carro abandonado" | "Animal morto na pista"
  | "Criadouro de insetos" | "Objeto obstruindo passagem";

export interface Demand {
  id: string;
  problema: ProblemaUrbano;
  location: string;
  category: DemandCategory;
  status: DemandStatus;
  priority: DemandPriority;
  region: DemandRegion;
  description?: string;
  createdAt?: string;
  fotoUrl?: string;
  imagens?: string[];
  endereco: string;
  solicitante: string;
  dataRegistro: string;
  detalhes: string;
}

export interface DemandUpdateInput {
  titulo?: string;
  descricao?: string;
  categoria?: DemandCategory;
  regiao?: DemandRegion;
  endereco?: string;
}

export interface DemandFilters {
  status: DemandStatus | "";
  category: DemandCategory | "";
  region: DemandRegion | "";
  priority: DemandPriority | "";
}
