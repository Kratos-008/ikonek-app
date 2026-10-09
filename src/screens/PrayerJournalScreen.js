import { File } from 'expo-file-system';

import { useCallback, useEffect, useState } from 'react';

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://ikonek-app.onrender.com';

export default function PrayerJournalScreen({ navigation }) {
  const { isDarkMode, colors } = useTheme();
  const styles = createStyles(isDarkMode, colors);
  const [senderName, setSenderName] = useState('');
  const [devotionTitle, setDevotionTitle] = useState('');
  const [biblePassage, setBiblePassage] = useState('');
  const [prayerRequest, setPrayerRequest] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load the currently logged-in account.
  const loadLoggedInUser = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('@ikonek_user');

      if (savedUser) {
        const user = JSON.parse(savedUser);

        if (user?.name) {
          setSenderName(user.name);
        }
      }
    } catch (error) {
      console.error('Load logged-in user error:', error);
    }
  }, []);

  // Load prayer requests.
  const loadPrayerRequests = useCallback(async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('@ikonek_token');

      if (!token) {
        Alert.alert('Session Expired', 'Please sign in again.', [
          {
            text: 'OK',
            onPress: () => navigation?.goBack?.(),
          },
        ]);

        return;
      }

      const response = await fetch(`${API_URL}/api/prayer`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to load prayer requests'
        );
      }

      setRequests(data.prayerRequests || []);
    } catch (error) {
      console.error('Load prayer requests error:', error);

      Alert.alert(
        'Unable to Load',
        error.message || 'Could not load your prayer requests.'
      );
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadLoggedInUser();
    loadPrayerRequests();
  }, [loadLoggedInUser, loadPrayerRequests]);

  // Open gallery.
  const handleGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow gallery access to select an image.'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });

      if (!result.canceled && result.assets?.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);

      Alert.alert(
        'Gallery Error',
        'Unable to open the gallery.'
      );
    }
  };

  // Open camera.
  const handleCamera = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow camera access to take a photo.'
        );

        return;
      }

      const result =
        await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
        });

      if (!result.canceled && result.assets?.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);

      Alert.alert(
        'Camera Error',
        'Unable to open the camera.'
      );
    }
  };

  // Submit a new prayer/devotion.
  const handleAddRequest = async () => {
    const sender = senderName.trim();
    const title = devotionTitle.trim();
    const passage = biblePassage.trim();
    const content = prayerRequest.trim();

    if (!sender) {
      Alert.alert(
        'No Account Name',
        'Your logged-in account does not have a name.'
      );

      return;
    }

    if (!title) {
      Alert.alert(
        'Missing Title',
        'Please enter a devotion title.'
      );

      return;
    }

    if (!passage) {
      Alert.alert(
        'Missing Bible Passage',
        'Please enter the Bible passage.'
      );

      return;
    }

    if (!content) {
      Alert.alert(
        'Missing Reflection',
        'Please write your reflection or prayer details.'
      );

      return;
    }

    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem('@ikonek_token');

      if (!token) {
        Alert.alert(
          'Session Expired',
          'Please sign in again.'
        );

        return;
      }

      const formData = new FormData();

      formData.append('devotionTitle', title);
      formData.append('biblePassage', passage);
      formData.append('content', content);

      // Upload the selected image as a real File.
      if (selectedImage) {
  const file = new File(selectedImage);

  console.log('Image URI:', selectedImage);
  console.log('File exists:', file.exists);
  console.log('File type:', file.type);
  console.log('File name:', file.name);

  formData.append('image', file);
}

      const response = await fetch(`${API_URL}/api/prayer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          // Do NOT manually set Content-Type.
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to submit prayer request'
        );
      }

      setDevotionTitle('');
      setBiblePassage('');
      setPrayerRequest('');
      setSelectedImage(null);

      Alert.alert(
        'Devotion Posted',
        'Your devotion or prayer request has been posted successfully.'
      );

      await loadPrayerRequests();
    } catch (error) {
      console.error(
        'Submit prayer request error:',
        error
      );

      Alert.alert(
        'Submission Failed',
        error.message ||
          'Could not submit your prayer request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Change Pending <-> Answered.
  const handleChangeStatus = async (
    requestId,
    currentStatus
  ) => {
    try {
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

      const newStatus =
        String(currentStatus).toUpperCase() === 'ANSWERED'
          ? 'PENDING'
          : 'ANSWERED';

      const response = await fetch(
        `${API_URL}/api/prayer/${requestId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
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
            'Failed to update prayer status'
        );
      }

      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status:
                  data.prayerRequest?.status ||
                  newStatus,
              }
            : request
        )
      );
    } catch (error) {
      console.error(
        'Change prayer status error:',
        error
      );

      Alert.alert(
        'Status Update Failed',
        error.message ||
          'Could not update the prayer status.'
      );
    }
  };

  // Delete a prayer request.
  const handleDeleteRequest = (requestId) => {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this prayer request?',
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

              setRequests((currentRequests) =>
                currentRequests.filter(
                  (request) =>
                    request.id !== requestId
                )
              );

              Alert.alert(
                'Deleted',
                'Prayer request deleted successfully.'
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
            }
          },
        },
      ]
    );
  };

  // Logout.
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',

          onPress: async () => {
            try {
              await AsyncStorage.removeItem(
                '@ikonek_token'
              );

              await AsyncStorage.removeItem(
                '@ikonek_user'
              );

              navigation?.goBack?.();
            } catch (error) {
              console.error(
                'Logout error:',
                error
              );
            }
          },
        },
      ]
    );
  };

  // Format date.
  const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  // Format status.
  const formatStatus = (status) => {
    if (!status) return 'Pending';

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1).toLowerCase()
    );
  };

  // Status color.
  const getStatusStyle = (status) => {
    if (
      String(status).toUpperCase() ===
      'ANSWERED'
    ) {
      return styles.answeredStatus;
    }

    return styles.pendingStatus;
  };

  // Convert stored image path to a usable URL.
  const getRequestImage = (imageUrl) => {
    if (
      typeof imageUrl !== 'string' ||
      !imageUrl.trim()
    ) {
      return null;
    }

    const value = imageUrl.trim();

    // Already a complete URL.
    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    // Remove /api from API_URL.
    const serverUrl = API_URL.replace(
      /\/api\/?$/,
      ''
    );

    // Stored value starts with /uploads/...
    if (value.startsWith('/')) {
      return `${serverUrl}${value}`;
    }

    return `${serverUrl}/${value}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER - matches the Attendance and Events back button style */}
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            onPress={() => {
              if (navigation && typeof navigation.goBack === 'function') {
                navigation.goBack();
              } else if (navigation && typeof navigation.navigate === 'function') {
                navigation.navigate('Home');
              }
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerRightSpacer} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            Add New Devotion / Request
          </Text>

          <Text style={styles.accountLabel}>
            Sending as
          </Text>

          <View style={styles.accountBox}>
            <Text style={styles.accountIcon}>
              👤
            </Text>

            <Text style={styles.accountName}>
              {senderName || 'Loading account...'}
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Devotion Title (e.g. Strength & Comfort)"
            placeholderTextColor="#64748B"
            value={devotionTitle}
            onChangeText={setDevotionTitle}
            editable={!submitting}
          />

          <TextInput
            style={styles.input}
            placeholder="Bible Passage (e.g. Philippians 4:6-7)"
            placeholderTextColor="#64748B"
            value={biblePassage}
            onChangeText={setBiblePassage}
            editable={!submitting}
          />

          <TextInput
            style={[
              styles.input,
              styles.reflectionInput,
            ]}
            placeholder="Write your reflection or prayer details..."
            placeholderTextColor="#64748B"
            value={prayerRequest}
            onChangeText={setPrayerRequest}
            multiline
            textAlignVertical="top"
            editable={!submitting}
          />

          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
              />

              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() =>
                  setSelectedImage(null)
                }
                disabled={submitting}
              >
                <Text style={styles.removeImageText}>
                  ✕ Remove Image
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.mediaRow}>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={handleCamera}
              disabled={submitting}
            >
              <Text style={styles.mediaText}>
                📷 Camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mediaButton}
              onPress={handleGallery}
              disabled={submitting}
            >
              <Text style={styles.mediaText}>
                🖼️ Gallery
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.postButton,
              submitting &&
                styles.disabledButton,
            ]}
            onPress={handleAddRequest}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.postButtonText}>
                + Post Devotion
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.requestsHeader}>
          <Text style={styles.requestsTitle}>
            My Requests & Devotions
          </Text>

          <TouchableOpacity
            onPress={loadPrayerRequests}
            disabled={loading}
          >
            <Text style={styles.refreshText}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color="#60A5FA"
            />

            <Text style={styles.loadingText}>
              Loading your requests...
            </Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              🙏
            </Text>

            <Text style={styles.emptyTitle}>
              No Requests Yet
            </Text>

            <Text style={styles.emptyText}>
              Your prayer requests and devotions will
              appear here after you post them.
            </Text>
          </View>
        ) : (
          requests.map((request) => {
            const imageUrl =
              getRequestImage(request.imageUrl);

            return (
              <View
                key={request.id}
                style={styles.requestCard}
              >
                <View style={styles.requestTopRow}>
                  <View
                    style={styles.senderContainer}
                  >
                    <Text
                      style={styles.senderLabel}
                    >
                      Sent by
                    </Text>

                    <Text
                      style={styles.senderName}
                    >
                      {request.senderName ||
                        request.user?.name ||
                        'Unknown account'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() =>
                      handleDeleteRequest(
                        request.id
                      )
                    }
                  >
                    <Text
                      style={
                        styles.deleteButtonText
                      }
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>

                {request.devotionTitle && (
                  <Text style={styles.reqTitle}>
                    {request.devotionTitle}
                  </Text>
                )}

                {request.biblePassage && (
                  <Text
                    style={styles.biblePassage}
                  >
                    📖 {request.biblePassage}
                  </Text>
                )}

                <Text style={styles.reqContent}>
                  {request.content}
                </Text>

                {imageUrl && (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.requestImage}
                  />
                )}

                <View style={styles.requestFooter}>
                  <Text style={styles.reqDate}>
                    🕒 {formatDate(request.createdAt)}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.statusBadge,
                      getStatusStyle(
                        request.status
                      ),
                    ]}
                    onPress={() =>
                      handleChangeStatus(
                        request.id,
                        request.status
                      )
                    }
                  >
                    <Text
                      style={styles.statusText}
                    >
                      {formatStatus(
                        request.status
                      )}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (isDarkMode, colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  topHeader: {
    height: 78,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    backgroundColor: colors.bg,
  },

  logoText: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  logoutButton: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 11,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutIcon: {
    fontSize: 17,
    marginRight: 7,
  },

  logoutText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '700',
  },

  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    minHeight: 42,
  },

  backButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  backButtonText: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    marginTop: -2,
  },

  headerRightSpacer: {
    width: 40,
  },

  formCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 29,
    marginBottom: 39,
  },

  formTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 22,
  },

  accountLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },

  accountBox: {
    minHeight: 58,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  accountIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  accountName: {
    color: isDarkMode ? '#60A5FA' : '#2563EB',
    fontSize: 17,
    fontWeight: '800',
  },

  input: {
    height: 70,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    color: colors.text,
    fontSize: 18,
    marginBottom: 18,
  },

  reflectionInput: {
    height: 145,
    paddingTop: 18,
    paddingBottom: 18,
  },

  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
    marginTop: 4,
    marginBottom: 19,
  },

  mediaButton: {
    flex: 1,
    height: 67,
    borderRadius: 14,
    backgroundColor: isDarkMode ? '#334155' : '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mediaText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

  imagePreviewContainer: {
    marginBottom: 18,
  },

  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: colors.bg,
  },

  removeImageButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },

  removeImageText: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 14,
  },

  postButton: {
    height: 70,
    borderRadius: 14,
    backgroundColor: isDarkMode ? '#2563EB' : '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  postButtonText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.6,
  },

  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  requestsTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    flex: 1,
  },

  refreshText: {
    color: isDarkMode ? '#60A5FA' : '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 35,
  },

  loadingText: {
    color: colors.muted,
    marginTop: 12,
    fontSize: 15,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },

  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
    fontSize: 14,
  },

  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  senderContainer: {
    flex: 1,
    paddingRight: 10,
  },

  senderLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },

  senderName: {
    color: isDarkMode ? '#60A5FA' : '#2563EB',
    fontSize: 16,
    fontWeight: '800',
  },

  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#7F1D1D',
  },

  deleteButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  reqTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
    marginBottom: 8,
  },

  biblePassage: {
    color: isDarkMode ? '#93C5FD' : '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 13,
  },

  reqContent: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },

  requestImage: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    marginTop: 16,
    backgroundColor: colors.bg,
  },

  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  reqDate: {
    color: colors.muted,
    fontSize: 13,
  },

  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
  },

  pendingStatus: {
    backgroundColor: '#854D0E',
  },

  answeredStatus: {
    backgroundColor: '#166534',
  },

  statusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
});
