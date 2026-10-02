import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  Share
} from 'react-native';

export default function EventsScreen() {
  const [events, setEvents] = useState([
    {
      id: '1',
      title: 'Youth Fellowship Night',
      category: 'Upcoming',
      date: 'Sat, Oct 12, 2026 • 6:00 PM - 8:30 PM',
      location: 'Main Sanctuary',
      month: 'October',
      flowOfProgram: '6:00 PM - Opening Prayer & Worship\n6:45 PM - Games & Ice Breakers\n7:15 PM - Message / Word of God\n8:00 PM - Fellowship & Snacks',
      signedUp: ['John Doe', 'Maria Santos', 'Mark Joshua'],
      reminderSet: false,
    },
    {
      id: '2',
      title: 'Community Outreach',
      category: 'Special',
      date: 'Sat, Oct 26, 2026 • 8:00 AM - 12:00 PM',
      location: 'Nursery Masbate City',
      month: 'October',
      flowOfProgram: '8:00 AM - Assembly & Briefing\n8:30 AM - Feeding Program\n10:00 AM - Gift Giving & Sharing\n11:30 AM - Closing Remarks',
      signedUp: ['Pastor Alex', 'Sarah Jenkins'],
      reminderSet: false,
    },
    {
      id: '3',
      title: 'Worship & Prayer Retreat',
      category: 'Annual',
      date: 'Nov 15 - 17, 2026 • Whole Day',
      location: 'Camp Center',
      month: 'November',
      flowOfProgram: 'Day 1: Arrival & Opening Worship\nDay 2: Morning Devotion & Workshop\nDay 3: Dedication & Departure',
      signedUp: ['Worship Team', 'Youth Leaders'],
      reminderSet: false,
    },
  ]);

  const [selectedMonth, setSelectedMonth] = useState('All');
  
  // States para sa Details Modal (Flow & Attendees)
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // States para sa Edit Event Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editFlow, setEditFlow] = useState('');
  const [editMonth, setEditMonth] = useState('October');
  const [editCategory, setEditCategory] = useState('Upcoming');

  // States para sa Add Event Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newFlow, setNewFlow] = useState('');
  const [newMonth, setNewMonth] = useState('October');
  const [newCategory, setNewCategory] = useState('Upcoming');

  // Function para i-toggle ang Reminder
  const handleToggleReminder = (id) => {
    setEvents(events.map(ev => {
      if (ev.id === id) {
        const newStatus = !ev.reminderSet;
        Alert.alert(
          newStatus ? "Reminder Set" : "Reminder Removed", 
          newStatus ? `You will be reminded for "${ev.title}".` : `Reminder cancelled for "${ev.title}".`
        );
        return { ...ev, reminderSet: newStatus };
      }
      return ev;
    }));
  };

  // Buksan ang Details Modal
  const handleOpenDetails = (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  // Buksan ang Edit Modal
  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditDate(event.date);
    setEditLocation(event.location);
    setEditFlow(event.flowOfProgram);
    setEditMonth(event.month);
    setEditCategory(event.category);
    setEditModalVisible(true);
  };

  // I-save ang na-edit na event
  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editDate.trim()) {
      Alert.alert("Error", "Title and Date cannot be empty.");
      return;
    }

    setEvents(events.map(ev => {
      if (ev.id === editingEvent.id) {
        return {
          ...ev,
          title: editTitle,
          date: editDate,
          location: editLocation,
          flowOfProgram: editFlow,
          month: editMonth,
          category: editCategory
        };
      }
      return ev;
    }));

    setEditModalVisible(false);
    Alert.alert("Success", "Event successfully updated!");
  };

  // Function para i-add ang bagong event
  const handleAddEvent = () => {
    if (!newTitle.trim() || !newDate.trim()) {
      Alert.alert("Error", "Please enter Event Title and Date.");
      return;
    }

    const newEventObj = {
      id: Date.now().toString(),
      title: newTitle,
      category: newCategory,
      date: newDate,
      location: newLocation || 'Main Church',
      month: newMonth,
      flowOfProgram: newFlow || 'No flow of program provided yet.',
      signedUp: [],
      reminderSet: false,
    };

    setEvents([newEventObj, ...events]);
    setAddModalVisible(false);
    
    // Clear inputs
    setNewTitle('');
    setNewDate('');
    setNewLocation('');
    setNewFlow('');
    
    Alert.alert("Success", "New event successfully added!");
  };

  // 🖨️ Function para i-Print / i-Share ang Flow of Program
  const handlePrintFlow = async (event) => {
    try {
      const messageToPrint = `=== CHURCH EVENT PROGRAM ===\nEvent: ${event.title}\nCategory: ${event.category}\nDate: ${event.date}\nLocation: ${event.location}\n\n[FLOW OF PROGRAM]\n${event.flowOfProgram}\n\n[SIGNED-UP ATTENDEES]\n${event.signedUp.length > 0 ? event.signedUp.join(', ') : 'No attendees yet.'}\n==========================`;
      
      await Share.share({
        message: messageToPrint,
        title: `${event.title} - Program Flow`,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to print or share program flow.");
    }
  };

  const filteredEvents = selectedMonth === 'All' 
    ? events 
    : events.filter(ev => ev.month.toLowerCase() === selectedMonth.toLowerCase());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header & Add Event Button Row */}
        <View style={styles.topHeaderRow}>
          <Text style={styles.headerTitle}>Church Events 🎉</Text>
          <TouchableOpacity 
            style={styles.addEventTopBtn} 
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={styles.addEventTopBtnText}>+ Add Event</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Buttons bawat buwan */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['All', 'October', 'November', 'December'].map((m) => (
            <TouchableOpacity 
              key={m} 
              style={[styles.filterBtn, selectedMonth === m && styles.activeFilterBtn]}
              onPress={() => setSelectedMonth(m)}
            >
              <Text style={[styles.filterText, selectedMonth === m && styles.activeFilterText]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Listahan ng Events */}
        {filteredEvents.length === 0 ? (
          <Text style={styles.noEventText}>No events found for {selectedMonth}.</Text>
        ) : (
          filteredEvents.map((item) => (
            <View key={item.id} style={styles.eventCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.category}</Text>
                </View>
              </View>

              <Text style={styles.eventDetail}>🕒 {item.date}</Text>
              <Text style={styles.eventDetail}>📍 {item.location}</Text>

              {/* Action Buttons Container */}
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.reminderBtn, item.reminderSet && styles.activeReminderBtn]} 
                  onPress={() => handleToggleReminder(item.id)}
                >
                  <Text style={styles.reminderBtnText}>
                    {item.reminderSet ? "🔔 Reminder" : "🔔 Set"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.detailsBtn} 
                  onPress={() => handleOpenDetails(item)}
                >
                  <Text style={styles.btnTextSmall}>📋 Details</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.printBtn} 
                  onPress={() => handlePrintFlow(item)}
                >
                  <Text style={styles.btnTextSmall}>🖨️ Print</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.editBtn} 
                  onPress={() => handleOpenEdit(item)}
                >
                  <Text style={styles.btnTextSmall}>✏️ Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

      </ScrollView>

      {/* MODAL PARA SA FLOW OF PROGRAM AT ATTENDEES */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEvent && (
              <>
                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                
                <Text style={styles.sectionHeader}>📜 Flow of Program:</Text>
                <View style={styles.boxContent}>
                  <Text style={styles.boxText}>{selectedEvent.flowOfProgram}</Text>
                </View>

                <Text style={styles.sectionHeader}>👥 Signed-Up Attendees ({selectedEvent.signedUp.length}):</Text>
                <View style={styles.boxContent}>
                  {selectedEvent.signedUp.length > 0 ? (
                    selectedEvent.signedUp.map((name, index) => (
                      <Text key={index} style={styles.boxText}>• {name}</Text>
                    ))
                  ) : (
                    <Text style={styles.boxText}>No attendees signed up yet.</Text>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.printModalBtn} 
                  onPress={() => handlePrintFlow(selectedEvent)}
                >
                  <Text style={styles.btnText}>🖨️ Print / Export Flow</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.closeModalBtn} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.btnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL PARA SA ADD EVENT */}
      <Modal visible={addModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Event</Text>

            <Text style={styles.label}>Event Title</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Youth Camp" 
              placeholderTextColor="#64748B"
              value={newTitle} 
              onChangeText={setNewTitle} 
            />

            <Text style={styles.label}>Date & Time</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Sat, Dec 10 • 5:00 PM" 
              placeholderTextColor="#64748B"
              value={newDate} 
              onChangeText={setNewDate} 
            />

            <Text style={styles.label}>Location</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Main Sanctuary" 
              placeholderTextColor="#64748B"
              value={newLocation} 
              onChangeText={setNewLocation} 
            />

            <Text style={styles.label}>Month (October / November / December)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="October" 
              placeholderTextColor="#64748B"
              value={newMonth} 
              onChangeText={setNewMonth} 
            />

            <Text style={styles.label}>Flow of Program</Text>
            <TextInput 
              style={[styles.input, { height: 70 }]} 
              multiline 
              placeholder="Enter program flow..." 
              placeholderTextColor="#64748B"
              value={newFlow} 
              onChangeText={setNewFlow} 
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.modalActionBtn, { backgroundColor: '#334155' }]} 
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalActionBtn, { backgroundColor: '#2563EB' }]} 
                onPress={handleAddEvent}
              >
                <Text style={styles.btnText}>Save Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA SA EDIT EVENT */}
      <Modal visible={editModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Event</Text>

            <Text style={styles.label}>Event Title</Text>
            <TextInput 
              style={styles.input} 
              value={editTitle} 
              onChangeText={setEditTitle} 
            />

            <Text style={styles.label}>Date & Time</Text>
            <TextInput 
              style={styles.input} 
              value={editDate} 
              onChangeText={setEditDate} 
            />

            <Text style={styles.label}>Location</Text>
            <TextInput 
              style={styles.input} 
              value={editLocation} 
              onChangeText={setEditLocation} 
            />

            <Text style={styles.label}>Month</Text>
            <TextInput 
              style={styles.input} 
              value={editMonth} 
              onChangeText={setEditMonth} 
            />

            <Text style={styles.label}>Flow of Program</Text>
            <TextInput 
              style={[styles.input, { height: 70 }]} 
              multiline 
              value={editFlow} 
              onChangeText={setEditFlow} 
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.modalActionBtn, { backgroundColor: '#334155' }]} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalActionBtn, { backgroundColor: '#2563EB' }]} 
                onPress={handleSaveEdit}
              >
                <Text style={styles.btnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContainer: { padding: 20 },
  topHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  addEventTopBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addEventTopBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  filterContainer: { flexDirection: 'row', marginBottom: 20 },
  filterBtn: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#334155' },
  activeFilterBtn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { color: '#94A3B8', fontWeight: '600' },
  activeFilterText: { color: '#FFF' },
  noEventText: { color: '#94A3B8', textAlign: 'center', marginTop: 40 },
  eventCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eventTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', flex: 1 },
  badge: { backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  badgeText: { color: '#38BDF8', fontSize: 12, fontWeight: '600' },
  eventDetail: { color: '#94A3B8', fontSize: 13, marginBottom: 4 },
  actionRow: { flexDirection: 'row', marginTop: 12, justifyContent: 'space-between', gap: 4 },
  reminderBtn: { flex: 1, backgroundColor: '#0284C7', paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  activeReminderBtn: { backgroundColor: '#059669' },
  reminderBtnText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  detailsBtn: { flex: 1, backgroundColor: '#475569', paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  printBtn: { flex: 1, backgroundColor: '#0D9488', paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  editBtn: { flex: 1, backgroundColor: '#D97706', paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  btnTextSmall: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  sectionHeader: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  boxContent: { backgroundColor: '#0F172A', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  boxText: { color: '#CBD5E1', fontSize: 12, lineHeight: 16 },
  printModalBtn: { backgroundColor: '#0D9488', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  closeModalBtn: { backgroundColor: '#334155', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  label: { color: '#FFF', fontSize: 12, fontWeight: '600', marginBottom: 2, marginTop: 6 },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 8, color: '#FFF', fontSize: 12 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 10 },
  modalActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 }
});