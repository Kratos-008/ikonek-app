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
} from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://ikonek-app.onrender.com/api';

export function AdminDashboard({
  user,
  onLogout,
  usersList,
  setUsersList,
  onNavigate,
}) {
  const [tab, setTab] = useState('management');

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

  // ==========================================
  // GENERIC USER FORM STATE
  // ==========================================

  const [genericName, setGenericName] = useState('');
  const [genericPassword, setGenericPassword] = useState('');

  // ==========================================
  // DIRECTORY FILTER STATE
  // ==========================================

  const [directoryFilter, setDirectoryFilter] = useState('All');

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

    setGenericName('');
    setGenericPassword('');

    setModalVisible(true);
  };

  // ==========================================
  // SAVE USER DATA
  // ==========================================

  const handleSave = () => {
    if (addingRole === 'youth') {
      if (!fullName.trim() || !age.trim()) {
        Alert.alert(
          'Missing Information',
          'Pakilagay ang Complete Name at Age!'
        );
        return;
      }

      const newYouthData = {
        id: Date.now().toString(),
        name: fullName,
        age: age,
        sex: sex,
        address: address,
        cellLeader: cellLeader,
        category: statusCategory,
        role: 'youth',
        createdAt: new Date().toLocaleDateString(),
      };

      setUsersList([...usersList, newYouthData]);

      Alert.alert(
        'Success',
        `Matagumpay na naidagdag si ${fullName} bilang ${statusCategory}!`
      );
    } else {
      if (!genericName.trim()) {
        Alert.alert(
          'Missing Information',
          'Pakilagay ang Pangalan!'
        );
        return;
      }

      const newAccount = {
        id: Date.now().toString(),
        name: genericName,
        password: genericPassword || '123456',
        role: addingRole,
      };

      setUsersList([...usersList, newAccount]);

      Alert.alert(
        'Success',
        `Matagumpay na naidagdag ang ${addingRole}: ${genericName}`
      );
    }

    setModalVisible(false);
  };

  // ==========================================
  // YOUTH DIRECTORY
  // ==========================================

  const youthList = usersList.filter(
    (item) => item.role === 'youth'
  );

  const filteredYouth = youthList.filter((item) => {
    if (directoryFilter === 'All') return true;

    return item.category === directoryFilter;
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
        `${API_URL}/prayer`,
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
        `${API_URL}/prayer/${requestId}`,
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
      `Delete the prayer request from ${requesterName}?`,
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
                `${API_URL}/prayer/${request.id}`,
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
                'Prayer request has been deleted.'
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
    if (!dateString) return 'Unknown date';

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
    if (prayerLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#2563EB"
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
          {/* Requester */}
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

            {/* Status */}
            <View
              style={[
                styles.statusBadge,
                isAnswered
                  ? styles.answeredBadge
                  : styles.pendingBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {isAnswered
                  ? '✓ Answered'
                  : '⏳ Pending'}
              </Text>
            </View>
          </View>

          {/* Date */}
          <Text style={styles.prayerDate}>
            Submitted:{' '}
            {formatDate(request.createdAt)}
          </Text>

          {/* Prayer Content */}
          <View style={styles.prayerContentBox}>
            <Text style={styles.prayerContent}>
              {request.content}
            </Text>
          </View>

          {/* Admin Actions */}
          <View style={styles.prayerActions}>
            {isAnswered ? (
              <TouchableOpacity
                style={[
                  styles.pendingButton,
                  isUpdating &&
                    styles.disabledButton,
                ]}
                disabled={isUpdating}
                onPress={() =>
                  confirmStatusChange(
                    request,
                    'PENDING'
                  )
                }
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionButtonText}>
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
                onPress={() =>
                  confirmStatusChange(
                    request,
                    'ANSWERED'
                  )
                }
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionButtonText}>
                    ✓ Mark as Answered
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.deleteButton,
                isUpdating &&
                  styles.disabledButton,
              ]}
              disabled={isUpdating}
              onPress={() =>
                deletePrayerRequest(request)
              }
            >
              <Text style={styles.actionButtonText}>
                🗑 Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  };

  return (
    <Screen>
      {/* =====================================
          BACK BUTTON
      ====================================== */}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={onLogout}
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

      {/* =====================================
          NAVIGATION TABS
      ====================================== */}

      <View style={styles.tabContainer}>
        {/* Management */}
        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === 'management' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setTab('management')
          }
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

        {/* Youth Directory */}
        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === 'directory' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setTab('directory')
          }
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

        {/* Prayer Requests */}
        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === 'prayer' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setTab('prayer')
          }
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
              {
                backgroundColor: '#10B981',
                marginTop: 10,
              },
            ]}
            onPress={() =>
              onNavigate('youthDashboard')
            }
          >
            <Text style={styles.actionBtnText}>
              👁️ Switch to Youth View
            </Text>
          </TouchableOpacity>

          <View style={{ marginTop: 15 }}>
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

          {/* Filters */}
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
              Walang nahanap na record para sa{' '}
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

                <Text
                  style={styles.userDetail}
                >
                  Cell Leader:{' '}
                  {item.cellLeader || 'N/A'}
                </Text>
              </View>
            ))
          )}

          <View style={{ marginTop: 15 }}>
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
            <View>
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
            >
              {prayerLoading ? (
                <ActivityIndicator
                  color="#2563EB"
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

          <View style={{ marginTop: 15 }}>
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
                  : `Add New ${addingRole.toUpperCase()}`}
              </Text>

              {addingRole === 'youth' ? (
                <>
                  <Text
                    style={styles.inputLabel}
                  >
                    Full Name
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Juan Dela Cruz"
                    value={fullName}
                    onChangeText={
                      setFullName
                    }
                  />

                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{ flex: 1 }}
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
                        keyboardType="numeric"
                        value={age}
                        onChangeText={
                          setAge
                        }
                      />
                    </View>

                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.inputLabel
                        }
                      >
                        Sex
                      </Text>

                      <View
                        style={{
                          flexDirection:
                            'row',
                          gap: 5,
                        }}
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
                    value={cellLeader}
                    onChangeText={
                      setCellLeader
                    }
                  />

                  <Text
                    style={styles.inputLabel}
                  >
                    Category
                  </Text>

                  <View
                    style={{
                      flexDirection:
                        'row',
                      gap: 10,
                    }}
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
                >
                  <Text
                    style={styles.btnText}
                  >
                    Save Data
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() =>
                    setModalVisible(false)
                  }
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
    </Screen>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  // ==========================================
  // GENERAL
  // ==========================================

  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
  },

  backBtnText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 14,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A2B4C',
    textAlign: 'center',
  },

  sub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 15,
  },

  // ==========================================
  // TABS
  // ==========================================

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 15,
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },

  tabActive: {
    backgroundColor: '#2563EB',
  },

  tabText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 12,
  },

  tabTextActive: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },

  content: {
    gap: 10,
    paddingBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A2B4C',
    marginBottom: 5,
  },

  // ==========================================
  // MANAGEMENT
  // ==========================================

  actionBtn: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },

  outlineBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    marginTop: 10,
  },

  outlineBtnText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 15,
  },

  emptyText: {
    color: '#94A3B8',
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
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    alignItems: 'center',
  },

  filterChipActive: {
    backgroundColor: '#1E293B',
  },

  filterText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  filterTextActive: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },

  userCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
  },

  userDetail: {
    color: '#64748B',
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

  prayerCount: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },

  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    minWidth: 80,
    alignItems: 'center',
  },

  refreshText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 13,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },

  emptyPrayerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 25,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },

  emptyPrayerIcon: {
    fontSize: 40,
    marginBottom: 10,
  },

  emptyPrayerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },

  emptyPrayerText: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  prayerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
    fontSize: 16,
    fontWeight: 'bold',
  },

  requesterEmail: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },

  prayerDate: {
    color: '#94A3B8',
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
    color: '#166534',
  },

  prayerContentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },

  prayerContent: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
  },

  prayerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  answeredButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },

  pendingButton: {
    flex: 1,
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },

  deleteButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    gap: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A2B4C',
    textAlign: 'center',
    marginBottom: 5,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
  },

  sexBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  sexBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  sexText: {
    color: '#64748B',
    fontWeight: '600',
  },

  sexTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },

  catBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    color: '#64748B',
    fontWeight: '600',
  },

  catTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },

  saveBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: '#64748B',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});