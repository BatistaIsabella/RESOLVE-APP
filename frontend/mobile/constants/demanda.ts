export const CATEGORIAS = [
  'Iluminação Pública',
  'Manutenção de vias',
  'Saneamento',
  'Coleta de lixo',
  'Fiscalização',
  'Segurança',
  'Sinalização de Trânsito',
  'Outros Empecilhos',
] as const;

export const REGIOES = [
  'Região Metropolitana do Recife',
  'Zona da Mata',
  'Agreste',
  'Sertão',
  'Outra',
] as const;

export const STATUS = ['Aberta', 'Em análise', 'Resolvida'] as const;

export const PRIORIDADES = ['Baixa', 'Média', 'Alta'] as const;

export const PROBLEMAS_POR_CATEGORIA: Record<string, string[]> = {
  'Iluminação Pública': [
    'Poste com lâmpada apagada',
    'Lâmpada acesa durante o dia',
    'Poste caído',
    'Fiação exposta',
    'Rua inteira sem iluminação',
  ],
  'Manutenção de vias': [
    'Buraco no asfalto',
    'Calçada irregular',
    'Meio-fio quebrado',
    'Tampa de bueiro solta ou batendo',
  ],
  Saneamento: [
    'Vazamento de água limpa',
    'Esgoto a céu aberto',
    'Bueiro entupido',
    'Mau cheiro',
    'Inundação recorrente',
  ],
  'Coleta de lixo': [
    'Lixo acumulado',
    'Caminhão da coleta não passou',
    'Descarte de entulhos',
    'Lixeira pública quebrada',
    'Acúmulo de lixo em bueiros',
  ],
  Fiscalização: [
    'Obra irregular',
    'Invasão de área pública',
    'Poluição sonora',
    'Comércio ambulante sem autorização',
    'Terreno baldio com mato alto',
  ],
  Segurança: [
    'Câmera quebrada',
    'Atividade suspeita',
    'Praça sem policiamento',
    'Vidros quebrados',
    'Vandalismo',
  ],
  'Sinalização de Trânsito': [
    'Semáforo com defeito',
    'Placa caída ou pichada',
    'Faixa de pedestre apagada',
    'Placa de sinalização faltando',
    'Semáforo de pedestre sem som',
  ],
  'Outros Empecilhos': [
    'Risco de queda de árvore',
    'Carro abandonado',
    'Animal morto na pista',
    'Criadouro de insetos',
    'Objeto obstruindo passagem',
  ],
};
