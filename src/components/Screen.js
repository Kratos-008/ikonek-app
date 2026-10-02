import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { C } from '../constants/theme';

export function Screen({ title, subtitle, children }) {
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logo}>
            <Text style={s.logoText}>iK</Text>
          </View>
          <Text style={s.brand}>IKONEK</Text>
          {title ? <Text style={s.title}>{title}</Text> : null}
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          <View style={s.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24, alignItems: 'center' },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  brand: { marginTop: 8, fontSize: 14, letterSpacing: 4, color: C.dark, fontWeight: '700' },
  title: { marginTop: 16, fontSize: 28, fontWeight: '800', color: C.text },
  subtitle: { marginTop: 4, fontSize: 15, color: C.muted, textAlign: 'center' },
  card: {
    width: '100%',
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0A1F5C',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});