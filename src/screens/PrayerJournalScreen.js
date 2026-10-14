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
  const [currentUserId, setCurrentUserId] = useState(null);
  const [postType, setPostType] = useState('PRAYER_REQUEST');
  const [visibility, setVisibility] = useState('PRIVATE');
  const [testimonyDrafts, setTestimonyDrafts] = useState({});
  const [devotionTitle, setDevotionTitle] = useState('');
  const [biblePassage, setBiblePassage] = useState('');
  const [prayerRequest, setPrayerRequest] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [listFilter, setListFilter] = useState('ALL');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentEditDrafts, setCommentEditDrafts] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);

  // Load the currently logged-in account.
  const loadLoggedInUser = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('@ikonek_user');

      if (savedUser) {
        const user = JSON.parse(savedUser);

        if (user?.name) setSenderName(user.name);
        if (user?.id || user?.userId) setCurrentUserId(user.id || user.userId);
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

    if (postType === 'DEVOTION' && !title) {
      Alert.alert('Missing Title', 'Please enter a devotion title.');
      return;
    }

    if (postType === 'DEVOTION' && !passage) {
      Alert.alert('Missing Bible Passage', 'Please enter the Bible passage.');
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

      formData.append('senderName', sender);
      formData.append('postType', postType);
      formData.append('visibility', visibility);
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

      const response = await fetch(editingRequestId ? `${API_URL}/api/prayer/${editingRequestId}` : `${API_URL}/api/prayer`, {
        method: editingRequestId ? 'PUT' : 'POST',
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

      const wasEditing = Boolean(editingRequestId);
      setDevotionTitle('');
      setBiblePassage('');
      setPrayerRequest('');
      setSelectedImage(null);
      setPostType('PRAYER_REQUEST');
      setVisibility('PRIVATE');
      setEditingRequestId(null);

      Alert.alert(
        wasEditing ? 'Post Updated' : (postType === 'DEVOTION' ? 'Devotion Posted' : 'Prayer Request Posted'),
        wasEditing ? 'Your existing post was updated.' : (visibility === 'CHURCH' ? 'Your post was shared with the church.' : 'Your post was saved privately.')
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

      if (String(currentStatus).toUpperCase() === 'ANSWERED') {
        Alert.alert('Already Answered', 'Answered prayer requests cannot be changed back to Pending.');
        return;
      }
      const newStatus = 'ANSWERED';

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

  // Save an optional testimony on an answered prayer.
  const handleSaveTestimony = async (requestId) => {
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) {
        Alert.alert('Session Expired', 'Please sign in again.');
        return;
      }
      const response = await fetch(`${API_URL}/api/prayer/${requestId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimony: testimonyDrafts[requestId] || '' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not save testimony');
      setRequests((items) => items.map((item) => item.id === requestId ? { ...item, testimony: data.prayerRequest?.testimony ?? (testimonyDrafts[requestId] || '') } : item));
      Alert.alert('Saved', 'Your testimony has been saved.');
    } catch (error) {
      Alert.alert('Save Failed', error.message || 'Could not save testimony.');
    }
  };

  const sendPostAction = async (postId, path, method, body) => {
    const token = await AsyncStorage.getItem('@ikonek_token');
    if (!token) throw new Error('Please sign in again.');
    const response = await fetch(`${API_URL}/api/prayer/${postId}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Action failed');
    return data;
  };

  const handleReact = async (request, reaction) => {
    try { await sendPostAction(request.id, '/reaction', 'PUT', { reaction }); await loadPrayerRequests(); }
    catch (e) { Alert.alert('Reaction Failed', e.message); }
  };

  const handleAddComment = async (request) => {
    const content = (commentDrafts[request.id] || '').trim();
    if (!content) return;
    try { await sendPostAction(request.id, '/comments', 'POST', { content }); setCommentDrafts(old => ({ ...old, [request.id]: '' })); await loadPrayerRequests(); }
    catch (e) { Alert.alert('Comment Failed', e.message); }
  };

  const handleSaveComment = async (requestId, commentId) => {
    const content = (commentEditDrafts[commentId] || '').trim();
    if (!content) { Alert.alert('Comment Required', 'Please enter a comment.'); return; }
    try { await sendPostAction(requestId, `/comments/${commentId}`, 'PUT', { content }); setEditingCommentId(null); await loadPrayerRequests(); }
    catch (e) { Alert.alert('Edit Failed', e.message); }
  };

  const handleDeleteComment = (requestId, commentId) => Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await sendPostAction(requestId, `/comments/${commentId}`, 'DELETE'); await loadPrayerRequests(); } catch (e) { Alert.alert('Delete Failed', e.message); } } },
  ]);

  // Load an existing post into the form. Answered prayer requests are locked.
  const handleEditRequest = (request) => {
    if (request.userId !== currentUserId) {
      Alert.alert('Not Allowed', 'You can only edit your own posts.');
      return;
    }
    if (request.postType !== 'DEVOTION' && String(request.status || 'PENDING').toUpperCase() === 'ANSWERED') {
      Alert.alert('Post Locked', 'Answered prayer requests can no longer be edited.');
      return;
    }
    setEditingRequestId(request.id);
    setPostType(request.postType === 'DEVOTION' ? 'DEVOTION' : 'PRAYER_REQUEST');
    setVisibility(request.visibility || 'PRIVATE');
    setDevotionTitle(request.devotionTitle || '');
    setBiblePassage(request.biblePassage || '');
    setPrayerRequest(request.content || '');
    setSelectedImage(null);
    Alert.alert('Edit Post', 'Make your changes in the form above, then tap Save Changes.');
  };

  const cancelEditing = () => {
    setEditingRequestId(null);
    setPostType('PRAYER_REQUEST');
    setVisibility('PRIVATE');
    setDevotionTitle('');
    setBiblePassage('');
    setPrayerRequest('');
    setSelectedImage(null);
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
            {editingRequestId ? 'Edit Journal Post' : (postType === 'DEVOTION' ? 'Add New Devotion' : 'Add Prayer Request')}
          </Text>

          <Text style={styles.accountLabel}>Post type</Text>
          <View style={styles.selectorRow}>
            {[{ value: 'PRAYER_REQUEST', label: '🙏 Prayer Request' }, { value: 'DEVOTION', label: '📖 Devotion' }].map((option) => (
              <TouchableOpacity key={option.value} onPress={() => setPostType(option.value)} disabled={submitting} style={[styles.selectorButton, postType === option.value && styles.selectorButtonActive]}>
                <Text style={[styles.selectorText, postType === option.value && styles.selectorTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.accountLabel}>Visibility</Text>
          <View style={styles.selectorRow}>
            {[{ value: 'PRIVATE', label: '🔒 Only Me' }, { value: 'CHURCH', label: '⛪ Share with Church' }].map((option) => (
              <TouchableOpacity key={option.value} onPress={() => setVisibility(option.value)} disabled={submitting} style={[styles.selectorButton, visibility === option.value && styles.selectorButtonActive]}>
                <Text style={[styles.selectorText, visibility === option.value && styles.selectorTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

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

          {postType === 'DEVOTION' && <TextInput
            style={styles.input}
            placeholder="Devotion Title (e.g. Strength & Comfort)"
            placeholderTextColor="#64748B"
            value={devotionTitle}
            onChangeText={setDevotionTitle}
            editable={!submitting}
          />}

          {postType === 'DEVOTION' && <TextInput
            style={styles.input}
            placeholder="Bible Passage (e.g. Philippians 4:6-7)"
            placeholderTextColor="#64748B"
            value={biblePassage}
            onChangeText={setBiblePassage}
            editable={!submitting}
          />}

          <TextInput
            style={[
              styles.input,
              styles.reflectionInput,
            ]}
            placeholder={postType === 'DEVOTION' ? 'Write your reflection...' : 'Write your prayer request...'}
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
                {editingRequestId ? 'Save Changes' : (postType === 'DEVOTION' ? '+ Post Devotion' : '+ Post Prayer Request')}
              </Text>
            )}
          </TouchableOpacity>
          {editingRequestId && (
            <TouchableOpacity style={styles.cancelEditButton} onPress={cancelEditing}>
              <Text style={styles.cancelEditText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.requestsHeader}>
          <Text style={styles.requestsTitle}>
            My Journal & Church Posts
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

        <TextInput
          style={styles.searchInput}
          placeholder="Search sender, prayer title, or devotion..."
          placeholderTextColor={colors.muted || '#64748B'}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <View style={styles.filterRow}>
          {[
            { key: 'ALL', label: 'All' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'ANSWERED', label: 'Answered' },
            { key: 'DEVOTIONS', label: 'Devotions' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterButton, listFilter === filter.key && styles.filterButtonActive]}
              onPress={() => setListFilter(filter.key)}
            >
              <Text style={[styles.filterButtonText, listFilter === filter.key && styles.filterButtonTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          ))}
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
        ) : requests.filter((request) => {
          const type = String(request.postType || 'PRAYER_REQUEST').toUpperCase();
          const status = String(request.status || 'PENDING').toUpperCase();
          const query = searchText.trim().toLowerCase();
          const searchable = [
            request.senderName,
            request.user?.name,
            request.devotionTitle,
            request.content,
            request.biblePassage,
          ].filter(Boolean).join(' ').toLowerCase();
          const matchesSearch = !query || searchable.includes(query);
          const matchesFilter =
            listFilter === 'ALL' ||
            (listFilter === 'DEVOTIONS' && type === 'DEVOTION') ||
            (listFilter === 'PENDING' && type !== 'DEVOTION' && status === 'PENDING') ||
            (listFilter === 'ANSWERED' && type !== 'DEVOTION' && status === 'ANSWERED');
          return matchesSearch && matchesFilter;
        }).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              🙏
            </Text>

            <Text style={styles.emptyTitle}>
              {searchText.trim() || listFilter !== 'ALL' ? 'No Matching Posts' : 'No Requests Yet'}
            </Text>

            <Text style={styles.emptyText}>
              {searchText.trim() || listFilter !== 'ALL' ? 'Try a different search or filter.' : 'Your prayer requests and devotions will appear here after you post them.'}
            </Text>
          </View>
        ) : (
          requests.filter((request) => {
            const type = String(request.postType || 'PRAYER_REQUEST').toUpperCase();
            const status = String(request.status || 'PENDING').toUpperCase();
            const query = searchText.trim().toLowerCase();
            const searchable = [request.senderName, request.user?.name, request.devotionTitle, request.content, request.biblePassage].filter(Boolean).join(' ').toLowerCase();
            const matchesSearch = !query || searchable.includes(query);
            const matchesFilter = listFilter === 'ALL' || (listFilter === 'DEVOTIONS' && type === 'DEVOTION') || (listFilter === 'PENDING' && type !== 'DEVOTION' && status === 'PENDING') || (listFilter === 'ANSWERED' && type !== 'DEVOTION' && status === 'ANSWERED');
            return matchesSearch && matchesFilter;
          }).map((request) => {
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

                  {request.userId === currentUserId && (
                    <View style={styles.cardActions}>
                      {(request.postType === 'DEVOTION' || String(request.status || 'PENDING').toUpperCase() !== 'ANSWERED') && (
                        <TouchableOpacity style={styles.editButton} onPress={() => handleEditRequest(request)}>
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteRequest(request.id)}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.postMetaRow}>
                  <Text style={[styles.postTypeBadge, request.postType === 'DEVOTION' ? styles.devotionBadge : styles.prayerBadge]}>{request.postType === 'DEVOTION' ? '📖 Devotion' : request.postType === 'PRAYER_REQUEST' ? '🙏 Prayer Request' : 'Journal Entry'}</Text>
                  <Text style={styles.postMetaText}>{request.visibility === 'CHURCH' ? '⛪ Shared with Church' : '🔒 Private'}</Text>
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

                <View style={styles.socialSection}>
                  <Text style={styles.socialHeading}>Reactions</Text>
                  <View style={styles.reactionRow}>
                    {[
                      { key: 'HEART', emoji: '❤️', label: 'Heart' },
                      { key: 'HAHA', emoji: '😂', label: 'Haha' },
                      { key: 'WOW', emoji: '😮', label: 'Wow' },
                      { key: 'SAD', emoji: '😢', label: 'Sad' },
                      { key: 'LIKE', emoji: '👍', label: 'Like' },
                    ].map((item) => {
                      const count = (request.reactions || []).filter((r) => r.reaction === item.key).length;
                      const mine = (request.reactions || []).some((r) => String(r.userId) === String(currentUserId) && r.reaction === item.key);
                      return <TouchableOpacity key={item.key} style={[styles.reactionChip, mine && styles.reactionChipActive]} onPress={() => handleReact(request, item.key)}><Text style={styles.reactionText}>{item.emoji} {count || ''}</Text></TouchableOpacity>;
                    })}
                  </View>
                  <Text style={styles.socialHeading}>Comments ({(request.comments || []).length})</Text>
                  {(request.comments || []).map((comment) => (
                    <View key={comment.id} style={styles.commentCard}>
                      <Text style={styles.commentAuthor}>{comment.user?.name || 'User'}</Text>
                      {editingCommentId === comment.id ? <><TextInput style={styles.commentInput} value={commentEditDrafts[comment.id] ?? comment.content} onChangeText={(v) => setCommentEditDrafts(old => ({ ...old, [comment.id]: v }))} multiline /><View style={styles.commentActions}><TouchableOpacity onPress={() => handleSaveComment(request.id, comment.id)}><Text style={styles.commentActionText}>Save</Text></TouchableOpacity><TouchableOpacity onPress={() => setEditingCommentId(null)}><Text style={styles.commentCancelText}>Cancel</Text></TouchableOpacity></View></> : <Text style={styles.commentContent}>{comment.content}</Text>}
                      {String(comment.userId) === String(currentUserId) && editingCommentId !== comment.id && <View style={styles.commentActions}><TouchableOpacity onPress={() => { setCommentEditDrafts(old => ({ ...old, [comment.id]: comment.content })); setEditingCommentId(comment.id); }}><Text style={styles.commentActionText}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={() => handleDeleteComment(request.id, comment.id)}><Text style={styles.commentDeleteText}>Delete</Text></TouchableOpacity></View>}
                    </View>
                  ))}
                  <TextInput style={styles.commentInput} placeholder="Write a comment..." placeholderTextColor={colors.muted || '#64748B'} value={commentDrafts[request.id] || ''} onChangeText={(v) => setCommentDrafts(old => ({ ...old, [request.id]: v }))} multiline maxLength={2000} />
                  <TouchableOpacity style={styles.commentSendButton} onPress={() => handleAddComment(request)}><Text style={styles.commentSendText}>Post Comment</Text></TouchableOpacity>
                </View>

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

                  {request.postType !== 'DEVOTION' && (
                    request.userId === currentUserId && String(request.status || 'PENDING').toUpperCase() !== 'ANSWERED' ? (
                      <TouchableOpacity style={[styles.statusBadge, getStatusStyle(request.status)]} onPress={() => handleChangeStatus(request.id, request.status)}>
                        <Text style={styles.statusText}>Mark Answered</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.statusBadge, getStatusStyle(request.status)]}><Text style={styles.statusText}>{formatStatus(request.status)}</Text></View>
                    )
                  )}
                </View>

                {request.postType !== 'DEVOTION' && String(request.status).toUpperCase() === 'ANSWERED' && request.userId === currentUserId && (
                  <View style={styles.testimonyBox}>
                    <Text style={styles.accountLabel}>Answered prayer testimony (optional)</Text>
                    <TextInput style={styles.testimonyInput} placeholder="How was this prayer answered?" placeholderTextColor="#64748B" multiline textAlignVertical="top" value={testimonyDrafts[request.id] !== undefined ? testimonyDrafts[request.id] : (request.testimony || '')} onChangeText={(value) => setTestimonyDrafts((old) => ({ ...old, [request.id]: value }))} />
                    <TouchableOpacity style={styles.saveTestimonyButton} onPress={() => handleSaveTestimony(request.id)}><Text style={styles.saveTestimonyText}>Save Testimony</Text></TouchableOpacity>
                  </View>
                )}
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

  selectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  selectorButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input || colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  selectorButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE',
  },
  selectorText: { color: colors.text, fontWeight: '600', textAlign: 'center' },
  selectorTextActive: { color: isDarkMode ? '#FFFFFF' : '#1D4ED8' },
  searchInput: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, color: colors.text, backgroundColor: colors.card, marginBottom: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card },
  filterButtonActive: { backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE', borderColor: '#60A5FA' },
  filterButtonText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  filterButtonTextActive: { color: isDarkMode ? '#FFFFFF' : '#1D4ED8' },
  socialSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  socialHeading: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 7, marginBottom: 8 },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  reactionChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.card },
  reactionChipActive: { borderColor: '#60A5FA', backgroundColor: isDarkMode ? '#1E3A5F' : '#DBEAFE' },
  reactionText: { color: colors.text, fontSize: 14 },
  commentCard: { padding: 10, borderRadius: 10, backgroundColor: isDarkMode ? '#111827' : '#F8FAFC', marginBottom: 8 },
  commentAuthor: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 3 },
  commentContent: { color: colors.text, fontSize: 14, lineHeight: 20 },
  commentInput: { minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text, marginTop: 5, marginBottom: 7 },
  commentActions: { flexDirection: 'row', gap: 16, marginTop: 7 },
  commentActionText: { color: '#3B82F6', fontWeight: '700' },
  commentCancelText: { color: colors.muted || '#64748B', fontWeight: '600' },
  commentDeleteText: { color: '#EF4444', fontWeight: '700' },
  commentSendButton: { alignSelf: 'flex-end', backgroundColor: '#2563EB', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9 },
  commentSendText: { color: '#FFFFFF', fontWeight: '800' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  editButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE' },
  editButtonText: { color: isDarkMode ? '#DBEAFE' : '#1D4ED8', fontSize: 12, fontWeight: '800' },
  cancelEditButton: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' },
  cancelEditText: { color: colors.text, fontWeight: '700' },
  postTypeBadge: { overflow: 'hidden', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800' },
  devotionBadge: { backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE', color: isDarkMode ? '#DBEAFE' : '#1D4ED8' },
  prayerBadge: { backgroundColor: isDarkMode ? '#4C1D95' : '#EDE9FE', color: isDarkMode ? '#E9D5FF' : '#6D28D9' },
  postMetaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 },
  postMetaText: { color: colors.muted || colors.text, fontSize: 12, fontWeight: '600' },
  testimonyBox: { marginTop: 12, gap: 8 },
  testimonyInput: { minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text, backgroundColor: colors.card },
  saveTestimonyButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: '#2563EB' },
  saveTestimonyText: { color: '#FFFFFF', fontWeight: '700' },

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
    backgroundColor: isDarkMode ? '#7F1D1D' : '#FEE2E2',
  },

  deleteButtonText: {
    color: isDarkMode ? '#FEE2E2' : '#B91C1C',
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
    backgroundColor: isDarkMode ? '#854D0E' : '#FEF3C7',
  },

  answeredStatus: {
    backgroundColor: isDarkMode ? '#166534' : '#DCFCE7',
  },

  statusText: {
    color: isDarkMode ? '#FFFFFF' : '#334155',
    fontSize: 11,
    fontWeight: '800',
  },
});
