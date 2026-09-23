import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors, ChartInk } from '@/constants/colors';

export interface LegendItem {
  label: string;
  value: number;
  color: string;
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  /**
   * Rótulo + contagem de cada série. Obrigatório quando há mais de uma cor: a
   * identidade nunca fica só na cor, e é o que dá leitura às fatias de baixo
   * contraste sobre o roxo.
   */
  legend?: LegendItem[];
  total?: number;
}

export function ChartCard({ title, children, legend, total }: ChartCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.plot}>{children}</View>

      {legend && legend.length > 0 ? (
        <View style={styles.legend}>
          {legend.map((item) => {
            const pct = total && total > 0 ? Math.round((item.value / total) * 100) : null;
            return (
              <View key={item.label} style={styles.legendRow}>
                <View style={[styles.swatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.legendValue}>
                  {item.value}
                  {pct !== null ? ` · ${pct}%` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.primary,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    color: ChartInk.primary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  plot: {
    alignItems: 'center',
  },
  legend: {
    marginTop: 14,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
    color: ChartInk.primary,
    fontSize: 12,
  },
  legendValue: {
    color: ChartInk.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
