import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrayerJournalScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation && navigation.goBack && navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Prayer Journal 📓</Text>

        <View style={styles.inputCard}>
          <TextInput style={styles.input} placeholder="Write a prayer request..." placeholderTextColor="#64748B" />
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add Request</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subHeading}>My Requests</Text>

        <View style={styles.requestCard}>
          <Text style={styles.reqTitle}>Guidance for College Exams</Text>
          <Text style={styles.reqSub}>Oct 01, 2026 • Pending</Text>
        </View>

        <View style={styles.requestCard}>
          <Text style={styles.reqTitle}>Healing for Grandma</Text>
          <Text style={styles.reqSub}>Sep 28, 2026 • Answered 🙏</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 16 },
  backText: { color: '#60A5FA', fontSize: 16, fontWeight: 'bold' },
  scroll: { padding: 16, paddingBottom: 30 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  inputCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  input: { color: '#FFF', backgroundColor: '#0F172A', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  addBtn: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontWeight: 'bold' },
  subHeading: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  requestCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  reqTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  reqSub: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
});