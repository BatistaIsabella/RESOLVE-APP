import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DemandFilters as Filters } from '@/types/demand';
import { CATEGORIAS, PRIORIDADES, REGIOES, STATUS } from '@/constants/demanda';
import { SelectField } from '@/components/ui/SelectField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AppColors } from '@/constants/colors';

interface DemandFiltersProps {
  filters: Filters;
  onApply: (filters: Filters) => void;
}

export function DemandFiltersPanel({ filters, onApply }: DemandFiltersProps) {
  const [temp, setTemp] = useState<Filters>(filters);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Filtros</Text>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <SelectField
            label="Status"
            value={temp.status}
            options={['', ...STATUS]}
            placeholder="Status"
            onChange={(v) => setTemp((p) => ({ ...p, status: v as Filters['status'] }))}
          />
        </View>
        <View style={styles.gridItem}>
          <SelectField
            label="Categoria"
            value={temp.category}
            options={['', ...CATEGORIAS]}
            placeholder="Categoria"
            onChange={(v) => setTemp((p) => ({ ...p, category: v as Filters['category'] }))}
          />
        </View>
        <View style={styles.gridItem}>
          <SelectField
            label="Região"
            value={temp.region}
            options={['', ...REGIOES]}
            placeholder="Região"
            onChange={(v) => setTemp((p) => ({ ...p, region: v as Filters['region'] }))}
          />
        </View>
        <View style={styles.gridItem}>
          <SelectField
            label="Prioridade"
            value={temp.priority === 'Media' ? 'Média' : temp.priority}
            options={['', ...PRIORIDADES]}
            placeholder="Prioridade"
            onChange={(v) =>
              setTemp((p) => ({
                ...p,
                priority: (v === 'Média' ? 'Media' : v) as Filters['priority'],
              }))
            }
          />
        </View>
      </View>
      <PrimaryButton label="Aplicar filtro" onPress={() => onApply(temp)} style={styles.applyBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '47%',
  },
  applyBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
  },
});
