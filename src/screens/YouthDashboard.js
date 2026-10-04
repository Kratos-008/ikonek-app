import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';

export function YouthDashboard({ user, onLogout, onNavigate }) {
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Welcome, {user?.name}! 👋</Text>

        {/* Tab Navigation Menu */}
        <View style={styles.navGrid}>
          <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('bible')}>
            <Text style={styles.navIcon}>📖</Text>
            <Text style={styles.navText}>Bible</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('events')}>
            <Text style={styles.navIcon}>📅</Text>
            <Text style={styles.navText}>Events</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('attendance')}>
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('prayer')}>
            <Text style={styles.navIcon}>🙏</Text>
            <Text style={styles.navText}>Prayers</Text>
          </TouchableOpacity>
        </View>

        {/* Verse Highlight */}
        <View style={styles.verseBox}>
          <Text style={styles.verseTitle}>📖 Verse of the Week</Text>
          <Text style={styles.verseText}>
            "Let no one despise you for your youth, but set the believers an example..." - 1 Tim 4:12
          </Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Button title="Logout" onPress={onLogout} type="secondary" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', color: '#1A2B4C', textAlign: 'center', marginBottom: 15 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  navCard: { width: '48%', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  navIcon: { fontSize: 28, marginBottom: 6 },
  navText: { fontWeight: 'bold', color: '#1E293B', fontSize: 14 },
  verseBox: { backgroundColor: '#EFF6FF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  verseTitle: { fontWeight: 'bold', color: '#1E40AF', marginBottom: 4 },
  verseText: { color: '#334155', fontStyle: 'italic', fontSize: 13 },
});