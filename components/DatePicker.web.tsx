import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface DatePickerProps {
  value: Date;
  onChange: (event: any, date?: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  display?: string;
}

export default function DatePicker({ value, onChange, mode = 'date' }: DatePickerProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(event.target.value);
    if (!isNaN(newDate.getTime())) {
      onChange(event as any, newDate);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
        minWidth: 200,
      }}
    >
      <input
        type="date"
        value={formatDate(value)}
        onChange={handleChange}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: COLORS.text,
          fontSize: 16,
          fontFamily: 'SpaceGrotesk_500Medium',
          outline: 'none',
          width: '100%',
          colorScheme: 'dark',
        }}
      />
    </View>
  );
}
