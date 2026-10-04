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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://ikonek-app.onrender.com/api';

export default function PrayerJournalScreen({ navigation }) {
  const [prayerRequest, setPrayerRequest] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPrayerRequests = useCallback(async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('@ikonek_token');

      if (!token) {
        Alert.alert(
          'Session Expired',
          'Please sign in again.',
          [
            {
              text: 'OK',
              onPress: () => navigation?.goBack?.(),
            },
          ]
        );
        return;
      }

      const response = await fetch(`${API_URL}/prayer`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load prayer requests');
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
    loadPrayerRequests();
  }, [loadPrayerRequests]);

  const handleAddRequest = async () => {
    const content = prayerRequest.trim();

    if (!content) {
      Alert.alert(
        'Prayer Request',
        'Please write a prayer request first.'
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

      const response = await fetch(`${API_URL}/prayer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to submit prayer request'
        );
      }

      setPrayerRequest('');

      Alert.alert(
        'Prayer Request Submitted',
        'Your prayer request has been submitted successfully.'
      );

      await loadPrayerRequests();
    } catch (error) {
      console.error('Submit prayer request error:', error);

      Alert.alert(
        'Submission Failed',
        error.message || 'Could not submit your prayer request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return '';
    }

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

  const formatStatus = (status) => {
    if (!status) {
      return 'Pending';
    }

    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const getStatusStyle = (status) => {
    if (status === 'ANSWERED') {
      return styles.answeredStatus;
    }

    return styles.pendingStatus;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F172A"
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Prayer Journal 📓</Text>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Write a prayer request..."
            placeholderTextColor="#64748B"
            value={prayerRequest}
            onChangeText={setPrayerRequest}
            multiline
            editable={!submitting}
          />

          <TouchableOpacity
            style={[
              styles.addBtn,
              submitting && styles.disabledBtn,
            ]}
            onPress={handleAddRequest}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.addBtnText}>
                + Add Request
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.headingRow}>
          <Text style={styles.subHeading}>My Requests</Text>

          <TouchableOpacity
            onPress={loadPrayerRequests}
            disabled={loading}
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color="#60A5FA"
            />

            <Text style={styles.loadingText}>
              Loading your prayer requests...
            </Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🙏</Text>

            <Text style={styles.emptyTitle}>
              No Prayer Requests Yet
            </Text>

            <Text style={styles.emptyText}>
              Your prayer requests will appear here after you
              submit them.
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View
              key={request.id}
              style={styles.requestCard}
            >
              <Text style={styles.reqTitle}>
                {request.content}
              </Text>

              <View style={styles.requestFooter}>
                <Text style={styles.reqSub}>
                  {formatDate(request.createdAt)}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    getStatusStyle(request.status),
                  ]}
                >
                  <Text style={styles.statusText}>
                    {formatStatus(request.status)}
                  </Text>
                </View>
              </View>
            </View>
          ))
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

  header: {
    padding: 16,
  },

  backText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: 'bold',
  },

  scroll: {
    padding: 16,
    paddingBottom: 30,
  },

  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },

  inputCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  input: {
    color: '#FFF',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 100,
    textAlignVertical: 'top',
  },

  addBtn: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },

  disabledBtn: {
    opacity: 0.6,
  },

  addBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  subHeading: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  refreshText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600',
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },

  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },

  emptyTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  requestCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },

  reqTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 23,
  },

  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  reqSub: {
    color: '#94A3B8',
    fontSize: 12,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },

  pendingStatus: {
    backgroundColor: '#854D0E',
  },

  answeredStatus: {
    backgroundColor: '#166534',
  },

  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});