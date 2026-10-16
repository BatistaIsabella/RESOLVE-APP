import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { DemandFilters as Filters } from '@/types/demand';
import { CATEGORIAS, PRIORIDADES, REGIOES, STATUS } from '@/constants/demanda';
import { SelectField } from '@/components/ui/SelectField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AppColors } from '@/constants/colors';

interface DemandFiltersProps {
  filters: Filters;
  onApply: (filters: Filters) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export function DemandFiltersPanel({ filters, onApply }: DemandFiltersProps) {
  const [temp, setTemp] = useState<Filters>(filters);
  const [search, setSearch] = useState(filters.search ?? '');

  const filtersRef = useRef(filters);
  const onApplyRef = useRef(onApply);
  useEffect(() => {
    filtersRef.current = filters;
    onApplyRef.current = onApply;
  });

  useEffect(() => {
    const termo = search.trim();
    if (termo === (filtersRef.current.search ?? '').trim()) return;
    const timer = setTimeout(() => {
      onApplyRef.current({ ...filtersRef.current, search: termo });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Filtros</Text>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar no título ou na descrição"
        placeholderTextColor={AppColors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel="Buscar denúncias"
      />
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
      <PrimaryButton label="Aplicar filtro" onPress={() => onApply({ ...temp, search: search.trim() })} style={styles.applyBtn} />
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
  search: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: AppColors.text,
    backgroundColor: AppColors.white,
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
