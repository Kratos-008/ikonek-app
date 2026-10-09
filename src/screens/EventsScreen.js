import { useState, useEffect, useCallback } from 'react';

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://ikonek-app.onrender.com';

export default function EventsScreen({ navigation, onBack, onNavigateToMain }) {
  const { isDarkMode, colors } = useTheme();

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }

    if (typeof onNavigateToMain === 'function') {
      onNavigateToMain();
      return;
    }

    if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  };

  // ThemeContext provides the system-aware color palette but not a primary color.
  // Keep the primary action color local so this screen works with the existing ThemeContext.
  const primary = isDarkMode ? '#38BDF8' : '#2563EB';

  const styles = createStyles(colors, isDarkMode, primary);

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
  const defaultWelcomeMessage = 'Welcome, everyone! Join us to build meaningful friendships and grow closer to God.';
  const [editMessage, setEditMessage] = useState(defaultWelcomeMessage);
  const [editCategory, setEditCategory] =
    useState('Upcoming');

  const [addModalVisible, setAddModalVisible] =
    useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newFlow, setNewFlow] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newCategory, setNewCategory] =
    useState('Upcoming');

  const [showAddDatePicker, setShowAddDatePicker] =
    useState(false);

  const [showEditDatePicker, setShowEditDatePicker] =
    useState(false);

  const [androidPickerMode, setAndroidPickerMode] =
    useState(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem(
        '@ikonek_token'
      );

      const response = await fetch(
        `${API_URL}/api/events`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to load events'
        );
      }

      setEvents(
        Array.isArray(data.events)
          ? data.events.map((event) => ({
              ...event,
              attendees: Array.isArray(
                event.attendees
              )
                ? event.attendees
                : [],
              reminderSet: false,
            }))
          : []
      );
    } catch (error) {
      console.error('Load events error:', error);

      Alert.alert(
        'Connection Error',
        'Unable to load events from the church server.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedUser =
          await AsyncStorage.getItem(
            '@ikonek_user'
          );

        const user = savedUser
          ? JSON.parse(savedUser)
          : null;

        setIsAdmin(
          String(user?.role || '').toUpperCase() ===
            'ADMIN'
        );
      } catch (error) {
        console.error(
          'Failed to load user role:',
          error
        );

        setIsAdmin(false);
      }
    })();

    loadEvents();
  }, [loadEvents]);

  const formatEventDate = (date) => {
    if (!date) return 'No date';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return String(date);
    }

    return parsed.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEventStatus = (date) => {
    if (!date) return 'Past';

    const eventDate = new Date(date);

    if (Number.isNaN(eventDate.getTime())) {
      return 'Past';
    }

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

    if (
      eventDay.getTime() === today.getTime()
    ) {
      return 'Today';
    }

    if (eventDay.getTime() > today.getTime()) {
      return 'Upcoming';
    }

    return 'Past';
  };

  const getStatusColor = (status) => {
    if (status === 'Upcoming') return '#38BDF8';
    if (status === 'Today') return '#34D399';

    return '#94A3B8';
  };

  const handleDeleteEvent = (event) => {
    if (!isAdmin) return;

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              const token =
                await AsyncStorage.getItem(
                  '@ikonek_token'
                );

              const response = await fetch(
                `${API_URL}/api/events/${event.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type':
                      'application/json',
                    ...(token
                      ? {
                          Authorization: `Bearer ${token}`,
                        }
                      : {}),
                  },
                }
              );

              const data =
                await response.json();

              if (!response.ok) {
                throw new Error(
                  data.message ||
                    'Failed to delete event'
                );
              }

              setEvents((currentEvents) =>
                currentEvents.filter(
                  (item) =>
                    item.id !== event.id
                )
              );

              if (
                selectedEvent?.id === event.id
              ) {
                setSelectedEvent(null);
                setModalVisible(false);
              }

              Alert.alert(
                'Deleted',
                'The event was successfully deleted.'
              );
            } catch (error) {
              console.error(
                'Delete event error:',
                error
              );

              Alert.alert(
                'Error',
                error.message ||
                  'Failed to delete event.'
              );
            }
          },
        },
      ]
    );
  };

  const handleToggleReminder = (id) => {
    setEvents((current) =>
      current.map((event) => {
        if (event.id !== id) return event;

        const newStatus =
          !event.reminderSet;

        Alert.alert(
          newStatus
            ? 'Reminder Set'
            : 'Reminder Removed',
          newStatus
            ? `You will be reminded for "${event.title}".`
            : `Reminder cancelled for "${event.title}".`
        );

        return {
          ...event,
          reminderSet: newStatus,
        };
      })
    );
  };

  const toPickerDate = (value) => {
    const parsed = value
      ? new Date(value)
      : new Date();

    return Number.isNaN(parsed.getTime())
      ? new Date()
      : parsed;
  };

  const formatPickerValue = (date) =>
    date.toISOString();

  const applyNewDate = (selectedDate) => {
    if (!selectedDate) return;

    const value =
      formatPickerValue(selectedDate);

    setNewDate(value);
    setNewCategory(getEventStatus(value));
  };

  const applyEditDate = (selectedDate) => {
    if (!selectedDate) return;

    const value =
      formatPickerValue(selectedDate);

    setEditDate(value);
    setEditCategory(getEventStatus(value));
  };

  const openAndroidDateTimePicker = (
    initialValue,
    onSelected
  ) => {
    const baseDate =
      toPickerDate(initialValue);

    setAndroidPickerMode('date');

    DateTimePickerAndroid.open({
      value: baseDate,
      mode: 'date',
      display: 'default',

      onValueChange: (
        _event,
        selectedDate
      ) => {
        if (!selectedDate) return;

        setAndroidPickerMode('time');

        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: 'time',
          display: 'default',

          onValueChange: (
            _timeEvent,
            selectedTime
          ) => {
            if (selectedTime) {
              const combined =
                new Date(selectedDate);

              combined.setHours(
                selectedTime.getHours(),
                selectedTime.getMinutes(),
                0,
                0
              );

              onSelected(combined);
            }

            setAndroidPickerMode(null);
          },

          onDismiss: () =>
            setAndroidPickerMode(null),
        });
      },

      onDismiss: () =>
        setAndroidPickerMode(null),
    });
  };

  const openAddDateTimePicker = () => {
    if (Platform.OS === 'android') {
      openAndroidDateTimePicker(
        newDate,
        applyNewDate
      );

      return;
    }

    setShowAddDatePicker(true);
  };

  const openEditDateTimePicker = () => {
    if (Platform.OS === 'android') {
      openAndroidDateTimePicker(
        editDate,
        applyEditDate
      );

      return;
    }

    setShowEditDatePicker(true);
  };

  const handleAddDateValueChange = (
    _event,
    selectedDate
  ) => {
    if (selectedDate) {
      applyNewDate(selectedDate);
    }
  };

  const handleEditDateValueChange = (
    _event,
    selectedDate
  ) => {
    if (selectedDate) {
      applyEditDate(selectedDate);
    }
  };

  const handleOpenDetails = (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleOpenEdit = (event) => {
    if (!isAdmin) return;

    setEditingEvent(event);
    setEditTitle(event.title || '');
    setEditDate(event.date || '');
    setEditLocation(
      event.location || ''
    );
    setEditFlow(
      event.flowOfProgram || ''
    );
    setEditMessage(event.message || defaultWelcomeMessage);
    setEditCategory(
      getEventStatus(event.date)
    );
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!isAdmin) {
      Alert.alert('Permission Required', 'Only an admin can edit events. Please sign in with an admin account.');
      return;
    }

    if (!editingEvent?.id) {
      Alert.alert('Unable to Save', 'No event is selected for editing. Please close the form and try again.');
      return;
    }

    if (
      !editTitle.trim() ||
      !editDate.trim()
    ) {
      return Alert.alert(
        'Error',
        'Title and Date cannot be empty.'
      );
    }

    try {
      const parsedDate =
        new Date(editDate.trim());

      if (Number.isNaN(parsedDate.getTime())) {
        return Alert.alert(
          'Invalid Date',
          'Please use a valid date such as 2026-12-10T17:00:00.'
        );
      }

      const token =
        await AsyncStorage.getItem(
          '@ikonek_token'
        );

      const response = await fetch(
        `${API_URL}/api/events/${editingEvent.id}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            title: editTitle.trim(),
            date: editDate.trim(),
            location: editLocation.trim(),
            category:
              getEventStatus(
                editDate.trim()
              ),
            flowOfProgram:
              editFlow.trim(),
            message: editMessage.trim(),

            attendees:
              editingEvent.attendees || [],
          }),
        }
      );

      const responseText = await response.text();
      let data = {};
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to update event (HTTP ${response.status}).`
        );
      }

      // Merge the submitted values with the server response. Some API versions
      // return only a success message instead of the updated event object.
      const savedEvent = {
        ...editingEvent,
        title: editTitle.trim(),
        date: editDate.trim(),
        location: editLocation.trim(),
        category: getEventStatus(editDate.trim()),
        flowOfProgram: editFlow.trim(),
        message: editMessage.trim(),
        ...(data.event && typeof data.event === 'object' ? data.event : {}),
      };

      setEvents((current) =>
        current.map((event) =>
          String(event.id) === String(editingEvent.id)
            ? { ...event, ...savedEvent, reminderSet: event.reminderSet || false }
            : event
        )
      );

      setEditModalVisible(false);
      setEditingEvent(null);

      Alert.alert(
        'Event Updated',
        'The event form was submitted successfully. If the welcome message disappears after you reload the Events screen, the backend must also be updated to save the message in the database.'
      );
    } catch (error) {
      console.error(
        'Update event error:',
        error
      );

      Alert.alert(
        'Error',
        error.message ||
          'Failed to update event.'
      );
    }
  };

  const handleAddEvent = async () => {
    if (!isAdmin) return;

    if (
      !newTitle.trim() ||
      !newDate.trim()
    ) {
      return Alert.alert(
        'Error',
        'Please enter Event Title and Date.'
      );
    }

    try {
      const parsedDate =
        new Date(newDate.trim());

      if (Number.isNaN(parsedDate.getTime())) {
        return Alert.alert(
          'Invalid Date',
          'Please use a valid date such as 2026-12-10T17:00:00.'
        );
      }

      const token =
        await AsyncStorage.getItem(
          '@ikonek_token'
        );

      const response = await fetch(
        `${API_URL}/api/events`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            title: newTitle.trim(),
            description: null,
            date: newDate.trim(),
            location:
              newLocation.trim() ||
              'Main Church',
            category:
              getEventStatus(
                newDate.trim()
              ),
            flowOfProgram:
              newFlow.trim() ||
              'No flow of program provided yet.',
            message: newMessage.trim(),
            attendees: [],
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to create event'
        );
      }

      setEvents((current) => [
        {
          ...data.event,
          reminderSet: false,
        },
        ...current,
      ]);

      setAddModalVisible(false);
      setNewTitle('');
      setNewDate('');
      setNewLocation('');
      setNewFlow('');
      setNewMessage('');
      setNewCategory('Upcoming');

      Alert.alert(
        'Success',
        'New event successfully added!'
      );
    } catch (error) {
      console.error(
        'Create event error:',
        error
      );

      Alert.alert(
        'Error',
        error.message ||
          'Failed to create event.'
      );
    }
  };

  const handlePrintFlow = async (event) => {
    try {
      const attendees =
        Array.isArray(event.attendees)
          ? event.attendees
          : [];

      const message =
        `=== CHURCH EVENT PROGRAM ===\n` +
        `Event: ${event.title}\n` +
        `Category: ${
          event.category || 'Upcoming'
        }\n` +
        `Date: ${formatEventDate(
          event.date
        )}\n` +
        `Location: ${
          event.location || 'Main Church'
        }\n\n` +
        `[FLOW OF PROGRAM]\n` +
        `${
          event.flowOfProgram ||
          'No flow of program provided yet.'
        }\n\n` +
        `[SIGNED-UP ATTENDEES]\n` +
        `${
          attendees.length
            ? attendees.join(', ')
            : 'No attendees yet.'
        }\n` +
        `==========================`;

      await Share.share({
        message,
        title: `${event.title} - Program Flow`,
      });
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to print or share program flow.'
      );
    }
  };

  const filteredEvents = events.filter(
    (event) => {
      return (
        selectedStatus === 'All' ||
        getEventStatus(event.date) ===
          selectedStatus
      );
    }
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContainer
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Church Events
          </Text>

          {isAdmin && (
            <TouchableOpacity
              style={styles.addEventTopBtn}
              onPress={() =>
                setAddModalVisible(true)
              }
            >
              <Text
                style={
                  styles.addEventTopBtnText
                }
              >
                + Add Event
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.filterLabel}>
          Event Status
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {[
            'All',
            'Upcoming',
            'Today',
            'Past',
          ].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterBtn,
                selectedStatus === status &&
                  styles.activeFilterBtn,
              ]}
              onPress={() =>
                setSelectedStatus(status)
              }
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === status &&
                    styles.activeFilterText,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View
            style={styles.loadingContainer}
          >
            <ActivityIndicator
              size="large"
              color={primary}
            />

            <Text
              style={styles.loadingText}
            >
              Loading events...
            </Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <Text style={styles.noEventText}>
            No{' '}
            {selectedStatus === 'All'
              ? ''
              : selectedStatus.toLowerCase() +
                ' '}
            events found.
          </Text>
        ) : (
          filteredEvents.map((item) => (
            <View
              key={item.id}
              style={styles.eventCard}
            >
              <View
                style={styles.cardHeader}
              >
                <Text
                  style={styles.eventTitle}
                >
                  {item.title}
                </Text>

                <View style={styles.badge}>
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          getStatusColor(
                            getEventStatus(
                              item.date
                            )
                          ),
                      },
                    ]}
                  >
                    {getEventStatus(
                      item.date
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.welcomePanel}>
                <View style={styles.welcomeHeadingRow}>
                  <Ionicons
                    name="heart"
                    size={18}
                    color={isDarkMode ? '#BFDBFE' : '#1D4ED8'}
                    style={styles.welcomeIcon}
                  />
                  <Text style={styles.welcomeHeading}>A Message for You</Text>
                </View>
                <Text style={styles.welcomeText}>
                  {item.message || defaultWelcomeMessage}
                </Text>
              </View>

              <View style={styles.eventDetailRow}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#38BDF8"
                  style={styles.eventDetailIcon}
                />
                <Text style={styles.eventDetail}>
                  {formatEventDate(item.date)}
                </Text>
              </View>

              <View style={styles.eventDetailRow}>
                <Ionicons
                  name="location-outline"
                  size={22}
                  color="#38BDF8"
                  style={styles.eventDetailIcon}
                />
                <Text style={styles.eventDetail}>
                  {item.location || 'Main Church'}
                </Text>
              </View>

              <View style={styles.flowPreviewPanel}>
                <View style={styles.flowPreviewHeadingRow}>
                  <Ionicons
                    name="list-outline"
                    size={17}
                    color={isDarkMode ? '#E2E8F0' : '#1E293B'}
                    style={styles.flowPreviewIcon}
                  />
                  <Text style={styles.flowPreviewHeading}>Flow of Program</Text>
                </View>
                <Text style={styles.flowPreviewText}>
                  {item.flowOfProgram || 'No flow of program provided yet.'}
                </Text>
              </View>

              <View
                style={styles.actionRow}
              >
                {getEventStatus(
                  item.date
                ) !== 'Past' && (
                  <TouchableOpacity
                    style={[
                      styles.reminderBtn,
                      item.reminderSet &&
                        styles.activeReminderBtn,
                    ]}
                    onPress={() =>
                      handleToggleReminder(
                        item.id
                      )
                    }
                  >
                    <Text
                      style={
                        styles.reminderBtnText
                      }
                    >
                      {item.reminderSet
                        ? '🔔 Reminder'
                        : '🔔 Set'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() =>
                    handleOpenDetails(item)
                  }
                >
                  <Text
                    style={styles.btnTextSmall}
                  >
                    📋 Details
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={() =>
                    handlePrintFlow(item)
                  }
                >
                  <Text
                    style={styles.btnTextSmall}
                  >
                    🖨️ Print
                  </Text>
                </TouchableOpacity>

                {isAdmin && (
                  <>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() =>
                        handleOpenEdit(item)
                      }
                    >
                      <Text
                        style={
                          styles.btnTextSmall
                        }
                      >
                        ✏️ Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() =>
                        handleDeleteEvent(item)
                      }
                    >
                      <Text
                        style={
                          styles.btnTextSmall
                        }
                      >
                        🗑️ Delete
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* EVENT DETAILS MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContent}
          >
            {selectedEvent && (
              <>
                <Text
                  style={styles.modalTitle}
                >
                  {selectedEvent.title}
                </Text>

                <Text
                  style={styles.sectionHeader}
                >
                  📜 Flow of Program:
                </Text>

                <View
                  style={styles.boxContent}
                >
                  <Text
                    style={styles.boxText}
                  >
                    {selectedEvent.flowOfProgram ||
                      'No flow of program provided yet.'}
                  </Text>
                </View>

                <Text
                  style={styles.sectionHeader}
                >
                  👥 Signed-Up Attendees (
                  {Array.isArray(
                    selectedEvent.attendees
                  )
                    ? selectedEvent.attendees
                        .length
                    : 0}
                  ):
                </Text>

                <View
                  style={styles.boxContent}
                >
                  {Array.isArray(
                    selectedEvent.attendees
                  ) &&
                  selectedEvent.attendees
                    .length ? (
                    selectedEvent.attendees.map(
                      (name, index) => (
                        <Text
                          key={index}
                          style={
                            styles.boxText
                          }
                        >
                          • {name}
                        </Text>
                      )
                    )
                  ) : (
                    <Text
                      style={styles.boxText}
                    >
                      No attendees signed up
                      yet.
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={
                    styles.printModalBtn
                  }
                  onPress={() =>
                    handlePrintFlow(
                      selectedEvent
                    )
                  }
                >
                  <Text style={styles.btnText}>
                    🖨️ Print / Export Flow
                  </Text>
                </TouchableOpacity>

                {isAdmin && (
                  <>
                    <TouchableOpacity
                      style={
                        styles.editModalBtn
                      }
                      onPress={() => {
                        setModalVisible(false);
                        handleOpenEdit(
                          selectedEvent
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.btnText
                        }
                      >
                        ✏️ Edit Event
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.deleteModalBtn
                      }
                      onPress={() =>
                        handleDeleteEvent(
                          selectedEvent
                        )
                      }
                    >
                      <Text
                        style={
                          styles.btnText
                        }
                      >
                        🗑️ Delete Event
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={
                    styles.closeModalBtn
                  }
                  onPress={() =>
                    setModalVisible(false)
                  }
                >
                  <Text style={styles.btnText}>
                    Close
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ADD EVENT MODAL */}
      <Modal
        visible={addModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() =>
          setAddModalVisible(false)
        }
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContent}
          >
          <ScrollView
            style={styles.editModalScrollView}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled
            contentContainerStyle={styles.modalScrollContent}
          >
            <Text
              style={styles.modalTitle}
            >
              Add New Event
            </Text>

            <Text style={styles.label}>
              Event Title
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Youth Camp"
              placeholderTextColor={
                colors.muted
              }
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.label}>
              Date & Time
            </Text>

            <TouchableOpacity
              style={
                styles.datePickerButton
              }
              onPress={
                openAddDateTimePicker
              }
            >
              <Text
                style={
                  styles.datePickerText
                }
              >
                {newDate
                  ? formatEventDate(
                      newDate
                    )
                  : 'Select date and time'}
              </Text>
            </TouchableOpacity>

            {showAddDatePicker && (
              <DateTimePicker
                value={toPickerDate(
                  newDate
                )}
                mode="datetime"
                display="default"
                onValueChange={
                  handleAddDateValueChange
                }
                onDismiss={() =>
                  setShowAddDatePicker(
                    false
                  )
                }
              />
            )}

            <Text style={styles.dateHint}>
              Tap to select the date and
              time.
            </Text>

            <Text style={styles.label}>
              Location
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Main Sanctuary"
              placeholderTextColor={
                colors.muted
              }
              value={newLocation}
              onChangeText={
                setNewLocation
              }
            />

            <Text style={styles.label}>
              Category
            </Text>

            <View
              style={
                styles.autoCategoryBox
              }
            >
              <Text
                style={
                  styles.autoCategoryText
                }
              >
                {newDate
                  ? getEventStatus(
                      newDate
                    )
                  : 'Select a date first'}
              </Text>

              <Text
                style={
                  styles.autoCategoryHint
                }
              >
                Automatically determined
                from the event date.
              </Text>
            </View>

            <Text style={styles.label}>
              Message for You
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                styles.messageInput,
              ]}
              multiline
              textAlignVertical="top"
              placeholder="Enter a Message"
              placeholderTextColor={colors.muted}
              value={newMessage}
              onChangeText={setNewMessage}
            />

            <Text style={styles.dateHint}>
              This message appears on the event card.
            </Text>

            <Text style={styles.label}>
              Flow of Program
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
              ]}
              multiline
              placeholder="Enter program flow..."
              placeholderTextColor={
                colors.muted
              }
              value={newFlow}
              onChangeText={setNewFlow}
            />

            <View
              style={styles.modalBtnRow}
            >
              <TouchableOpacity
                style={[
                  styles.modalActionBtn,
                  {
                    backgroundColor:
                      colors.border,
                  },
                ]}
                onPress={() =>
                  setAddModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={styles.btnText}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalActionBtn,
                  {
                    backgroundColor:
                      primary,
                  },
                ]}
                onPress={
                  handleAddEvent
                }
              >
                <Text
                  style={styles.btnText}
                >
                  Save Event
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EDIT EVENT MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() =>
          setEditModalVisible(false)
        }
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContent}
          >
          <ScrollView
            style={styles.editModalScrollView}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled
            contentContainerStyle={styles.modalScrollContent}
          >
            <Text
              style={styles.modalTitle}
            >
              Edit Event
            </Text>

            <Text style={styles.label}>
              Event Title
            </Text>

            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholderTextColor={
                colors.muted
              }
            />

            <Text style={styles.label}>
              Date & Time
            </Text>

            <TouchableOpacity
              style={
                styles.datePickerButton
              }
              onPress={
                openEditDateTimePicker
              }
            >
              <Text
                style={
                  styles.datePickerText
                }
              >
                {editDate
                  ? formatEventDate(
                      editDate
                    )
                  : 'Select date and time'}
              </Text>
            </TouchableOpacity>

            {showEditDatePicker && (
              <DateTimePicker
                value={toPickerDate(
                  editDate
                )}
                mode="datetime"
                display="default"
                onValueChange={
                  handleEditDateValueChange
                }
                onDismiss={() =>
                  setShowEditDatePicker(
                    false
                  )
                }
              />
            )}

            <Text style={styles.dateHint}>
              Tap to select the date and
              time.
            </Text>

            <Text style={styles.label}>
              Location
            </Text>

            <TextInput
              style={styles.input}
              value={editLocation}
              onChangeText={
                setEditLocation
              }
              placeholderTextColor={
                colors.muted
              }
            />

            <Text style={styles.label}>
              Category
            </Text>

            <View
              style={
                styles.autoCategoryBox
              }
            >
              <Text
                style={
                  styles.autoCategoryText
                }
              >
                {editDate
                  ? getEventStatus(
                      editDate
                    )
                  : 'Unknown'}
              </Text>

              <Text
                style={
                  styles.autoCategoryHint
                }
              >
                Automatically determined
                from the event date.
              </Text>
            </View>

            <Text style={styles.label}>
              Message for You
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                styles.messageInput,
              ]}
              multiline
              value={editMessage}
              onChangeText={setEditMessage}
              placeholder="Write a welcome message for this event..."
              placeholderTextColor={colors.muted}
              textAlignVertical="top"
            />

            <Text style={styles.dateHint}>
              This message appears on the event card.
            </Text>

            <Text style={styles.label}>
              Flow of Program
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
              ]}
              multiline
              value={editFlow}
              onChangeText={setEditFlow}
              placeholderTextColor={
                colors.muted
              }
            />

            <View
              style={styles.modalBtnRow}
            >
              <TouchableOpacity
                style={[
                  styles.modalActionBtn,
                  {
                    backgroundColor:
                      colors.border,
                  },
                ]}
                onPress={() =>
                  setEditModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={styles.btnText}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalActionBtn,
                  {
                    backgroundColor:
                      primary,
                  },
                ]}
                onPress={
                  handleSaveEdit
                }
              >
                <Text
                  style={styles.btnText}
                >
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors, isDarkMode, primary) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    scrollContainer: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 40,
    },

    topHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
      gap: 8,
    },

    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },

    backButtonText: {
      color: colors.text,
      fontSize: 32,
      lineHeight: 34,
      fontWeight: '300',
      marginTop: -2,
    },

    headerTitle: {
      fontSize: 21,
      fontWeight: '800',
      color: colors.text,
      flex: 1,
      flexShrink: 1,
    },

    addEventTopBtn: {
      backgroundColor: primary,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderRadius: 11,
      flexShrink: 0,
    },

    addEventTopBtnText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 13,
    },

    filterContainer: {
      flexDirection: 'row',
      marginBottom: 10,
    },

    filterLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 6,
    },

    filterBtn: {
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },

    activeFilterBtn: {
      backgroundColor: primary,
      borderColor: primary,
    },

    filterText: {
      color: colors.muted,
      fontWeight: '600',
    },

    activeFilterText: {
      color: '#FFFFFF',
    },

    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 50,
    },

    loadingText: {
      color: colors.muted,
      marginTop: 10,
      fontSize: 13,
    },

    noEventText: {
      color: colors.muted,
      textAlign: 'center',
      marginTop: 40,
    },

    eventCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#D7E0EA',
      elevation: 3,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDarkMode ? 0.18 : 0.09,
      shadowRadius: 8,
    },

    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
      gap: 8,
    },

    eventTitle: {
      fontSize: 19,
      lineHeight: 25,
      fontWeight: '800',
      color: colors.text,
      flex: 1,
      marginRight: 2,
      letterSpacing: -0.25,
    },

    badge: {
      backgroundColor: colors.bg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },

    badgeText: {
      color: '#38BDF8',
      fontSize: 12,
      fontWeight: '600',
    },

    eventDetailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 7,
      paddingHorizontal: 2,
    },

    eventDetailIcon: {
      width: 28,
      marginRight: 8,
      marginTop: 1,
    },

    eventDetail: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 21,
      marginBottom: 0,
      flex: 1,
    },

    flowPreviewPanel: {
      backgroundColor: isDarkMode ? '#111C2F' : '#F8FAFC',
      borderColor: isDarkMode ? '#334155' : '#D5DEE8',
      borderWidth: 1,
      borderRadius: 15,
      paddingHorizontal: 13,
      paddingVertical: 12,
      marginTop: 8,
    },

    flowPreviewHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 7,
    },

    flowPreviewIcon: {
      marginRight: 7,
    },

    flowPreviewHeading: {
      color: isDarkMode ? '#E2E8F0' : '#1E293B',
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 0,
    },

    flowPreviewText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
    },

    welcomePanel: {
      backgroundColor: isDarkMode ? '#172847' : '#EEF5FF',
      borderColor: isDarkMode ? '#31558B' : '#C7DDF8',
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginTop: 2,
      marginBottom: 13,
    },

    welcomeHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },

    welcomeIcon: {
      marginRight: 7,
    },

    welcomeHeading: {
      color: isDarkMode ? '#BFDBFE' : '#1D4ED8',
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 0,
    },

    welcomeText: {
      color: isDarkMode ? '#DBEAFE' : '#1E3A8A',
      fontSize: 13,
      lineHeight: 20,
    },

    actionRow: {
      flexDirection: 'row',
      marginTop: 14,
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      gap: 8,
      flexWrap: 'wrap',
    },

    reminderBtn: {
      minWidth: 82,
      paddingHorizontal: 9,
      backgroundColor: '#0284C7',
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    activeReminderBtn: {
      backgroundColor: '#059669',
    },

    reminderBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },

    detailsBtn: {
      minWidth: 82,
      paddingHorizontal: 9,
      backgroundColor: '#475569',
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    printBtn: {
      minWidth: 82,
      paddingHorizontal: 9,
      backgroundColor: '#0D9488',
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    deleteBtn: {
      minWidth: 82,
      paddingHorizontal: 9,
      backgroundColor: '#DC2626',
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    editBtn: {
      minWidth: 82,
      paddingHorizontal: 9,
      backgroundColor: '#D97706',
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    btnTextSmall: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 'bold',
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },

    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      width: '100%',
      maxHeight: '100%',
      flexShrink: 1,
    },

    editModalScrollView: {
      flexShrink: 1,
    },

    modalScrollContent: {
      paddingBottom: 24,
    },

    messageInput: {
      minHeight: 90,
      height: 90,
    },

    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },

    sectionHeader: {
      color: '#38BDF8',
      fontSize: 13,
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 4,
    },

    boxContent: {
      backgroundColor: colors.bg,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },

    boxText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 16,
    },

    editModalBtn: {
      backgroundColor: '#D97706',
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },

    printModalBtn: {
      backgroundColor: '#0D9488',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },

    deleteModalBtn: {
      backgroundColor: '#DC2626',
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },

    closeModalBtn: {
      backgroundColor: colors.border,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },

    label: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 2,
      marginTop: 6,
    },

    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 8,
      color: colors.text,
      fontSize: 12,
    },

    dateHint: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 4,
    },

    datePickerButton: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
    },

    datePickerText: {
      color: colors.text,
      fontSize: 12,
    },

    autoCategoryBox: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
    },

    autoCategoryText: {
      color: '#38BDF8',
      fontSize: 13,
      fontWeight: 'bold',
    },

    autoCategoryHint: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 3,
    },

    multilineInput: {
      height: 70,
      textAlignVertical: 'top',
    },

    modalBtnRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      gap: 10,
    },

    modalActionBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },

    btnText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 13,
    },
  });