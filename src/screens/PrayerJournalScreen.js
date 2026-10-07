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
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://ikonek-app.onrender.com';

export default function PrayerJournalScreen({ navigation }) {
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
        barStyle="light-content"
        backgroundColor="#0F172A"
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },

  logoText: {
    color: '#F8FAFC',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  logoutButton: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 11,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
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

  backButton: {
    marginTop: 26,
    marginBottom: 27,
  },

  backText: {
    color: '#60A5FA',
    fontSize: 24,
    fontWeight: '700',
  },

  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 29,
    marginBottom: 39,
  },

  formTitle: {
    color: '#F8FAFC',
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 22,
  },

  accountLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },

  accountBox: {
    minHeight: 58,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#60A5FA',
    fontSize: 17,
    fontWeight: '800',
  },

  input: {
    height: 70,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#26364B',
    borderRadius: 14,
    paddingHorizontal: 18,
    color: '#F8FAFC',
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
    backgroundColor: '#34475C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mediaText: {
    color: '#F8FAFC',
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
    backgroundColor: '#0F172A',
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
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  postButtonText: {
    color: '#FFFFFF',
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
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
    flex: 1,
  },

  refreshText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 35,
  },

  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 15,
  },

  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },

  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },

  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 21,
    fontSize: 14,
  },

  requestCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },

  senderName: {
    color: '#60A5FA',
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  reqTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
    marginBottom: 8,
  },

  biblePassage: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 13,
  },

  reqContent: {
    color: '#E2E8F0',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },

  requestImage: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    marginTop: 16,
    backgroundColor: '#0F172A',
  },

  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  reqDate: {
    color: '#94A3B8',
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
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});