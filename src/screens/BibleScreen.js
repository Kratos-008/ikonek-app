import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BibleScreen({ navigation }) {
  const books = [
    { id: '1', name: 'Genesis', type: 'Old Testament', chapters: '50 Chapters' },
    { id: '2', name: 'Exodus', type: 'Old Testament', chapters: '40 Chapters' },
    { id: '3', name: 'Leviticus', type: 'Old Testament', chapters: '27 Chapters' },
    { id: '4', name: 'Numbers', type: 'Old Testament', chapters: '36 Chapters' },
    { id: '5', name: 'Deuteronomy', type: 'Old Testament', chapters: '34 Chapters' },
    { id: '6', name: 'Joshua', type: 'Old Testament', chapters: '24 Chapters' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation && navigation.goBack) {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Holy Bible 📖</Text>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search (e.g. Matthew 6:33 or Matt)"
            placeholderTextColor="#64748B"
          />
          <TouchableOpacity style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, styles.filterActive]}>
            <Text style={[styles.filterText, styles.filterActiveText]}>All (66)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterText}>Old (39)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterText}>New (27)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Books List (66)</Text>

        {/* Books List */}
        {books.map((item) => (
          <TouchableOpacity key={item.id} style={styles.card}>
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>
                {item.type} • {item.chapters}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backText: { color: '#60A5FA', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 30 },
  screenTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
  searchBox: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 8, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#FFF', paddingHorizontal: 10, fontSize: 14 },
  searchBtn: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, justifyContent: 'center' },
  searchBtnText: { color: '#FFF', fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterChip: { flex: 1, backgroundColor: '#1E293B', paddingVertical: 8, alignItems: 'center', borderRadius: 6, marginHorizontal: 4, borderWidth: 1, borderColor: '#334155' },
  filterActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  filterActiveText: { color: '#FFF' },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cardSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  arrow: { color: '#94A3B8', fontSize: 20, fontWeight: 'bold' },
});