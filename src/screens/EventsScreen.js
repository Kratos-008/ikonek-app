import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Share, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.48:5000';

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editFlow, setEditFlow] = useState('');
  const [editCategory, setEditCategory] = useState('Upcoming');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newFlow, setNewFlow] = useState('');
  const [newCategory, setNewCategory] = useState('Upcoming');
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@ikonek_token');
      const response = await fetch(`${API_URL}/api/events`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load events');
      setEvents(Array.isArray(data.events) ? data.events.map(event => ({ ...event, attendees: Array.isArray(event.attendees) ? event.attendees : [], reminderSet: false })) : []);
    } catch (error) {
      console.error('Load events error:', error);
      Alert.alert('Connection Error', 'Unable to load events from the church server.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const formatEventDate = (date) => {
    if (!date) return 'No date';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return String(date);
    return parsed.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };


  const getEventStatus = (date) => {
    if (!date) return 'Past';

    const eventDate = new Date(date);
    if (Number.isNaN(eventDate.getTime())) return 'Past';

    const now = new Date();

    const eventDay = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    if (eventDay.getTime() === today.getTime()) return 'Today';
    if (eventDay.getTime() > today.getTime()) return 'Upcoming';
    return 'Past';
  };

  const getStatusColor = (status) => {
    if (status === 'Upcoming') return '#38BDF8';
    if (status === 'Today') return '#34D399';
    return '#94A3B8';
  };

  const handleDeleteEvent = (event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('@ikonek_token');

              const response = await fetch(`${API_URL}/api/events/${event.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || 'Failed to delete event');
              }

              setEvents((currentEvents) =>
                currentEvents.filter((item) => item.id !== event.id)
              );

              if (selectedEvent?.id === event.id) {
                setSelectedEvent(null);
                setModalVisible(false);
              }

              Alert.alert('Deleted', 'The event was successfully deleted.');
            } catch (error) {
              console.error('Delete event error:', error);
              Alert.alert('Error', error.message || 'Failed to delete event.');
            }
          },
        },
      ]
    );
  };

  const handleToggleReminder = (id) => {
    setEvents(current => current.map(event => {
      if (event.id !== id) return event;
      const newStatus = !event.reminderSet;
      Alert.alert(newStatus ? 'Reminder Set' : 'Reminder Removed', newStatus ? `You will be reminded for "${event.title}".` : `Reminder cancelled for "${event.title}".`);
      return { ...event, reminderSet: newStatus };
    }));
  };

  const toPickerDate = (value) => {
    const parsed = value ? new Date(value) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const formatPickerValue = (date) => date.toISOString();

  const applyNewDate = (selectedDate) => {
    if (!selectedDate) return;
    const value = formatPickerValue(selectedDate);
    setNewDate(value);
    setNewCategory(getEventStatus(value));
  };

  const applyEditDate = (selectedDate) => {
    if (!selectedDate) return;
    const value = formatPickerValue(selectedDate);
    setEditDate(value);
    setEditCategory(getEventStatus(value));
  };

  const openAndroidDateTimePicker = (initialValue, onSelected) => {
    const baseDate = toPickerDate(initialValue);
    setAndroidPickerMode('date');

    DateTimePickerAndroid.open({
      value: baseDate,
      mode: 'date',
      display: 'default',
      onValueChange: (_event, selectedDate) => {
        if (!selectedDate) return;
        setAndroidPickerMode('time');
        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: 'time',
          display: 'default',
          onValueChange: (_timeEvent, selectedTime) => {
            if (selectedTime) {
              const combined = new Date(selectedDate);
              combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
              onSelected(combined);
            }
            setAndroidPickerMode(null);
          },
          onDismiss: () => setAndroidPickerMode(null),
        });
      },
      onDismiss: () => setAndroidPickerMode(null),
    });
  };

  const openAddDateTimePicker = () => {
    if (Platform.OS === 'android') {
      openAndroidDateTimePicker(newDate, applyNewDate);
      return;
    }
    setShowAddDatePicker(true);
  };

  const openEditDateTimePicker = () => {
    if (Platform.OS === 'android') {
      openAndroidDateTimePicker(editDate, applyEditDate);
      return;
    }
    setShowEditDatePicker(true);
  };

  const handleAddDateValueChange = (_event, selectedDate) => {
    if (selectedDate) applyNewDate(selectedDate);
  };

  const handleEditDateValueChange = (_event, selectedDate) => {
    if (selectedDate) applyEditDate(selectedDate);
  };

  const handleOpenDetails = (event) => { setSelectedEvent(event); setModalVisible(true); };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setEditTitle(event.title || '');
    setEditDate(event.date || '');
    setEditLocation(event.location || '');
    setEditFlow(event.flowOfProgram || '');
    setEditCategory(getEventStatus(event.date));
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editDate.trim()) return Alert.alert('Error', 'Title and Date cannot be empty.');
    try {
      const parsedDate = new Date(editDate.trim());
      if (Number.isNaN(parsedDate.getTime())) return Alert.alert('Invalid Date', 'Please use a valid date such as 2026-12-10T17:00:00.');
      const token = await AsyncStorage.getItem('@ikonek_token');
      const response = await fetch(`${API_URL}/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: editTitle.trim(), date: editDate.trim(), location: editLocation.trim(), category: getEventStatus(editDate.trim()), flowOfProgram: editFlow.trim(), attendees: editingEvent.attendees || [] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update event');
      setEvents(current => current.map(event => event.id === editingEvent.id ? { ...data.event, reminderSet: event.reminderSet || false } : event));
      setEditModalVisible(false); setEditingEvent(null);
      Alert.alert('Success', 'Event successfully updated!');
    } catch (error) { console.error('Update event error:', error); Alert.alert('Error', error.message || 'Failed to update event.'); }
  };

  const handleAddEvent = async () => {
    if (!newTitle.trim() || !newDate.trim()) return Alert.alert('Error', 'Please enter Event Title and Date.');
    try {
      const parsedDate = new Date(newDate.trim());
      if (Number.isNaN(parsedDate.getTime())) return Alert.alert('Invalid Date', 'Please use a valid date such as 2026-12-10T17:00:00.');
      const token = await AsyncStorage.getItem('@ikonek_token');
      const response = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: newTitle.trim(), description: null, date: newDate.trim(), location: newLocation.trim() || 'Main Church', category: getEventStatus(newDate.trim()), flowOfProgram: newFlow.trim() || 'No flow of program provided yet.', attendees: [] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create event');
      setEvents(current => [{ ...data.event, reminderSet: false }, ...current]);
      setAddModalVisible(false); setNewTitle(''); setNewDate(''); setNewLocation(''); setNewFlow(''); setNewCategory('Upcoming');
      Alert.alert('Success', 'New event successfully added!');
    } catch (error) { console.error('Create event error:', error); Alert.alert('Error', error.message || 'Failed to create event.'); }
  };

  const handlePrintFlow = async (event) => {
    try {
      const attendees = Array.isArray(event.attendees) ? event.attendees : [];
      const message = `=== CHURCH EVENT PROGRAM ===\nEvent: ${event.title}\nCategory: ${event.category || 'Upcoming'}\nDate: ${formatEventDate(event.date)}\nLocation: ${event.location || 'Main Church'}\n\n[FLOW OF PROGRAM]\n${event.flowOfProgram || 'No flow of program provided yet.'}\n\n[SIGNED-UP ATTENDEES]\n${attendees.length ? attendees.join(', ') : 'No attendees yet.'}\n==========================`;
      await Share.share({ message, title: `${event.title} - Program Flow` });
    } catch (error) { Alert.alert('Error', 'Failed to print or share program flow.'); }
  };

  const filteredEvents = events.filter(event => {
    return selectedStatus === 'All' || getEventStatus(event.date) === selectedStatus;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeaderRow}>
          <Text style={styles.headerTitle}>Church Events 🎉</Text>
          <TouchableOpacity style={styles.addEventTopBtn} onPress={() => setAddModalVisible(true)}><Text style={styles.addEventTopBtnText}>+ Add Event</Text></TouchableOpacity>
        </View>
        <Text style={styles.filterLabel}>Event Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['All', 'Upcoming', 'Today', 'Past'].map(status => (
            <TouchableOpacity key={status} style={[styles.filterBtn, selectedStatus === status && styles.activeFilterBtn]} onPress={() => setSelectedStatus(status)}>
              <Text style={[styles.filterText, selectedStatus === status && styles.activeFilterText]}>{status}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {loading ? <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#38BDF8" /><Text style={styles.loadingText}>Loading events...</Text></View> : filteredEvents.length === 0 ? <Text style={styles.noEventText}>No {selectedStatus === 'All' ? '' : selectedStatus.toLowerCase() + ' '}events found.</Text> : filteredEvents.map(item => (
          <View key={item.id} style={styles.eventCard}>
            <View style={styles.cardHeader}><Text style={styles.eventTitle}>{item.title}</Text><View style={styles.badge}><Text style={[styles.badgeText, { color: getStatusColor(getEventStatus(item.date)) }]}>{getEventStatus(item.date)}</Text></View></View>
            <Text style={styles.eventDetail}>🕒 {formatEventDate(item.date)}</Text>
            <Text style={styles.eventDetail}>📍 {item.location || 'Main Church'}</Text>
            <View style={styles.actionRow}>
              {getEventStatus(item.date) !== 'Past' && (
                <TouchableOpacity style={[styles.reminderBtn, item.reminderSet && styles.activeReminderBtn]} onPress={() => handleToggleReminder(item.id)}>
                  <Text style={styles.reminderBtnText}>{item.reminderSet ? '🔔 Reminder' : '🔔 Set'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.detailsBtn} onPress={() => handleOpenDetails(item)}><Text style={styles.btnTextSmall}>📋 Details</Text></TouchableOpacity>
              <TouchableOpacity style={styles.printBtn} onPress={() => handlePrintFlow(item)}><Text style={styles.btnTextSmall}>🖨️ Print</Text></TouchableOpacity>
              <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEdit(item)}><Text style={styles.btnTextSmall}>✏️ Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteEvent(item)}><Text style={styles.btnTextSmall}>🗑️ Delete</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>{selectedEvent && <>
          <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
          <Text style={styles.sectionHeader}>📜 Flow of Program:</Text>
          <View style={styles.boxContent}><Text style={styles.boxText}>{selectedEvent.flowOfProgram || 'No flow of program provided yet.'}</Text></View>
          <Text style={styles.sectionHeader}>👥 Signed-Up Attendees ({Array.isArray(selectedEvent.attendees) ? selectedEvent.attendees.length : 0}):</Text>
          <View style={styles.boxContent}>{Array.isArray(selectedEvent.attendees) && selectedEvent.attendees.length ? selectedEvent.attendees.map((name, index) => <Text key={index} style={styles.boxText}>• {name}</Text>) : <Text style={styles.boxText}>No attendees signed up yet.</Text>}</View>
          <TouchableOpacity style={styles.printModalBtn} onPress={() => handlePrintFlow(selectedEvent)}><Text style={styles.btnText}>🖨️ Print / Export Flow</Text></TouchableOpacity>
          <TouchableOpacity style={styles.editModalBtn} onPress={() => { setModalVisible(false); handleOpenEdit(selectedEvent); }}><Text style={styles.btnText}>✏️ Edit Event</Text></TouchableOpacity>
          <TouchableOpacity style={styles.deleteModalBtn} onPress={() => handleDeleteEvent(selectedEvent)}><Text style={styles.btnText}>🗑️ Delete Event</Text></TouchableOpacity>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}><Text style={styles.btnText}>Close</Text></TouchableOpacity>
        </>}</View></View>
      </Modal>

      <Modal visible={addModalVisible} animationType="fade" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add New Event</Text>
          <Text style={styles.label}>Event Title</Text><TextInput style={styles.input} placeholder="e.g. Youth Camp" placeholderTextColor="#64748B" value={newTitle} onChangeText={setNewTitle} />
          <Text style={styles.label}>Date & Time</Text><TouchableOpacity style={styles.datePickerButton} onPress={openAddDateTimePicker}><Text style={styles.datePickerText}>{newDate ? formatEventDate(newDate) : 'Select date and time'}</Text></TouchableOpacity>{showAddDatePicker && <DateTimePicker value={toPickerDate(newDate)} mode="datetime" display="default" onValueChange={handleAddDateValueChange} onDismiss={() => setShowAddDatePicker(false)} />}<Text style={styles.dateHint}>Tap to select the date and time.</Text>
          <Text style={styles.label}>Location</Text><TextInput style={styles.input} placeholder="e.g. Main Sanctuary" placeholderTextColor="#64748B" value={newLocation} onChangeText={setNewLocation} />
          <Text style={styles.label}>Category</Text><View style={styles.autoCategoryBox}><Text style={styles.autoCategoryText}>{newDate ? getEventStatus(newDate) : 'Select a date first'}</Text><Text style={styles.autoCategoryHint}>Automatically determined from the event date.</Text></View>
          <Text style={styles.label}>Flow of Program</Text><TextInput style={[styles.input, styles.multilineInput]} multiline placeholder="Enter program flow..." placeholderTextColor="#64748B" value={newFlow} onChangeText={setNewFlow} />
          <View style={styles.modalBtnRow}><TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#334155' }]} onPress={() => setAddModalVisible(false)}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#2563EB' }]} onPress={handleAddEvent}><Text style={styles.btnText}>Save Event</Text></TouchableOpacity></View>
        </View></View>
      </Modal>

      <Modal visible={editModalVisible} animationType="fade" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Event</Text>
          <Text style={styles.label}>Event Title</Text><TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />
          <Text style={styles.label}>Date & Time</Text><TouchableOpacity style={styles.datePickerButton} onPress={openEditDateTimePicker}><Text style={styles.datePickerText}>{editDate ? formatEventDate(editDate) : 'Select date and time'}</Text></TouchableOpacity>{showEditDatePicker && <DateTimePicker value={toPickerDate(editDate)} mode="datetime" display="default" onValueChange={handleEditDateValueChange} onDismiss={() => setShowEditDatePicker(false)} />}<Text style={styles.dateHint}>Tap to select the date and time.</Text>
          <Text style={styles.label}>Location</Text><TextInput style={styles.input} value={editLocation} onChangeText={setEditLocation} />
          <Text style={styles.label}>Category</Text><View style={styles.autoCategoryBox}><Text style={styles.autoCategoryText}>{editDate ? getEventStatus(editDate) : 'Unknown'}</Text><Text style={styles.autoCategoryHint}>Automatically determined from the event date.</Text></View>
          <Text style={styles.label}>Flow of Program</Text><TextInput style={[styles.input, styles.multilineInput]} multiline value={editFlow} onChangeText={setEditFlow} />
          <View style={styles.modalBtnRow}><TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#334155' }]} onPress={() => setEditModalVisible(false)}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#2563EB' }]} onPress={handleSaveEdit}><Text style={styles.btnText}>Save Changes</Text></TouchableOpacity></View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#0F172A'}, scrollContainer:{padding:20,paddingBottom:40}, topHeaderRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16}, headerTitle:{fontSize:24,fontWeight:'bold',color:'#FFF',flex:1}, addEventTopBtn:{backgroundColor:'#2563EB',paddingHorizontal:12,paddingVertical:8,borderRadius:8}, addEventTopBtnText:{color:'#FFF',fontWeight:'bold',fontSize:13}, filterContainer:{flexDirection:'row',marginBottom:10}, filterLabel:{color:'#94A3B8',fontSize:11,fontWeight:'600',marginBottom:6}, filterBtn:{backgroundColor:'#1E293B',paddingHorizontal:16,paddingVertical:8,borderRadius:20,marginRight:8,borderWidth:1,borderColor:'#334155'}, activeFilterBtn:{backgroundColor:'#2563EB',borderColor:'#2563EB'}, filterText:{color:'#94A3B8',fontWeight:'600'}, activeFilterText:{color:'#FFF'}, loadingContainer:{alignItems:'center',justifyContent:'center',marginTop:50}, loadingText:{color:'#94A3B8',marginTop:10,fontSize:13}, noEventText:{color:'#94A3B8',textAlign:'center',marginTop:40}, eventCard:{backgroundColor:'#1E293B',borderRadius:12,padding:16,marginBottom:16,borderWidth:1,borderColor:'#334155'}, cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}, eventTitle:{fontSize:18,fontWeight:'bold',color:'#FFF',flex:1,marginRight:8}, badge:{backgroundColor:'#0F172A',paddingHorizontal:10,paddingVertical:4,borderRadius:6,borderWidth:1,borderColor:'#334155'}, badgeText:{color:'#38BDF8',fontSize:12,fontWeight:'600'}, eventDetail:{color:'#94A3B8',fontSize:13,marginBottom:4}, actionRow:{flexDirection:'row',marginTop:12,justifyContent:'flex-start',gap:5,flexWrap:'wrap'}, reminderBtn:{width:72,backgroundColor:'#0284C7',paddingVertical:8,borderRadius:6,alignItems:'center',justifyContent:'center'}, activeReminderBtn:{backgroundColor:'#059669'}, reminderBtnText:{color:'#FFF',fontSize:10,fontWeight:'bold'}, detailsBtn:{width:72,backgroundColor:'#475569',paddingVertical:8,borderRadius:6,alignItems:'center',justifyContent:'center'}, printBtn:{width:72,backgroundColor:'#0D9488',paddingVertical:8,borderRadius:6,alignItems:'center',justifyContent:'center'}, deleteBtn:{width:72,backgroundColor:'#DC2626',paddingVertical:8,borderRadius:6,alignItems:'center',justifyContent:'center'}, editBtn:{width:72,backgroundColor:'#D97706',paddingVertical:8,borderRadius:6,alignItems:'center',justifyContent:'center'}, btnTextSmall:{color:'#FFF',fontSize:10,fontWeight:'bold'}, modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'center',padding:20}, modalContent:{backgroundColor:'#1E293B',borderRadius:12,padding:20,borderWidth:1,borderColor:'#334155',maxHeight:'90%'}, modalTitle:{fontSize:20,fontWeight:'bold',color:'#FFF',marginBottom:12}, sectionHeader:{color:'#38BDF8',fontSize:13,fontWeight:'bold',marginTop:10,marginBottom:4}, boxContent:{backgroundColor:'#0F172A',padding:10,borderRadius:8,borderWidth:1,borderColor:'#334155'}, boxText:{color:'#CBD5E1',fontSize:12,lineHeight:16}, editModalBtn:{backgroundColor:'#D97706',paddingVertical:10,borderRadius:8,alignItems:'center',marginTop:8}, printModalBtn:{backgroundColor:'#0D9488',paddingVertical:12,borderRadius:8,alignItems:'center',marginTop:16}, deleteModalBtn:{backgroundColor:'#DC2626',paddingVertical:10,borderRadius:8,alignItems:'center',marginTop:8}, closeModalBtn:{backgroundColor:'#334155',paddingVertical:10,borderRadius:8,alignItems:'center',marginTop:8}, label:{color:'#FFF',fontSize:12,fontWeight:'600',marginBottom:2,marginTop:6}, input:{backgroundColor:'#0F172A',borderWidth:1,borderColor:'#334155',borderRadius:8,padding:8,color:'#FFF',fontSize:12}, dateHint:{color:'#64748B',fontSize:10,marginTop:4}, datePickerButton:{backgroundColor:'#0F172A',borderWidth:1,borderColor:'#334155',borderRadius:8,padding:10}, datePickerText:{color:'#FFF',fontSize:12}, autoCategoryBox:{backgroundColor:'#0F172A',borderWidth:1,borderColor:'#334155',borderRadius:8,padding:10}, autoCategoryText:{color:'#38BDF8',fontSize:13,fontWeight:'bold'}, autoCategoryHint:{color:'#64748B',fontSize:10,marginTop:3}, multilineInput:{height:70,textAlignVertical:'top'}, modalBtnRow:{flexDirection:'row',justifyContent:'space-between',marginTop:16,gap:10}, modalActionBtn:{flex:1,paddingVertical:10,borderRadius:8,alignItems:'center'}, btnText:{color:'#FFF',fontWeight:'bold',fontSize:13}
});
