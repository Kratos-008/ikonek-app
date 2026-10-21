import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'https://ikonek-app.onrender.com';

export default function NotificationsScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const background = colors?.bg || (isDarkMode ? '#0B1220' : '#F8FAFC');
  const foreground = colors?.text || (isDarkMode ? '#F8FAFC' : '#0F172A');
  const muted = isDarkMode ? '#94A3B8' : '#64748B';
  const card = isDarkMode ? '#111827' : '#FFFFFF';
  const border = isDarkMode ? '#263244' : '#E2E8F0';
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) {
        setItems([]);
        setUnreadCount(0);
        setError('Please sign in again to view your notifications.');
        return;
      }
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load notifications.');
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (e) {
      setError(e.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // A push that arrives while this screen is open appears in the list right away.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => loadNotifications(true));
    return () => subscription.remove();
  }, [loadNotifications]);

  const markRead = useCallback(async (item) => {
    if (item.readAt) return;
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      const response = await fetch(`${API_URL}/api/notifications/${encodeURIComponent(item.id)}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Could not mark notification as read.');
      const readAt = new Date().toISOString();
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, readAt } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { setError(e.message); }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Could not mark notifications as read.');
      const now = new Date().toISOString();
      setItems(prev => prev.map(n => n.readAt ? n : { ...n, readAt: now }));
      setUnreadCount(0);
    } catch (e) { setError(e.message); }
  }, []);

  const filtered = useMemo(() => items.filter(n =>
    filter === 'UNREAD' ? !n.readAt : filter === 'READ' ? !!n.readAt : true
  ), [items, filter]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => markRead(item)}
      style={[styles.item, { backgroundColor: card, borderColor: border }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.readAt ? ', read' : ', unread'}`}
    >
      <View style={[styles.itemIcon, { backgroundColor: item.readAt ? (isDarkMode ? '#1E293B' : '#F1F5F9') : '#DBEAFE' }]}>
        <Ionicons name={item.type === 'BIRTHDAY' ? 'gift-outline' : item.type === 'EVENT' ? 'calendar-outline' : item.type === 'ANNOUNCEMENT' ? 'megaphone-outline' : item.type.startsWith('EVENT') ? 'calendar-outline' : item.type === 'ATTENDANCE_REMINDER' || item.type === 'ATTENDANCE_UPDATED' ? 'checkmark-circle-outline' : item.type.startsWith('PRAYER') || item.type.startsWith('JOURNAL') ? 'heart-outline' : item.type === 'ACCOUNT_LINKED' ? 'sparkles-outline' : 'notifications-outline'} size={21} color={item.readAt ? muted : '#2563EB'} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: foreground }]}>{item.title}</Text>
        <Text style={[styles.itemMessage, { color: muted }]}>{item.message}</Text>
        <Text style={[styles.date, { color: muted }]}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
      </View>
      {!item.readAt && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={foreground} />
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: foreground }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: muted }]}>{unreadCount} unread</Text>
        </View>
        <TouchableOpacity onPress={markAllRead} disabled={unreadCount === 0} style={styles.readAll}>
          <Text style={{ color: unreadCount ? '#2563EB' : muted, fontSize: 12, fontWeight: '600' }}>Read all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filters}>
        {['ALL', 'UNREAD', 'READ'].map(value => (
          <TouchableOpacity key={value} onPress={() => setFilter(value)} style={[styles.filter, { backgroundColor: filter === value ? '#2563EB' : card, borderColor: border }]}>
            <Text style={{ color: filter === value ? '#FFFFFF' : foreground, fontWeight: '600', fontSize: 12 }}>{value === 'ALL' ? 'All' : value === 'UNREAD' ? 'Unread' : 'Read'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {loading ? <View style={styles.center}><ActivityIndicator color="#2563EB" /><Text style={{ color: muted, marginTop: 10 }}>Loading notifications…</Text></View> :
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} />}
          ListEmptyComponent={<View style={styles.center}><Ionicons name="notifications-off-outline" size={38} color={muted} /><Text style={[styles.emptyTitle, { color: foreground }]}>{error ? 'Notifications unavailable' : 'No notifications yet'}</Text><Text style={[styles.emptyText, { color: muted }]}>{filter === 'UNREAD' ? 'You have no unread notifications.' : filter === 'READ' ? 'You have no read notifications.' : 'New announcements and reminders will appear here.'}</Text></View>}
        />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  readAll: { padding: 8 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 },
  filter: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  item: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  itemIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  itemMessage: { fontSize: 13, lineHeight: 19 },
  date: { fontSize: 11, marginTop: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB', marginTop: 5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  error: { color: '#E11D48', fontSize: 12, marginBottom: 8 },
});
