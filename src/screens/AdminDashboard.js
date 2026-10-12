import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'https://ikonek-app.onrender.com';

export function AdminDashboard({
  user,
  onLogout,
  usersList,
  setUsersList,
  onNavigate,
}) {
  const [tab, setTab] = useState('management');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);

  const sendAnnouncement = async () => {
    const title = announcementTitle.trim();
    const message = announcementMessage.trim();
    if (!title || !message) { Alert.alert('Missing details', 'Enter both an announcement title and message.'); return; }
    setAnnouncementSending(true);
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      const response = await fetch(`${API_URL}/api/notifications/announcements`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title, message }) });
      const rawResponse = await response.text();

console.log("HTTP Status:", response.status);
console.log("Response URL:", response.url);
console.log("Response Body:", rawResponse);

let data;

try {
  data = JSON.parse(rawResponse);
} catch (error) {
  console.error("JSON Parse Error:", error);
  throw new Error(
    `Server returned invalid JSON (HTTP ${response.status}). Check the console output.`
  );
}
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to send announcement.');
      setAnnouncementTitle(''); setAnnouncementMessage('');
      Alert.alert('Announcement sent', data.message || 'Your announcement has been sent.');
    } catch (error) { Alert.alert('Could not send', error.message || 'Please try again.'); }
    finally { setAnnouncementSending(false); }
  };

  const totalUsers = usersList?.length || 0;

  const { colors, isDarkMode } = useTheme();
  const primary = isDarkMode ? '#38BDF8' : '#0284C7';
  const styles = createStyles(colors, primary, isDarkMode);


  const [modalVisible, setModalVisible] = useState(false);
  const [addingRole, setAddingRole] = useState('');

  // ==========================================
  // YOUTH PERSONAL DATA FORM STATE
  // ==========================================

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Male');
  const [address, setAddress] = useState('');
  const [cellLeader, setCellLeader] = useState('');
  const [statusCategory, setStatusCategory] = useState('Newbie');
  const [accountRole, setAccountRole] = useState('YOUTH');
  const [youthProfiles, setYouthProfiles] = useState([]);
  const [youthLoading, setYouthLoading] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [codeActionId, setCodeActionId] = useState(null);

  // ==========================================
  // GENERIC USER FORM STATE
  // ==========================================

  const [genericName, setGenericName] = useState('');
  const [genericPassword, setGenericPassword] = useState('');

  // ==========================================
  // DIRECTORY FILTER STATE
  // ==========================================

  const [directoryFilter, setDirectoryFilter] = useState('All');
  const [directorySearch, setDirectorySearch] = useState('');

  // ==========================================
  // PRAYER REQUEST STATE
  // ==========================================

  const [prayerRequests, setPrayerRequests] = useState([]);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerUpdatingId, setPrayerUpdatingId] = useState(null);

  // ==========================================
  // OPEN ADD MODAL
  // ==========================================

  const openAddModal = (role) => {
    setAddingRole(role);

    setFullName('');
    setAge('');
    setSex('Male');
    setAddress('');
    setCellLeader('');
    setStatusCategory('Newbie');
    setAccountRole(role === 'leader' ? 'LEADER' : 'YOUTH');

    setGenericName('');
    setGenericPassword('');

    setModalVisible(true);
  };

  // ==========================================
  // MEMBER API / SAVE USER DATA
  // ==========================================

  const loadYouthProfiles = useCallback(async () => {
    try {
      setYouthLoading(true);
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) throw new Error('Session expired. Please sign in again.');

      const response = await fetch(`${API_URL}/api/youth`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not load members.');

      setYouthProfiles((data.youth || []).map((member) => ({
        ...member,
        sex: member.gender || '',
        role: 'youth',
      })));
    } catch (error) {
      console.error('Load youth profiles error:', error);
      Alert.alert('Unable to Load Members', error.message || 'Please try again.');
    } finally {
      setYouthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadYouthProfiles();
  }, [loadYouthProfiles]);

  const showRegistrationCode = async (registrationCode, memberName) => {
    Alert.alert(
      'Member Linking Code',
      `Member: ${memberName}\n\n${registrationCode}\n\nGive this code directly to the intended member. It can only be used once.`,
      [
        { text: 'Done', style: 'cancel' },
        {
          text: 'Share / Copy Code',
          onPress: async () => {
            try {
              await Share.share({
                message: `iKonek member linking code for ${memberName}: ${registrationCode}\nEnter this code during iKonek registration.`,
              });
            } catch (error) {
              console.error('Share linking code error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (addingRole === 'youth' || addingRole === 'leader') {
      if (!fullName.trim() || !age.trim()) {
        Alert.alert('Missing Information', "Please enter the member's full name and age.");
        return;
      }

      const numericAge = Number(age);
      if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
        Alert.alert('Invalid Age', 'Please enter an age between 1 and 120.');
        return;
      }

      try {
        setSavingMember(true);
        const token = await AsyncStorage.getItem('@ikonek_token');
        if (!token) throw new Error('Session expired. Please sign in again.');

        const response = await fetch(`${API_URL}/api/youth`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            name: fullName.trim(),
            age: numericAge,
            gender: sex,
            address: address.trim() || null,
            cellLeader: cellLeader.trim() || null,
            category: statusCategory,
            accountRole: addingRole === 'leader' ? 'LEADER' : accountRole,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create member.');

        const member = {
          ...data.youth,
          sex: data.youth?.gender || sex,
          role: 'youth',
        };
        setYouthProfiles((current) => [member, ...current]);
        setModalVisible(false);
        setFullName('');
        setAge('');
        setAddress('');
        setCellLeader('');

        if (data.registrationCode) {
          showRegistrationCode(data.registrationCode, data.youth?.name || fullName.trim());
        } else {
          Alert.alert('Member Added', `${fullName.trim()} was added successfully.`);
        }
      } catch (error) {
        console.error('Create member error:', error);
        Alert.alert('Unable to Add Member', error.message || 'Please try again.');
      } finally {
        setSavingMember(false);
      }
      return;
    }

    // Keep the existing admin-account form behavior separate from member records.
    if (!genericName.trim()) {
      Alert.alert('Missing Information', 'Please enter a name.');
      return;
    }
    const newAccount = {
      id: Date.now().toString(),
      name: genericName.trim(),
      password: genericPassword || '123456',
      role: addingRole,
    };
    if (typeof setUsersList === 'function') setUsersList((current = []) => [...current, newAccount]);
    Alert.alert('Notice', 'This form does not create a backend login account. Use the normal registration flow for account creation.');
    setModalVisible(false);
  };

  const issueRegistrationCode = async (member) => {
    try {
      setCodeActionId(member.id);
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) throw new Error('Session expired. Please sign in again.');
      const response = await fetch(`${API_URL}/api/youth/${member.id}/registration-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not issue a linking code.');
      if (data.registrationCode) showRegistrationCode(data.registrationCode, member.name);
    } catch (error) {
      Alert.alert('Unable to Issue Code', error.message || 'Please try again.');
    } finally {
      setCodeActionId(null);
    }
  };

  const updateMemberRole = async (member) => {
    const nextRole = member.accountRole === 'LEADER' ? 'YOUTH' : 'LEADER';
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) throw new Error('Session expired. Please sign in again.');
      const response = await fetch(`${API_URL}/api/youth/${member.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ accountRole: nextRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not update member role.');
      setYouthProfiles((current) => current.map((item) => item.id === member.id ? { ...item, accountRole: nextRole } : item));
      Alert.alert('Role Updated', `${member.name} is now marked as ${nextRole === 'LEADER' ? 'Leader' : 'Youth'}.`);
    } catch (error) {
      Alert.alert('Unable to Update Role', error.message || 'Please try again.');
    }
  };

  // ==========================================
  // YOUTH DIRECTORY
  // ==========================================

  const youthList = youthProfiles;

  const filteredYouth = youthList.filter((item) => {
    const category = String(item.category || '').trim();
    if (directoryFilter !== 'All' && category !== directoryFilter) {
      return false;
    }

    const query = directorySearch.trim().toLowerCase();
    if (!query) return true;

    const searchable = [
      item.name,
      item.age,
      item.address,
      item.cellLeader,
      item.category,
      item.accountRole,
    ].map((value) => String(value || '')).join(' ').toLowerCase();

    return searchable.includes(query);
  });

  // ==========================================
  // LOAD PRAYER REQUESTS
  // ==========================================

  const loadPrayerRequests = useCallback(async () => {
    try {
      setPrayerLoading(true);

      const token = await AsyncStorage.getItem('@ikonek_token');

      if (!token) {
        Alert.alert(
          'Session Expired',
          'Please sign in again.'
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/api/prayer`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to load prayer requests'
        );
      }

      setPrayerRequests(data.prayerRequests || []);
    } catch (error) {
      console.error(
        'Load prayer requests error:',
        error
      );

      Alert.alert(
        'Unable to Load',
        error.message ||
          'Could not load prayer requests.'
      );
    } finally {
      setPrayerLoading(false);
    }
  }, []);

  // ==========================================
  // LOAD PRAYERS WHEN TAB IS OPENED
  // ==========================================

  useEffect(() => {
    if (tab === 'prayer') {
      loadPrayerRequests();
    }
  }, [tab, loadPrayerRequests]);

  // ==========================================
  // UPDATE PRAYER STATUS
  // ==========================================

  const updatePrayerStatus = async (
    requestId,
    newStatus
  ) => {
    try {
      setPrayerUpdatingId(requestId);

      const token = await AsyncStorage.getItem(
        '@ikonek_token'
      );

      if (!token) {
        Alert.alert(
          'Session Expired',
          'Please sign in again.'
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/api/prayer/${requestId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to update prayer request'
        );
      }

      setPrayerRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: newStatus,
              }
            : request
        )
      );

      Alert.alert(
        'Success',
        newStatus === 'ANSWERED'
          ? 'Prayer request marked as answered.'
          : 'Prayer request marked as pending.'
      );
    } catch (error) {
      console.error(
        'Update prayer status error:',
        error
      );

      Alert.alert(
        'Update Failed',
        error.message ||
          'Could not update the prayer request.'
      );
    } finally {
      setPrayerUpdatingId(null);
    }
  };

  // ==========================================
  // CONFIRM STATUS CHANGE
  // ==========================================

  const confirmStatusChange = (
    request,
    newStatus
  ) => {
    const requesterName =
      request.user?.name || 'Unknown user';

    if (newStatus === 'ANSWERED') {
      Alert.alert(
        'Mark as Answered',
        `Mark ${requesterName}'s prayer request as answered?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Yes, Mark Answered',
            onPress: () =>
              updatePrayerStatus(
                request.id,
                'ANSWERED'
              ),
          },
        ]
      );
    } else {
      Alert.alert(
        'Mark as Pending',
        `Move ${requesterName}'s prayer request back to pending?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Yes',
            onPress: () =>
              updatePrayerStatus(
                request.id,
                'PENDING'
              ),
          },
        ]
      );
    }
  };

  // ==========================================
  // DELETE PRAYER REQUEST
  // ==========================================

  const deletePrayerRequest = (request) => {
    const requesterName =
      request.user?.name || 'Unknown user';

    Alert.alert(
      'Delete Prayer Request',
      `Are you sure you want to permanently delete the prayer request from ${requesterName}?`,
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
              setPrayerUpdatingId(request.id);

              const token =
                await AsyncStorage.getItem(
                  '@ikonek_token'
                );

              if (!token) {
                Alert.alert(
                  'Session Expired',
                  'Please sign in again.'
                );
                return;
              }

              const response = await fetch(
                `${API_URL}/api/prayer/${request.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.message ||
                    'Failed to delete prayer request'
                );
              }

              setPrayerRequests(
                (currentRequests) =>
                  currentRequests.filter(
                    (item) =>
                      item.id !== request.id
                  )
              );

              Alert.alert(
                'Deleted',
                'Prayer request has been deleted successfully.'
              );
            } catch (error) {
              console.error(
                'Delete prayer request error:',
                error
              );

              Alert.alert(
                'Delete Failed',
                error.message ||
                  'Could not delete the prayer request.'
              );
            } finally {
              setPrayerUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Unknown date';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return date.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }
    );
  };

  // ==========================================
  // RENDER PRAYER REQUESTS
  // ==========================================

  const renderPrayerRequests = () => {
    console.log('PRAYER TAB RENDERING:', prayerRequests);
    if (prayerLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="primary"
          />

          <Text style={styles.loadingText}>
            Loading prayer requests...
          </Text>
        </View>
      );
    }

    if (prayerRequests.length === 0) {
      return (
        <View style={styles.emptyPrayerCard}>
          <Text style={styles.emptyPrayerIcon}>
            🙏
          </Text>

          <Text style={styles.emptyPrayerTitle}>
            No Prayer Requests
          </Text>

          <Text style={styles.emptyPrayerText}>
            There are currently no prayer requests.
          </Text>
        </View>
      );
    }

    return prayerRequests.map((request) => {
      const isAnswered =
        request.status === 'ANSWERED';

      const isUpdating =
        prayerUpdatingId === request.id;

      return (
        <View
          key={request.id}
          style={styles.prayerCard}
        >
          {/* =====================================
              REQUESTER
          ====================================== */}

          <View style={styles.prayerRequesterHeader}>
            <View style={styles.requesterInfo}>
              <Text style={styles.requesterName}>
                👤{' '}
                {request.user?.name ||
                  'Unknown User'}
              </Text>

              <Text style={styles.requesterEmail}>
                {request.user?.email ||
                  'No email available'}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                isAnswered
                  ? styles.answeredBadge
                  : styles.pendingBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isAnswered
                    ? styles.answeredStatusText
                    : styles.pendingStatusText,
                ]}
              >
                {isAnswered
                  ? '✓ Answered'
                  : '⏳ Pending'}
              </Text>
            </View>
          </View>

          {/* =====================================
              DATE
          ====================================== */}

          <Text style={styles.prayerDate}>
            Submitted:{' '}
            {formatDate(request.createdAt)}
          </Text>

          {/* =====================================
              PRAYER CONTENT
          ====================================== */}

          <View style={styles.prayerContentBox}>
            <Text style={styles.prayerContent}>
              {request.content}
            </Text>
          </View>

          {/* =====================================
              ADMIN ACTIONS
          ====================================== */}

          <View style={styles.prayerActions}>
            {/* STATUS BUTTON */}

            {isAnswered ? (
              <TouchableOpacity
                style={[
                  styles.pendingButton,
                  isUpdating &&
                    styles.disabledButton,
                ]}
                disabled={isUpdating}
                activeOpacity={0.8}
                onPress={() =>
                  confirmStatusChange(
                    request,
                    'PENDING'
                  )
                }
              >
                {isUpdating ? (
                  <ActivityIndicator
                    color="'#FFFFFF'FFF"
                  />
                ) : (
                  <Text
                    style={styles.actionButtonText}
                  >
                    ↩ Mark Pending
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.answeredButton,
                  isUpdating &&
                    styles.disabledButton,
                ]}
                disabled={isUpdating}
                activeOpacity={0.8}
                onPress={() =>
                  confirmStatusChange(
                    request,
                    'ANSWERED'
                  )
                }
              >
                {isUpdating ? (
                  <ActivityIndicator
                    color="'#FFFFFF'FFF"
                  />
                ) : (
                  <Text
                    style={styles.actionButtonText}
                  >
                    ✓ Mark as Answered
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* DELETE BUTTON */}

            <TouchableOpacity
              style={[
                styles.deleteButton,
                isUpdating &&
                  styles.disabledButton,
              ]}
              disabled={isUpdating}
              activeOpacity={0.8}
              onPress={() =>
                deletePrayerRequest(request)
              }
            >
              <Text
                style={styles.deleteButtonText}
              >
                🗑 Delete Prayer Request
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  };

  // ==========================================
  // MAIN SCREEN
  // ==========================================

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      {/* =====================================
          BACK BUTTON
      ====================================== */}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={onLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.backBtnText}>
          ⬅️ Back to Sign In
        </Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        Admin Dashboard 🛡️
      </Text>

      <Text style={styles.sub}>
        Logged in as: {user?.name} ({user?.role})
      </Text>

      <View style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors?.border || '#CBD5E1', backgroundColor: colors?.card || (isDarkMode ? '#111827' : '#FFFFFF') }}>
        <Text style={{ color: colors?.text || (isDarkMode ? '#F8FAFC' : '#0F172A'), fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Church Announcement</Text>
        <Text style={{ color: colors?.muted || (isDarkMode ? '#94A3B8' : '#64748B'), marginBottom: 10 }}>Send a message to all linked youth and leader accounts.</Text>
        <TextInput value={announcementTitle} onChangeText={setAnnouncementTitle} placeholder="Announcement title" placeholderTextColor={isDarkMode ? '#94A3B8' : '#64748B'} style={{ color: colors?.text || (isDarkMode ? '#F8FAFC' : '#0F172A'), borderWidth: 1, borderColor: colors?.border || '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 8 }} />
        <TextInput value={announcementMessage} onChangeText={setAnnouncementMessage} placeholder="Write the church announcement..." placeholderTextColor={isDarkMode ? '#94A3B8' : '#64748B'} multiline textAlignVertical="top" style={{ color: colors?.text || (isDarkMode ? '#F8FAFC' : '#0F172A'), minHeight: 76, borderWidth: 1, borderColor: colors?.border || '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10 }} />
        <TouchableOpacity disabled={announcementSending} onPress={sendAnnouncement} style={{ backgroundColor: announcementSending ? '#64748B' : primary, padding: 11, borderRadius: 8, alignItems: 'center' }}>
          {announcementSending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Send Announcement</Text>}
        </TouchableOpacity>
      </View>

      {/* =====================================
          NAVIGATION TABS
      ====================================== */}

      <View style={styles.tabContainer}>
        {/* MANAGEMENT */}

        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === 'management' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setTab('management')
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              tab === 'management'
                ? styles.tabTextActive
                : styles.tabText
            }
          >
            Management
          </Text>
        </TouchableOpacity>

        {/* YOUTH DIRECTORY */}

        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === 'directory' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setTab('directory')
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              tab === 'directory'
                ? styles.tabTextActive
                : styles.tabText
            }
          >
            Youth Directory
          </Text>
        </TouchableOpacity>

        {/* PRAYER */}

        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === 'prayer' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setTab('prayer')
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              tab === 'prayer'
                ? styles.tabTextActive
                : styles.tabText
            }
          >
            🙏 Prayer
          </Text>
        </TouchableOpacity>
      </View>

      {/* =====================================
          MANAGEMENT TAB
      ====================================== */}

      {tab === 'management' ? (
        <ScrollView
          contentContainerStyle={styles.content}
        >
          <Text style={styles.sectionTitle}>
            ⚙️ Admin Actions
          </Text>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              openAddModal('youth')
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>
              ➕ Add Youth Data
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              openAddModal('leader')
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>
              ➕ Add Youth Leaders
            </Text>
          </TouchableOpacity>

          {user?.role === 'superadmin' && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.outlineBtn,
              ]}
              onPress={() =>
                openAddModal('admin')
              }
              activeOpacity={0.8}
            >
              <Text
                style={styles.outlineBtnText}
              >
                🔑 Manage Admin Accounts
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.youthViewButton,
            ]}
            onPress={() =>
              onNavigate('youthDashboard')
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>
              👁️ Switch to Youth View
            </Text>
          </TouchableOpacity>

          <View style={styles.logoutContainer}>
            <Button
              title="Logout"
              onPress={onLogout}
              type="secondary"
            />
          </View>
        </ScrollView>
      ) : tab === 'directory' ? (
        /* =====================================
           YOUTH DIRECTORY TAB
        ====================================== */

        <ScrollView
          contentContainerStyle={styles.content}
        >
          <Text style={styles.sectionTitle}>
            📋 Youth Directory ({youthList.length})
          </Text>
          <TouchableOpacity style={styles.actionBtn} onPress={loadYouthProfiles} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>{youthLoading ? 'Loading members…' : '↻ Refresh Members'}</Text>
          </TouchableOpacity>

          {/* ONE SEARCH FIELD FOR ALL MEMBERS */}

          <TextInput
            value={directorySearch}
            onChangeText={setDirectorySearch}
            placeholder="Search all members by name or details..."
            placeholderTextColor={colors.muted}
            style={styles.directorySearchInput}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search all youth directory members"
          />

          {/* FILTERS */}

          <View style={styles.filterRow}>
            {[
              'All',
              'Newbie',
              'Regular',
            ].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  directoryFilter === filter &&
                    styles.filterChipActive,
                ]}
                onPress={() =>
                  setDirectoryFilter(filter)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={
                    directoryFilter === filter
                      ? styles.filterTextActive
                      : styles.filterText
                  }
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredYouth.length === 0 ? (
            <Text style={styles.emptyText}>
              Records not found for{' '}
              {directoryFilter}.
            </Text>
          ) : (
            filteredYouth.map((item) => (
              <View
                key={item.id}
                style={styles.userCard}
              >
                <View
                  style={styles.cardHeader}
                >
                  <Text
                    style={styles.userName}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={[
                      styles.badge,
                      item.category ===
                        'Newbie'
                        ? styles.badgeNewbie
                        : styles.badgeRegular,
                    ]}
                  >
                    {item.category ||
                      'Youth'}
                  </Text>
                </View>

                <Text
                  style={styles.userDetail}
                >
                  Age: {item.age} | Sex:{' '}
                  {item.sex}
                </Text>

                <Text
                  style={styles.userDetail}
                >
                  Address:{' '}
                  {item.address || 'N/A'}
                </Text>

                <Text style={styles.userDetail}>Cell Leader: {item.cellLeader || 'N/A'}</Text>
                <Text style={styles.userDetail}>Approved role: {item.accountRole === 'LEADER' ? 'Leader' : 'Youth'}</Text>
                <View style={styles.memberActionRow}>
                  <TouchableOpacity style={styles.memberActionButton} onPress={() => updateMemberRole(item)} activeOpacity={0.8}>
                    <Text style={styles.memberActionText}>{item.accountRole === 'LEADER' ? 'Set as Youth' : 'Set as Leader'}</Text>
                  </TouchableOpacity>
                  {!item.userId && (
                    <TouchableOpacity style={styles.memberActionButton} onPress={() => issueRegistrationCode(item)} disabled={codeActionId === item.id} activeOpacity={0.8}>
                      <Text style={styles.memberActionText}>{codeActionId === item.id ? 'Generating…' : 'Get Linking Code'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.userDetail}>{item.userId ? 'Account linked' : 'No account linked yet'}</Text>
              </View>
            ))
          )}

          <View style={styles.logoutContainer}>
            <Button
              title="Logout"
              onPress={onLogout}
              type="secondary"
            />
          </View>
        </ScrollView>
      ) : (
        /* =====================================
           PRAYER REQUESTS TAB
        ====================================== */

        <ScrollView
          contentContainerStyle={
            styles.prayerContentContainer
          }
        >
          <View style={styles.prayerHeaderRow}>
            <View style={styles.prayerHeaderInfo}>
              <Text
                style={styles.sectionTitle}
              >
                🙏 Prayer Requests
              </Text>

              <Text
                style={styles.prayerCount}
              >
                {prayerRequests.length}{' '}
                request
                {prayerRequests.length !== 1
                  ? 's'
                  : ''}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadPrayerRequests}
              disabled={prayerLoading}
              activeOpacity={0.8}
            >
              {prayerLoading ? (
                <ActivityIndicator
                  color="primary"
                  size="small"
                />
              ) : (
                <Text
                  style={styles.refreshText}
                >
                  ↻ Refresh
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {renderPrayerRequests()}

          <View style={styles.logoutContainer}>
            <Button
              title="Logout"
              onPress={onLogout}
              type="secondary"
            />
          </View>
        </ScrollView>
      )}

      {/* =====================================
          ADD USER MODAL
      ====================================== */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={
              styles.modalScroll
            }
          >
            <View
              style={styles.modalContainer}
            >
              <Text
                style={styles.modalTitle}
              >
                {addingRole === 'youth'
                  ? '📝 Add Youth Data'
                  : addingRole === 'leader' ? '🧑‍🏫 Add Youth Leader' : `Add New ${addingRole.toUpperCase()}`}
              </Text>

              {addingRole === 'youth' || addingRole === 'leader' ? (
                <>
                  <Text
                    style={styles.inputLabel}
                  >
                    Full Name
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Juan Dela Cruz"
                    placeholderTextColor="colors.muted"
                    value={fullName}
                    onChangeText={
                      setFullName
                    }
                  />

                  <View
                    style={styles.formRow}
                  >
                    <View
                      style={styles.formColumn}
                    >
                      <Text
                        style={
                          styles.inputLabel
                        }
                      >
                        Age
                      </Text>

                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 18"
                        placeholderTextColor="colors.muted"
                        keyboardType="numeric"
                        value={age}
                        onChangeText={
                          setAge
                        }
                      />
                    </View>

                    <View
                      style={styles.formColumn}
                    >
                      <Text
                        style={
                          styles.inputLabel
                        }
                      >
                        Sex
                      </Text>

                      <View
                        style={
                          styles.sexRow
                        }
                      >
                        <TouchableOpacity
                          style={[
                            styles.sexBtn,
                            sex ===
                              'Male' &&
                              styles.sexBtnActive,
                          ]}
                          onPress={() =>
                            setSex('Male')
                          }
                        >
                          <Text
                            style={
                              sex ===
                              'Male'
                                ? styles.sexTextActive
                                : styles.sexText
                            }
                          >
                            Male
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.sexBtn,
                            sex ===
                              'Female' &&
                              styles.sexBtnActive,
                          ]}
                          onPress={() =>
                            setSex(
                              'Female'
                            )
                          }
                        >
                          <Text
                            style={
                              sex ===
                              'Female'
                                ? styles.sexTextActive
                                : styles.sexText
                            }
                          >
                            Female
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <Text
                    style={styles.inputLabel}
                  >
                    Address
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter complete address"
                    placeholderTextColor="colors.muted"
                    value={address}
                    onChangeText={
                      setAddress
                    }
                  />

                  <Text
                    style={styles.inputLabel}
                  >
                    Cell Leader
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Name of Cell Leader"
                    placeholderTextColor="colors.muted"
                    value={cellLeader}
                    onChangeText={
                      setCellLeader
                    }
                  />

                  {addingRole !== 'leader' && <Text style={styles.inputLabel}>Account Role (approved by Admin)</Text>}
                  {addingRole !== 'leader' && <View style={styles.categoryRow}>
                    <TouchableOpacity
                      style={[styles.catBtn, accountRole === 'YOUTH' && styles.catBtnRegularActive]}
                      onPress={() => setAccountRole('YOUTH')}
                    >
                      <Text style={accountRole === 'YOUTH' ? styles.catTextActive : styles.catText}>Youth</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.catBtn, accountRole === 'LEADER' && styles.catBtnRegularActive]}
                      onPress={() => setAccountRole('LEADER')}
                    >
                      <Text style={accountRole === 'LEADER' ? styles.catTextActive : styles.catText}>Leader</Text>
                    </TouchableOpacity>
                  </View>}

                  <Text
                    style={styles.inputLabel}
                  >
                    Category
                  </Text>

                  <View
                    style={
                      styles.categoryRow
                    }
                  >
                    <TouchableOpacity
                      style={[
                        styles.catBtn,
                        statusCategory ===
                          'Newbie' &&
                          styles.catBtnNewbieActive,
                      ]}
                      onPress={() =>
                        setStatusCategory(
                          'Newbie'
                        )
                      }
                    >
                      <Text
                        style={
                          statusCategory ===
                          'Newbie'
                            ? styles.catTextActive
                            : styles.catText
                        }
                      >
                        🌱 Newbie
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.catBtn,
                        statusCategory ===
                          'Regular' &&
                          styles.catBtnRegularActive,
                      ]}
                      onPress={() =>
                        setStatusCategory(
                          'Regular'
                        )
                      }
                    >
                      <Text
                        style={
                          statusCategory ===
                          'Regular'
                            ? styles.catTextActive
                            : styles.catText
                        }
                      >
                        ⭐ Regular
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text
                    style={styles.inputLabel}
                  >
                    Full Name
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="colors.muted"
                    value={genericName}
                    onChangeText={
                      setGenericName
                    }
                  />

                  <Text
                    style={styles.inputLabel}
                  >
                    Password
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Password (Default: 123456)"
                    placeholderTextColor="colors.muted"
                    secureTextEntry
                    value={genericPassword}
                    onChangeText={
                      setGenericPassword
                    }
                  />
                </>
              )}

              <View
                style={styles.modalButtons}
              >
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={savingMember}
                  activeOpacity={0.8}
                >
                  <Text
                    style={styles.btnText}
                  >
                    {savingMember ? 'Saving…' : 'Save Data'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() =>
                    setModalVisible(false)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={styles.btnText}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      </SafeAreaView>
    </Screen>
  );
}

// =====================================================
// STYLES
// =====================================================

const createStyles = (colors, primary, isDarkMode) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // ==========================================
  // GENERAL
  // ==========================================

  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
  },

  backBtnText: {
    color: primary,
    fontWeight: 'bold',
    fontSize: 14,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },

  sub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 15,
  },

  // ==========================================
  // TABS
  // ==========================================

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: (isDarkMode ? '#1E293B' : '#F1F5F9'),
    borderRadius: 10,
    padding: 4,
    marginBottom: 15,
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },

  tabActive: {
    backgroundColor: primary,
  },

  tabText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },

  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },

  content: {
    gap: 10,
    paddingBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },

  // ==========================================
  // MANAGEMENT
  // ==========================================

  actionBtn: {
    backgroundColor: primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },

  outlineBtn: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: primary,
    marginTop: 10,
  },

  outlineBtnText: {
    color: primary,
    fontWeight: 'bold',
    fontSize: 15,
  },

  youthViewButton: {
    backgroundColor: '#10B981',
    marginTop: 10,
  },

  logoutContainer: {
    marginTop: 15,
  },

  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 20,
  },

  // ==========================================
  // DIRECTORY
  // ==========================================

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  filterChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: (isDarkMode ? '#1E293B' : '#F1F5F9'),
    borderRadius: 20,
    alignItems: 'center',
  },

  filterChipActive: {
    backgroundColor: (isDarkMode ? '#334155' : '#1E293B'),
  },

  filterText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },

  filterTextActive: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  userCard: {
    backgroundColor: (isDarkMode ? '#0F172A' : '#F8FAFC'),
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: (isDarkMode ? '#334155' : '#1E293B'),
    flex: 1,
  },

  userDetail: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },

  badge: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },

  badgeNewbie: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },

  badgeRegular: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },

  // ==========================================
  // PRAYER REQUESTS
  // ==========================================

  prayerContentContainer: {
    paddingBottom: 25,
  },

  prayerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  prayerHeaderInfo: {
    flex: 1,
    paddingRight: 10,
  },

  prayerCount: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },

  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: (isDarkMode ? '#0F2A44' : '#EFF6FF'),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: (isDarkMode ? '#1E4D73' : '#BFDBFE'),
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshText: {
    color: primary,
    fontWeight: 'bold',
    fontSize: 13,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 14,
  },

  emptyPrayerCard: {
    backgroundColor: (isDarkMode ? '#0F172A' : '#F8FAFC'),
    borderRadius: 12,
    padding: 25,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  emptyPrayerIcon: {
    fontSize: 40,
    marginBottom: 10,
  },

  emptyPrayerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: (isDarkMode ? '#334155' : '#1E293B'),
    marginBottom: 6,
  },

  emptyPrayerText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  prayerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  prayerRequesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },

  requesterInfo: {
    flex: 1,
  },

  requesterName: {
    color: (isDarkMode ? '#334155' : '#1E293B'),
    fontSize: 16,
    fontWeight: 'bold',
  },

  requesterEmail: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },

  prayerDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 8,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },

  answeredBadge: {
    backgroundColor: '#DCFCE7',
  },

  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  pendingStatusText: {
    color: '#92400E',
  },

  answeredStatusText: {
    color: '#166534',
  },

  prayerContentBox: {
    backgroundColor: (isDarkMode ? '#0F172A' : '#F8FAFC'),
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: primary,
  },

  prayerContent: {
    color: (isDarkMode ? '#CBD5E1' : '#334155'),
    fontSize: 14,
    lineHeight: 21,
  },

  // ==========================================
  // PRAYER ACTIONS
  // ==========================================

  prayerActions: {
    marginTop: 12,
    gap: 8,
  },

  answeredButton: {
    width: '100%',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },

  pendingButton: {
    width: '100%',
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },

  deleteButton: {
    width: '100%',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#B91C1C',
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },

  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },

  disabledButton: {
    opacity: 0.6,
  },

  // ==========================================
  // MODAL
  // ==========================================

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },

  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  modalContainer: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    gap: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 5,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: (isDarkMode ? '#0F172A' : '#F8FAFC'),
    color: (isDarkMode ? '#334155' : '#1E293B'),
  },

  formRow: {
    flexDirection: 'row',
    gap: 10,
  },

  formColumn: {
    flex: 1,
  },

  sexRow: {
    flexDirection: 'row',
    gap: 5,
  },

  sexBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  sexBtnActive: {
    backgroundColor: primary,
    borderColor: primary,
  },

  sexText: {
    color: colors.muted,
    fontWeight: '600',
  },

  sexTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },

  catBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  catBtnNewbieActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },

  catBtnRegularActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },

  catText: {
    color: colors.muted,
    fontWeight: '600',
  },

  catTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  memberActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  memberActionButton: {
    borderWidth: 1,
    borderColor: colors.primary || primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  memberActionText: {
    color: primary,
    fontWeight: '600',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },

  saveBtn: {
    flex: 1,
    backgroundColor: primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: colors.muted,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
    directorySearchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      color: colors.text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 6,
      marginBottom: 4,
      fontSize: 14,
    },
});