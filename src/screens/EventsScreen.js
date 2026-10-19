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
import * as Print from 'expo-print';
import * as Notifications from 'expo-notifications';
import { ensureNotificationChannel, NOTIFICATION_CHANNEL_ID } from '../services/pushNotifications';

const API_URL = 'https://ikonek-app.onrender.com';
const EVENT_REMINDER_STORAGE_KEY = '@ikonek_event_reminder_notifications';
// Persist the button state separately from OS notification IDs. Notification IDs
// can be missing/invalid after app reinstalls or OS cleanup, but the user's choice remains.
const EVENT_REMINDER_STATE_KEY = '@ikonek_event_reminder_state';

const readReminderMap = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeReminderMap = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

// The foreground notification handler is set once in src/services/pushNotifications.js.

const getEventDateForReminder = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // Date-only values should remind at 9:00 AM local time, rather than midnight.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(9, 0, 0, 0);
  }
  return date;
};

// Older events may still contain the original generic welcome message.
// Treat that legacy default as empty so it does not appear as if it were
// the event's customized message.
const LEGACY_DEFAULT_EVENT_MESSAGE =
  'Welcome, everyone! Join us to build meaningful friendships and grow closer to God.';

const getCustomEventMessage = (value) => {
  const message = String(value || '').trim();
  return message.toLowerCase() === LEGACY_DEFAULT_EVENT_MESSAGE.toLowerCase()
    ? ''
    : message;
};

const normalizeAttendeeName = (value) =>
  String(value || '').trim().toLowerCase();

const getAttendeeAttendanceStatus = (event, attendeeName) => {
  const normalizedName = normalizeAttendeeName(attendeeName);
  const record = (Array.isArray(event?.attendanceRecords)
    ? event.attendanceRecords
    : []
  ).find(
    (item) =>
      normalizeAttendeeName(item?.youth?.name) === normalizedName
  );

  if (record?.status) {
    return String(record.status).toUpperCase() === 'PRESENT'
      ? 'Present'
      : String(record.status).toUpperCase() === 'ABSENT'
        ? 'Absent'
        : 'Not Yet Marked';
  }

  return event?.attendanceFinalized ? 'Absent' : 'Not Yet Marked';
};

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
  const [printEvent, setPrintEvent] = useState(null);
  const [printPreviewVisible, setPrintPreviewVisible] = useState(false);
  const [printBackground, setPrintBackground] = useState('#FFFFFF');
  const [printBackgroundImage, setPrintBackgroundImage] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editFlow, setEditFlow] = useState('');
  const [editMessage, setEditMessage] = useState('');
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
  const [currentUser, setCurrentUser] = useState(null);
  const [signupModalVisible, setSignupModalVisible] = useState(false);
  const [assignedYouth, setAssignedYouth] = useState([]);
  const [selectedYouthIds, setSelectedYouthIds] = useState([]);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSaving, setSignupSaving] = useState(false);

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

      const [savedReminders, savedReminderState] = await Promise.all([
        readReminderMap(EVENT_REMINDER_STORAGE_KEY),
        readReminderMap(EVENT_REMINDER_STATE_KEY),
      ]);

      setEvents(
        Array.isArray(data.events)
          ? data.events.map((event) => {
            const eventKey = String(event.id);
            // The state map is authoritative; the notification list is a fallback
            // for reminders created before this state key existed.
            const reminderSet = Object.prototype.hasOwnProperty.call(savedReminderState, eventKey)
              ? savedReminderState[eventKey] === true
              : Array.isArray(savedReminders[eventKey]) && savedReminders[eventKey].length > 0;
            return {
              ...event,
              attendees: Array.isArray(event.attendees) ? event.attendees : [],
              reminderSet,
            };
          })
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

        setCurrentUser(user);
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

  const handleToggleReminder = async (id) => {
    const event = events.find((item) => String(item.id) === String(id));
    if (!event) return;

    const savedReminders = await readReminderMap(EVENT_REMINDER_STORAGE_KEY);
    const savedReminderState = await readReminderMap(EVENT_REMINDER_STATE_KEY);

    if (event.reminderSet) {
      const existingIds = savedReminders[String(id)] || [];
      await Promise.all(existingIds.map(async (notificationId) => {
        try {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        } catch (error) {
          console.warn('Could not cancel event reminder:', error);
        }
      }));
      delete savedReminders[String(id)];
      delete savedReminderState[String(id)];
      await Promise.all([
        writeReminderMap(EVENT_REMINDER_STORAGE_KEY, savedReminders),
        writeReminderMap(EVENT_REMINDER_STATE_KEY, savedReminderState),
      ]);

      setEvents((current) => current.map((item) =>
        String(item.id) === String(id) ? { ...item, reminderSet: false } : item
      ));
      Alert.alert('Reminder Removed', `Reminders cancelled for "${event.title}".`);
      return;
    }

    try {
      const eventDate = getEventDateForReminder(event.date);
      if (!eventDate || eventDate <= new Date()) {
        Alert.alert('Reminder Unavailable', 'This event has already started or its date is invalid.');
        return;
      }

      const permission = await Notifications.getPermissionsAsync();
      let status = permission.status;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted') {
        Alert.alert('Notifications Disabled', 'Allow notifications for iKonek in your phone settings to receive event reminders.');
        return;
      }

      const triggers = [
        { date: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000), message: 'is tomorrow!' },
        { date: eventDate, message: 'is today!' },
      ].filter((item) => item.date > new Date());

      if (!triggers.length) {
        Alert.alert('Reminder Unavailable', 'There are no future reminders left for this event.');
        return;
      }

      // Android needs the channel to exist before a reminder is scheduled on it.
      await ensureNotificationChannel();

      const notificationIds = [];
      for (const reminder of triggers) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Event Reminder: ${event.title}`,
            body: `${event.title} ${reminder.message}`,
            data: { eventId: String(event.id), eventTitle: event.title },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminder.date,
            channelId: NOTIFICATION_CHANNEL_ID,
          },
        });
        notificationIds.push(notificationId);
      }

      savedReminders[String(id)] = notificationIds;
      savedReminderState[String(id)] = true;
      await Promise.all([
        writeReminderMap(EVENT_REMINDER_STORAGE_KEY, savedReminders),
        writeReminderMap(EVENT_REMINDER_STATE_KEY, savedReminderState),
      ]);

      // Save a persistent in-app notification when the user SETS the reminder.
      // Local phone reminders still work if the bell API is temporarily unavailable.
      try {
        const token = await AsyncStorage.getItem('@ikonek_token');
        if (token) {
          const bellResponse = await fetch(`${API_URL}/api/notifications/event-reminders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ eventId: String(event.id) }),
          });
          if (!bellResponse.ok) {
            const bellData = await bellResponse.json().catch(() => ({}));
            console.warn('Could not save event reminder to notification bell:', bellData.message || bellResponse.status);
          }
        }
      } catch (bellError) {
        console.warn('Could not save event reminder to notification bell:', bellError?.message || bellError);
      }
      setEvents((current) => current.map((item) =>
        String(item.id) === String(id) ? { ...item, reminderSet: true } : item
      ));
      Alert.alert('Reminder Set', triggers.length === 2
        ? `You'll be notified one day before and on the day of "${event.title}".`
        : `You'll be notified on the day of "${event.title}".`);
    } catch (error) {
      console.error('Set event reminder error:', error);
      Alert.alert('Reminder Error', 'Unable to schedule this reminder. Please check notification permissions and try again.');
    }
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

  const handleOpenDetails = async (event) => {
    setSelectedEvent(event);
    setModalVisible(true);

    // Refresh this event's attendance so the counts reflect recent check-ins.
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      const response = await fetch(`${API_URL}/api/events/${event.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      if (response.ok && data?.event) {
        // Keep the locally stored reminder state when the API refreshes event details.
        const existingEvent = events.find(
          (item) => String(item.id) === String(data.event.id)
        );
        setSelectedEvent({
          ...(existingEvent || {}),
          ...data.event,
          reminderSet: Boolean(existingEvent?.reminderSet),
        });
        setEvents((currentEvents) =>
          currentEvents.map((item) =>
            String(item.id) === String(data.event.id)
              ? { ...item, ...data.event, reminderSet: Boolean(item.reminderSet) }
              : item
          )
        );
      }
    } catch (error) {
      // Keep the already-loaded event details visible if refresh fails.
      console.warn('Refresh event attendance error:', error);
    }
  };


  const normalizeName = (value) =>
    String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Event.attendees stores youth names, so use the logged-in user's
  // available name fields to determine whether self-signup already exists.
  const hasCurrentUserSignedUp = (event) => {
    const attendeeNames = Array.isArray(event?.attendees)
      ? event.attendees.map(normalizeName)
      : [];
    const userNames = [
      currentUser?.name,
      currentUser?.fullName,
      currentUser?.username,
    ].map(normalizeName).filter(Boolean);

    return userNames.some((name) => attendeeNames.includes(name));
  };

  const getSignupEventDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const canSignUpForEvent = (event) => {
    if (!event || event.attendanceFinalized) return false;
    const role = String(currentUser?.role || '').toUpperCase();
    if (!['USER', 'YOUTH', 'LEADER'].includes(role)) return false;
    const eventKey = getSignupEventDateKey(event.date);
    const todayKey = getSignupEventDateKey(new Date());
    return Boolean(eventKey && todayKey && eventKey >= todayKey);
  };

  const handleYouthSelfSignup = async () => {
    if (!selectedEvent || signupSaving) return;
    if (hasCurrentUserSignedUp(selectedEvent)) {
      Alert.alert('Already Signed Up', 'You are already signed up for this event.');
      return;
    }
    setSignupSaving(true);
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) throw new Error('Please sign in again before signing up.');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent.id}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not sign up for this event.');
      setSelectedEvent(data.event);
      setEvents((current) => current.map((event) => String(event.id) === String(data.event.id) ? { ...event, ...data.event, reminderSet: Boolean(event.reminderSet) } : event));
      Alert.alert('Signed Up', `You are signed up for ${selectedEvent.title}.`);
    } catch (error) {
      Alert.alert('Event Signup', error.message || 'Could not sign up for this event.');
    } finally {
      setSignupSaving(false);
    }
  };

  const openLeaderSignup = async () => {
    if (!selectedEvent || signupLoading) return;
    setSignupModalVisible(true);
    setSelectedYouthIds([]);
    setSignupLoading(true);
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) throw new Error('Please sign in again before registering youth.');
      const response = await fetch(`${API_URL}/api/youth`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not load youth members.');
      const rows = Array.isArray(data) ? data : (data.youth || data.members || []);
      const leaderName = normalizeName(currentUser?.name || currentUser?.fullName || currentUser?.username);
      const registered = new Set((selectedEvent.attendees || []).map(normalizeName));
      const assigned = rows.filter((member) =>
        normalizeName(member.cellLeader) === leaderName && !registered.has(normalizeName(member.name))
      );
      setAssignedYouth(assigned);
    } catch (error) {
      setSignupModalVisible(false);
      Alert.alert('Event Signup', error.message || 'Could not load your assigned youth.');
    } finally {
      setSignupLoading(false);
    }
  };

  const toggleYouthSelection = (youthId) => {
    setSelectedYouthIds((current) => current.includes(youthId)
      ? current.filter((id) => id !== youthId)
      : [...current, youthId]);
  };

  const submitLeaderSignup = async () => {
    if (!selectedEvent || !selectedYouthIds.length || signupSaving) return;
    setSignupSaving(true);
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) throw new Error('Please sign in again before registering youth.');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent.id}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ youthIds: selectedYouthIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not register the selected youth.');
      setSelectedEvent(data.event);
      setEvents((current) => current.map((event) => String(event.id) === String(data.event.id) ? { ...event, ...data.event, reminderSet: Boolean(event.reminderSet) } : event));
      setSignupModalVisible(false);
      Alert.alert('Signup Saved', 'The selected youth have been signed up. Attendance has not been marked.');
    } catch (error) {
      Alert.alert('Event Signup', error.message || 'Could not register the selected youth.');
    } finally {
      setSignupSaving(false);
    }
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
    setEditMessage(getCustomEventMessage(event.message));
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
        'Your event details and welcome message have been saved.'
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

  const handlePrintFlow = (event) => {
    if (!event) {
      Alert.alert('Unable to print', 'Please select an event first.');
      return;
    }
    setPrintEvent(event);
    setPrintBackground('#FFFFFF');
    setPrintBackgroundImage('');
    setPrintPreviewVisible(true);
  };

  const handlePrintProgram = async () => {
    if (!printEvent) return;
    const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
    const flow = String(printEvent.flowOfProgram || 'No flow of program provided yet.')
      .split(/\r?\n/)
      .map((line) => `<p>${safe(line) || '&nbsp;'}</p>`)
      .join('');
    const backgroundCss = /^https?:\/\//i.test(printBackgroundImage.trim())
      ? `background-image:linear-gradient(rgba(255,255,255,.88),rgba(255,255,255,.88)),url('${safe(printBackgroundImage.trim())}');background-size:cover;background-position:center;`
      : `background-color:${printBackground};`;
    const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>
      @page{size:A4 portrait;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:0;${backgroundCss}}
      .page{min-height:255mm;padding:8mm;border:1px solid #d1d5db}.brand{text-align:center;font-size:14px;font-weight:bold;letter-spacing:3px;color:#0f766e}
      h1{text-align:center;font-size:24px;margin:10px 0 5px}.subtitle{text-align:center;color:#475569;font-size:12px;margin-bottom:22px}
      .details{border-top:2px solid #0f766e;border-bottom:1px solid #cbd5e1;padding:12px 0;margin-bottom:22px;font-size:13px;line-height:1.7}
      h2{font-size:16px;margin-bottom:12px;color:#0f766e}.flow{font-size:13px;line-height:1.65;overflow-wrap:anywhere}.flow p{margin:0 0 7px}
      .footer{margin-top:30px;border-top:1px solid #cbd5e1;padding-top:10px;text-align:center;font-size:10px;color:#64748b}
      </style></head><body><main class="page"><div class="brand">iKONEK</div><h1>${safe(printEvent.title || 'Event Program')}</h1>
      <div class="subtitle">FLOW OF PROGRAM</div><div class="details"><strong>Date:</strong> ${safe(formatEventDate(printEvent.date))}<br>
      <strong>Location:</strong> ${safe(printEvent.location || 'Main Church')}<br><strong>Category:</strong> ${safe(printEvent.category || 'Upcoming')}</div>
      <h2>Program Schedule</h2><section class="flow">${flow}</section><div class="footer">iKonek • Event Program</div></main></body></html>`;
    try {
      await Print.printAsync({ html });
    } catch (error) {
      Alert.alert('Printing unavailable', error?.message || 'Could not open the print interface.');
    }
  };

  // Keep the event-status filters, but show the most relevant events first:
  // Today -> Upcoming (nearest first) -> Past (most recent first).
  const filteredEvents = events
    .filter((event) => (
      selectedStatus === 'All' ||
      getEventStatus(event.date) === selectedStatus
    ))
    .sort((a, b) => {
      const statusOrder = {
        Today: 0,
        Upcoming: 1,
        Past: 2,
      };

      const statusA = getEventStatus(a.date);
      const statusB = getEventStatus(b.date);
      const statusDifference =
        statusOrder[statusA] - statusOrder[statusB];

      if (statusDifference !== 0) {
        return statusDifference;
      }

      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      // Invalid/missing dates stay safely at the end of their status group.
      const safeDateA = Number.isNaN(dateA) ? 0 : dateA;
      const safeDateB = Number.isNaN(dateB) ? 0 : dateB;

      // Today and Upcoming: nearest event first.
      // Past: most recently held event first.
      return statusA === 'Past'
        ? safeDateB - safeDateA
        : safeDateA - safeDateB;
    });

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
              {getCustomEventMessage(item.message) ? (
                <View style={styles.welcomePanel}>
                  <View style={styles.welcomeHeadingRow}>
                    <Ionicons
                      name="heart"
                      size={18}
                      color={isDarkMode ? '#BFDBFE' : '#1D4ED8'}
                      style={styles.welcomeIcon}
                    />
                    <Text style={styles.welcomeHeading}>
                      A Message for You
                    </Text>
                  </View>

                  <Text style={styles.welcomeText}>
                    {getCustomEventMessage(item.message)}
                  </Text>
                </View>
              ) : null}
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
                <ScrollView
                  style={styles.flowPreviewScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  <Text style={styles.flowPreviewText}>
                    {item.flowOfProgram || 'No flow of program provided yet.'}
                  </Text>
                </ScrollView>
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
            <ScrollView
              style={styles.detailsModalScroll}
              contentContainerStyle={styles.detailsModalScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
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

                  {(() => {
                    const signedUpAttendees = Array.isArray(selectedEvent.attendees)
                      ? selectedEvent.attendees
                      : [];
                    const attendanceCounts = signedUpAttendees.reduce(
                      (counts, name) => {
                        const status = getAttendeeAttendanceStatus(selectedEvent, name);
                        counts[status] = (counts[status] || 0) + 1;
                        return counts;
                      },
                      { Present: 0, Absent: 0, 'Not Yet Marked': 0 }
                    );

                    return (
                      <>
                        <View style={styles.boxContent}>
                          <Text style={styles.boxText}>
                            Signed Up: {signedUpAttendees.length}
                          </Text>
                          <Text style={styles.boxText}>
                            Present: {attendanceCounts.Present}
                          </Text>
                          <Text style={styles.boxText}>
                            Absent: {attendanceCounts.Absent}
                          </Text>
                          <Text style={styles.boxText}>
                            Not Yet Marked: {attendanceCounts['Not Yet Marked']}
                          </Text>
                        </View>

                        <ScrollView
                          style={[styles.boxContent, { marginTop: 8, maxHeight: 220 }]}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator
                        >
                          {signedUpAttendees.length ? (
                            signedUpAttendees.map((name, index) => {
                              const status = getAttendeeAttendanceStatus(selectedEvent, name);
                              return (
                                <Text key={`${name}-${index}`} style={styles.boxText}>
                                  • {name} — {status}
                                </Text>
                              );
                            })
                          ) : (
                            <Text style={styles.boxText}>
                              No attendees signed up yet.
                            </Text>
                          )}
                        </ScrollView>
                      </>
                    );
                  })()}

                  {canSignUpForEvent(selectedEvent) && ['USER', 'YOUTH'].includes(String(currentUser?.role || '').toUpperCase()) && (
                    hasCurrentUserSignedUp(selectedEvent) ? (
                      <View style={[styles.signupActionBtn, { opacity: 0.8 }]}>
                        <Text style={styles.btnText}>✅ Already Signed Up</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.signupActionBtn, { opacity: signupSaving ? 0.65 : 1 }]}
                        onPress={handleYouthSelfSignup}
                        disabled={signupSaving}
                      >
                        <Text style={styles.btnText}>{signupSaving ? 'Signing Up...' : '✅ Sign Up for Event'}</Text>
                      </TouchableOpacity>
                    )
                  )}

                  {canSignUpForEvent(selectedEvent) && String(currentUser?.role || '').toUpperCase() === 'LEADER' && (
                    <TouchableOpacity
                      style={styles.signupActionBtn}
                      onPress={openLeaderSignup}
                      disabled={signupLoading || signupSaving}
                    >
                      <Text style={styles.btnText}>{signupLoading ? 'Loading Youth...' : '👥 Sign Up Assigned Youth'}</Text>
                    </TouchableOpacity>
                  )}

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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LEADER EVENT SIGNUP MODAL */}
      <Modal
        visible={signupModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSignupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Up Assigned Youth</Text>
            <Text style={styles.boxText}>Select youth assigned to you for {selectedEvent?.title || 'this event'}. Already signed-up youth are hidden.</Text>
            {signupLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} size="large" color={primary} />
            ) : (
              <ScrollView style={{ maxHeight: 320, marginTop: 12 }} keyboardShouldPersistTaps="handled">
                {assignedYouth.length ? assignedYouth.map((member) => {
                  const checked = selectedYouthIds.includes(member.id);
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.signupYouthRow, checked && styles.signupYouthRowSelected]}
                      onPress={() => toggleYouthSelection(member.id)}
                    >
                      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? primary : colors.muted} />
                      <Text style={styles.boxText}>{member.name}</Text>
                    </TouchableOpacity>
                  );
                }) : (
                  <Text style={[styles.boxText, { marginVertical: 16 }]}>No eligible assigned youth found. Check that their Cell Leader matches your account name.</Text>
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.signupActionBtn, (!selectedYouthIds.length || signupSaving || signupLoading) && { opacity: 0.5 }]}
              onPress={submitLeaderSignup}
              disabled={!selectedYouthIds.length || signupSaving || signupLoading}
            >
              <Text style={styles.btnText}>{signupSaving ? 'Saving...' : `Sign Up Selected (${selectedYouthIds.length})`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSignupModalVisible(false)}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
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

      {/* PRINT FLOW CUSTOMIZATION AND PREVIEW */}
      <Modal
        visible={printPreviewVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPrintPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            <Text style={styles.modalTitle}>Print Flow of Program</Text>
            <Text style={styles.label}>Page setup: A4 • Portrait</Text>
            <Text style={styles.label}>Background color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 12 }}>
              {[
                { label: 'White', value: '#FFFFFF' },
                { label: 'Cream', value: '#FFF7E6' },
                { label: 'Sky', value: '#EAF6FF' },
                { label: 'Mint', value: '#E8F8F0' },
                { label: 'Lavender', value: '#F2EDFF' },
                { label: 'Dark', value: '#263244' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setPrintBackground(option.value)}
                  style={{ paddingVertical: 8, paddingHorizontal: 11, borderRadius: 8, backgroundColor: option.value, borderWidth: printBackground === option.value ? 3 : 1, borderColor: printBackground === option.value ? primary : '#9CA3AF' }}
                >
                  <Text style={{ color: option.value === '#263244' ? '#FFFFFF' : '#172033', fontSize: 12 }}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Optional background image URL</Text>
            <TextInput
              style={styles.input}
              value={printBackgroundImage}
              onChangeText={setPrintBackgroundImage}
              placeholder="https://example.com/background.jpg"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.label}>Preview</Text>
            <ScrollView style={{ maxHeight: 290, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: printBackground, padding: 16 }}>
              <Text style={{ textAlign: 'center', color: '#0F766E', fontWeight: '800', letterSpacing: 3 }}>iKONEK</Text>
              <Text style={{ textAlign: 'center', color: printBackground === '#263244' ? '#FFFFFF' : '#172033', fontSize: 20, fontWeight: '800', marginTop: 10 }}>{printEvent?.title || 'Event Program'}</Text>
              <Text style={{ textAlign: 'center', color: printBackground === '#263244' ? '#E5E7EB' : '#475569', marginBottom: 16 }}>FLOW OF PROGRAM</Text>
              <Text style={{ color: printBackground === '#263244' ? '#FFFFFF' : '#172033', lineHeight: 22 }}>Date: {printEvent?.date ? formatEventDate(printEvent.date) : '—'}{'\n'}Location: {printEvent?.location || 'Main Church'}{'\n'}Category: {printEvent?.category || 'Upcoming'}</Text>
              <View style={{ height: 1, backgroundColor: '#0F766E', marginVertical: 14 }} />
              <Text style={{ color: '#0F766E', fontWeight: '800', marginBottom: 8 }}>Program Schedule</Text>
              <Text style={{ color: printBackground === '#263244' ? '#FFFFFF' : '#172033', lineHeight: 22 }}>{printEvent?.flowOfProgram || 'No flow of program provided yet.'}</Text>
            </ScrollView>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>Background images require a publicly accessible image URL. The print layout uses an iKonek text wordmark because no logo image was included in this ZIP.</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#64748B' }]} onPress={() => setPrintPreviewVisible(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: primary }]} onPress={handlePrintProgram}>
                <Text style={styles.btnText}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 6,
    },

    flowPreviewScroll: {
      maxHeight: 110,
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
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      width: '100%',
      maxHeight: '90%',
      flexShrink: 1,
    },

    detailsModalScroll: {
      flexShrink: 1,
    },

    detailsModalScrollContent: {
      paddingBottom: 8,
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

    signupActionBtn: {
      backgroundColor: primary,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 10,
    },

    signupYouthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 7,
    },

    signupYouthRowSelected: {
      borderColor: primary,
      backgroundColor: isDarkMode ? '#0B2A3A' : '#EFF6FF',
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