import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Demand } from '@/types/demand';
import { extractBairro, formatPriorityLabel } from '@/utils/demandMapper';
import { AppColors } from '@/constants/colors';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface DemandCardProps {
  demand: Demand;
  onViewDetails: (id: string) => void;
  showImage?: boolean;
}

function getStatusDotColor(demand: Demand): string {
  if (demand.priority === 'Alta' || demand.status === 'Aberta') return AppColors.dotRed;
  if (demand.priority === 'Media' || demand.status === 'Em análise') return AppColors.dotYellow;
  return AppColors.dotGreen;
}

export function DemandCard({ demand, onViewDetails, showImage = false }: DemandCardProps) {
  const bairro = extractBairro(demand.endereco);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: getStatusDotColor(demand) }]} />
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{demand.titulo}</Text>
          <Text style={styles.location}>{bairro}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaLine}>
            Categoria: <Text style={styles.metaValue}>{demand.category}</Text>
          </Text>
          <Text style={styles.metaLine}>
            Status: <Text style={styles.metaBold}>{demand.status}</Text>
          </Text>
          <Text style={styles.metaLine}>
            Prioridade: <Text style={styles.metaBold}>{formatPriorityLabel(demand.priority)}</Text>
          </Text>
        </View>
        <PrimaryButton
          label="Ver mais"
          small
          onPress={() => onViewDetails(demand.id)}
          style={styles.button}
        />
      </View>

      {showImage && demand.fotoUrl ? (
        <Image source={{ uri: demand.fotoUrl }} style={styles.image} contentFit="cover" />
      ) : null}

      {showImage ? (
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionLabel}>Descrição</Text>
          <Text style={styles.descriptionText}>{demand.description || '—'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: AppColors.white,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginTop: 4,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text,
  },
  location: {
    fontSize: 13,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  meta: {
    flex: 1.2,
    gap: 2,
  },
  metaLine: {
    fontSize: 11,
    color: AppColors.textMuted,
  },
  metaValue: {
    color: AppColors.text,
  },
  metaBold: {
    fontWeight: '700',
    color: AppColors.text,
  },
  button: {
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 12,
  },
  descriptionBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    minHeight: 80,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textMuted,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: AppColors.text,
    lineHeight: 20,
  },
});
