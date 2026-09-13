import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppColors } from '@/constants/colors';

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
}

export function SelectField({ label, value, options, placeholder, onChange }: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || placeholder || 'Selecionar'}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map((opt) => (
                <Pressable
                  key={opt || 'all'}
                  style={styles.option}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, value === opt && styles.optionSelected]}>
                    {opt || 'Todos'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: AppColors.white,
    minHeight: 52,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    color: AppColors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: AppColors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    color: AppColors.textMuted,
    fontWeight: '400',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: AppColors.white,
    borderRadius: 16,
    maxHeight: '70%',
    padding: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: AppColors.text,
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 15,
    color: AppColors.text,
  },
  optionSelected: {
    color: AppColors.primary,
    fontWeight: '700',
  },
});
