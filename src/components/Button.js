import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { C } from '../constants/theme';

export function Button({ title, onPress, secondary, type }) {
  const isSecondary = secondary || type === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.btn, isSecondary && s.btnSecondary]}
    >
      <Text style={[s.btnText, isSecondary && { color: C?.primary || '#2563EB' }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor: C?.primary || '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C?.primary || '#2563EB',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});