export const AppColors = {
  primary: '#8628FF',
  primaryDark: '#7B2BEF',
  accent: '#FF5757',
  gradientStart: '#6523DC',
  gradientMid: '#8923DC',
  gradientEnd: '#FF4B5C',
  gestorGradientStart: '#E91E63',
  gestorGradientEnd: '#8628FF',
  white: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#D1D5DB',
  cardBg: '#FFFFFF',
  dotRed: '#EF4444',
  dotYellow: '#F59E0B',
  dotGreen: '#22C55E',
};

// Superfície dos cards de gráfico do painel do gestor. As cores abaixo foram
// escolhidas contra ela, não contra o branco.
export const ChartSurface = AppColors.primary;

// Paleta categórica. Ordem fixa: a fatia de uma categoria não muda de cor
// quando um filtro remove as outras.
//
// São 4 cores porque numa pizza toda fatia encosta em outra (inclusive a
// última na primeira). Estas quatro se distinguem em TODOS os pares, com e sem
// daltonismo, sobre o roxo do card. Uma quinta cor derruba isso — daí a cauda
// ser dobrada em "Outras" em vez de ganhar cor nova.
export const ChartPalette = ['#FFD166', '#7DD3FC', '#FF8FA3', '#86EFAC'];

// Status é semântico, não categórico: cada estado tem a sua cor reservada.
export const ChartStatusColors: Record<string, string> = {
  Aberta: '#FFD166',
  'Em análise': '#7DD3FC',
  Resolvida: '#86EFAC',
};

// Tinta sobre o card roxo — rótulos e eixos nunca vestem a cor da série.
export const ChartInk = {
  primary: '#FFFFFF',
  secondary: 'rgba(255,255,255,0.72)',
  grid: 'rgba(255,255,255,0.25)',
};
