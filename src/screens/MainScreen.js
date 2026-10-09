import { useMemo, useState, useEffect, useCallback } from 'react';

import {
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'https://ikonek-app.onrender.com';

// Temporary local schedule for the Verse of the Day.
// Later this can be replaced directly by the Neon-backed
// /api/verse-of-the-day endpoint.
const DAILY_VERSES = [
  {
    text: 'For I know the plans I have for you, plans to prosper you and not to harm you, plans to give you hope and a future.',
    reference: 'Jeremiah 29:11 (KJV)',
    background:
      'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85',
  },
  {
    text: 'The Lord is my shepherd; I shall not want.',
    reference: 'Psalm 23:1 (KJV)',
    background:
      'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85',
  },
  {
    text: 'I can do all things through Christ which strengtheneth me.',
    reference: 'Philippians 4:13 (KJV)',
    background:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85',
  },
  {
    text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God.',
    reference: 'Isaiah 41:10 (KJV)',
    background:
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85',
  },
  {
    text: 'Trust in the Lord with all thine heart; and lean not unto thine own understanding.',
    reference: 'Proverbs 3:5 (KJV)',
    background:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85',
  },
  {
    text: 'God is our refuge and strength, a very present help in trouble.',
    reference: 'Psalm 46:1 (KJV)',
    background:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85',
  },
  {
    text: 'For God so loved the world, that he gave his only begotten Son.',
    reference: 'John 3:16 (KJV)',
    background:
      'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85',
  },
];

const getDailyVerse = () => {
  const dayNumber = Math.floor(Date.now() / 86400000);

  return DAILY_VERSES[
    ((dayNumber % DAILY_VERSES.length) + DAILY_VERSES.length) %
      DAILY_VERSES.length
  ];
};

export default function MainScreen({
  navigation,
  user,
  onLogout,
  onOpenDrawer,
}) {
  const { isDarkMode } = useTheme();

  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState({
    present: 0,
    absent: 0,
    percentage: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const verse = useMemo(getDailyVerse, []);

  /*
   * System theme colors
   */
  const theme = useMemo(
    () =>
      isDarkMode
        ? {
            background: '#07152E',
            surface: '#101F39',
            surfaceBorder: '#1E3A61',

            primaryText: '#F7F9FF',
            secondaryText: '#91A8CA',
            mutedText: '#526A8D',

            menuIcon: '#F7F9FF',
            notificationIcon: '#F7F9FF',

            primary: '#2875F5',
            accent: '#55A1FF',

            verseOverlay: 'rgba(3,17,39,0.64)',
            verseText: '#FFFFFF',
            verseReference: '#D8E5FF',

            verseBadge: '#F5B82E',
            verseBadgeText: '#07152E',

            readButton: '#F7F9FF',
            readButtonText: '#07152E',

            present: '#16C9A6',
            absent: '#FF6575',

            quickBible: '#2875F5',
            quickEvents: '#8B42F5',
            quickJournal: '#16C9A6',
            quickAttendance: '#F5B82E',

            refresh: '#55A1FF',
          }
        : {
            background: '#F8FAFC',
            surface: '#FFFFFF',
            surfaceBorder: '#E2E8F0',

            primaryText: '#0F172A',
            secondaryText: '#64748B',
            mutedText: '#94A3B8',

            menuIcon: '#0F172A',
            notificationIcon: '#0F172A',

            primary: '#2875F5',
            accent: '#2563EB',

            verseOverlay: 'rgba(15,23,42,0.42)',
            verseText: '#FFFFFF',
            verseReference: '#E2E8F0',

            verseBadge: '#F5B82E',
            verseBadgeText: '#0F172A',

            readButton: '#FFFFFF',
            readButtonText: '#0F172A',

            present: '#0E9F83',
            absent: '#E11D48',

            quickBible: '#2875F5',
            quickEvents: '#8B42F5',
            quickJournal: '#16A085',
            quickAttendance: '#D99E00',

            refresh: '#2563EB',
          },
    [isDarkMode]
  );

  const styles = useMemo(
    () => createStyles(theme),
    [theme]
  );

  const loadDashboard = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');

      const headers = {
        'Content-Type': 'application/json',
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      };

      const [eventsResponse, attendanceResponse] =
        await Promise.allSettled([
          fetch(`${API_URL}/api/events`, {
            headers,
          }),

          fetch(`${API_URL}/api/attendance`, {
            headers,
          }),
        ]);

      if (
        eventsResponse.status === 'fulfilled' &&
        eventsResponse.value.ok
      ) {
        const data =
          await eventsResponse.value.json();

        setEvents(
          Array.isArray(data.events)
            ? data.events
            : []
        );
      }

      if (
        attendanceResponse.status === 'fulfilled' &&
        attendanceResponse.value.ok
      ) {
        const data =
          await attendanceResponse.value.json();

        const records = Array.isArray(data.records)
          ? data.records
          : Array.isArray(data.attendance)
            ? data.attendance
            : [];

        const present = records.filter(
          (item) =>
            String(item.status || '').toLowerCase() ===
            'present'
        ).length;

        const absent = records.filter(
          (item) =>
            String(item.status || '').toLowerCase() ===
            'absent'
        ).length;

        const total = present + absent;

        setAttendance({
          present,
          absent,
          percentage: total
            ? Math.round((present / total) * 100)
            : 0,
        });
      }
    } catch (error) {
      console.log(
        'Dashboard load error:',
        error?.message || error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);

    await loadDashboard();

    setRefreshing(false);
  };

  const upcomingEvent = events
    .filter(
      (event) =>
        event?.date &&
        new Date(event.date).getTime() >= Date.now()
    )
    .sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    )[0];

  const eventDate = upcomingEvent?.date
    ? new Date(
        upcomingEvent.date
      ).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'No upcoming event';

  const displayName = user?.name || 'Youth';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.refresh}
          />
        }
        contentContainerStyle={styles.content}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={onOpenDrawer}
              activeOpacity={0.8}
              accessibilityLabel="Open navigation menu"
            >
              <Ionicons
                name="menu"
                size={25}
                color={theme.menuIcon}
              />
            </TouchableOpacity>

            <View>
              <Text style={styles.logo}>
                IKONEK
              </Text>

              <Text style={styles.smallLabel}>
                YOUTH CONNECT
              </Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() =>
                navigation?.navigate?.('Events')
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color={theme.notificationIcon}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* GREETING */}
        <View style={styles.greetingRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              Good day, {displayName}! 👋
            </Text>

            <Text style={styles.subGreeting}>
              Welcome back to iKonek.
            </Text>
          </View>
        </View>

        {/* VERSE OF THE DAY */}
        <Text style={styles.sectionTitle}>
          Verse of the Day
        </Text>

        <ImageBackground
          source={{ uri: verse.background }}
          style={styles.verseCard}
          imageStyle={styles.verseImage}
        >
          <View style={styles.verseOverlay}>
            <View style={styles.verseBadge}>
              <Ionicons
                name="book-outline"
                size={14}
                color={theme.verseBadgeText}
              />

              <Text style={styles.verseBadgeText}>
                {' '}
                DAILY WORD
              </Text>
            </View>

            <Text style={styles.verseText}>
              “{verse.text}”
            </Text>

            <Text style={styles.reference}>
              {verse.reference}
            </Text>

            <TouchableOpacity
              style={styles.readButton}
              onPress={() =>
                navigation?.navigate?.('Bible')
              }
              activeOpacity={0.8}
            >
              <Text style={styles.readButtonText}>
                Read in Bible
              </Text>

              <Ionicons
                name="arrow-forward"
                size={16}
                color={theme.readButtonText}
              />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* UPCOMING EVENT */}
        <Text style={styles.sectionTitle}>
          Upcoming Event
        </Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation?.navigate?.('Events')
          }
          activeOpacity={0.85}
        >
          <View style={styles.eventIcon}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={theme.accent}
            />
          </View>

          <View style={styles.cardMain}>
            <Text style={styles.cardTitle}>
              {upcomingEvent?.title ||
                'No upcoming events'}
            </Text>

            <Text style={styles.cardMeta}>
              {upcomingEvent
                ? eventDate
                : 'Check Events for updates'}
            </Text>

            {upcomingEvent?.location ? (
              <Text style={styles.cardMeta}>
                {upcomingEvent.location}
              </Text>
            ) : null}
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.secondaryText}
          />
        </TouchableOpacity>

        {/* ATTENDANCE */}
        <Text style={styles.sectionTitle}>
          Attendance
        </Text>

        <TouchableOpacity
          style={styles.attendanceCard}
          onPress={() =>
            navigation?.navigate?.('Attendance')
          }
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.attendanceNumber}>
              {loading
                ? '—'
                : `${attendance.percentage}%`}
            </Text>

            <Text style={styles.attendanceLabel}>
              Attendance rate
            </Text>
          </View>

          <View style={styles.attendanceStats}>
            <View>
              <Text style={styles.present}>
                {attendance.present}
              </Text>

              <Text style={styles.statLabel}>
                Present
              </Text>
            </View>

            <View>
              <Text style={styles.absent}>
                {attendance.absent}
              </Text>

              <Text style={styles.statLabel}>
                Absent
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.secondaryText}
          />
        </TouchableOpacity>

        {/* QUICK ACCESS */}
        <Text style={styles.sectionTitle}>
          Quick Access
        </Text>

        <View style={styles.quickGrid}>
          {[
            [
              'Bible',
              'book-outline',
              theme.quickBible,
            ],
            [
              'Events',
              'calendar-outline',
              theme.quickEvents,
            ],
            [
              'Journal',
              'journal-outline',
              theme.quickJournal,
            ],
            [
              'Attendance',
              'clipboard-outline',
              theme.quickAttendance,
            ],
          ].map(([label, icon, color]) => (
            <TouchableOpacity
              key={label}
              style={styles.quickCard}
              onPress={() =>
                navigation?.navigate?.(label)
              }
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.quickIcon,
                  {
                    backgroundColor: `${color}22`,
                  },
                ]}
              >
                <Ionicons
                  name={icon}
                  size={23}
                  color={color}
                />
              </View>

              <Text style={styles.quickText}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footerText}>
          Your faith. Your community. Your connection.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 24,
    },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },

    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    menuButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    logo: {
      color: theme.primaryText,
      fontSize: 21,
      fontWeight: '900',
      letterSpacing: 1.2,
    },

    smallLabel: {
      color: theme.accent,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginTop: 2,
    },

    topActions: {
      flexDirection: 'row',
      gap: 8,
    },

    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },

    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 22,
    },

    avatar: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    avatarText: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight: '800',
    },

    greeting: {
      color: theme.primaryText,
      fontSize: 18,
      fontWeight: '800',
    },

    subGreeting: {
      color: theme.secondaryText,
      fontSize: 12,
      marginTop: 3,
    },

    sectionTitle: {
      color: theme.primaryText,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 10,
      marginTop: 2,
    },

    verseCard: {
      height: 255,
      overflow: 'hidden',
      borderRadius: 20,
      marginBottom: 22,
      backgroundColor: theme.surface,
    },

    verseImage: {
      borderRadius: 20,
    },

    verseOverlay: {
      flex: 1,
      backgroundColor: theme.verseOverlay,
      padding: 19,
      justifyContent: 'space-between',
    },

    verseBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.verseBadge,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    verseBadgeText: {
      color: theme.verseBadgeText,
      fontSize: 10,
      fontWeight: '900',
    },

    verseText: {
      color: theme.verseText,
      fontSize: 19,
      lineHeight: 29,
      fontWeight: '700',
      marginTop: 8,
    },

    reference: {
      color: theme.verseReference,
      fontSize: 12,
      fontWeight: '700',
    },

    readButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: theme.readButton,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },

    readButtonText: {
      color: theme.readButtonText,
      fontSize: 12,
      fontWeight: '800',
    },

    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.surfaceBorder,
      borderRadius: 18,
      padding: 14,
      marginBottom: 22,
    },

    eventIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: `${theme.primary}22`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    cardMain: {
      flex: 1,
    },

    cardTitle: {
      color: theme.primaryText,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 4,
    },

    cardMeta: {
      color: theme.secondaryText,
      fontSize: 11,
      marginTop: 2,
    },

    attendanceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.surfaceBorder,
      borderRadius: 18,
      padding: 16,
      marginBottom: 22,
    },

    attendanceNumber: {
      color: theme.accent,
      fontSize: 26,
      fontWeight: '900',
    },

    attendanceLabel: {
      color: theme.secondaryText,
      fontSize: 10,
      marginTop: 2,
    },

    attendanceStats: {
      flexDirection: 'row',
      flex: 1,
      justifyContent: 'space-evenly',
      marginLeft: 8,
    },

    present: {
      color: theme.present,
      fontSize: 19,
      fontWeight: '900',
      textAlign: 'center',
    },

    absent: {
      color: theme.absent,
      fontSize: 19,
      fontWeight: '900',
      textAlign: 'center',
    },

    statLabel: {
      color: theme.secondaryText,
      fontSize: 9,
      textAlign: 'center',
      marginTop: 2,
    },

    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },

    quickCard: {
      width: '48.3%',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.surfaceBorder,
      borderRadius: 17,
      padding: 14,
      marginBottom: 10,
    },

    quickIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },

    quickText: {
      color: theme.primaryText,
      fontSize: 12,
      fontWeight: '800',
    },

    footerText: {
      color: theme.mutedText,
      textAlign: 'center',
      fontSize: 10,
      marginTop: 13,
    },
  });