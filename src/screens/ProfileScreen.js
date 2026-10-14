import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'https://ikonek-app.onrender.com';

export default function ProfileScreen({ user, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const qrRef = useRef(null);
  const [downloadingQr, setDownloadingQr] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) throw new Error('Please sign in again to load your profile.');
      const response = await fetch(`${API_URL}/api/youth`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Could not load member details.');
      const rows = Array.isArray(data) ? data : (data.youth || data.members || []);
      const linked = rows.find((item) => item.userId === user?.id) || null;
      setMember(linked);
      if (linked?.name) setName(linked.name);
    } catch (e) {
      Alert.alert('Profile', e.message || 'Could not load profile.');
    } finally { setLoading(false); }
  };

  const downloadQrCode = async () => {
    if (!member?.id || !qrRef.current) {
      Alert.alert('QR Code unavailable', 'Your account must be linked to a member profile before you can save its QR code.');
      return;
    }

    setDownloadingQr(true);
    let fileUri;
    try {
      const base64 = await new Promise((resolve, reject) => {
        if (typeof qrRef.current?.toDataURL !== 'function') {
          reject(new Error('The QR image is not ready yet. Please close and reopen the QR code, then try again.'));
          return;
        }
        qrRef.current.toDataURL((data) => {
          if (data) resolve(data);
          else reject(new Error('Could not generate the QR image.'));
        });
      });

      fileUri = `${FileSystem.cacheDirectory}ikonek-member-qr-${member.id}.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Avoid ExpoMediaLibrary entirely because this app build does not contain
      // its native module. Use the system share sheet to save/share the PNG.
      const Sharing = await import('expo-sharing');
      if (typeof Sharing.isAvailableAsync !== 'function' ||
          typeof Sharing.shareAsync !== 'function' ||
          !(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available in this app build. Install expo-sharing and rebuild the app.');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Save your iKonek member QR code',
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Save member QR code error:', error);
      Alert.alert('Could not save QR Code', error?.message || 'Please try again.');
    } finally {
      setDownloadingQr(false);
    }
  };

  const saveProfile = async () => {
    const normalizedName = String(name || '').trim().replace(/\s+/g, ' ');
    if (!normalizedName) { Alert.alert('Name required', 'Please enter your name before saving.'); return; }
    if (normalizedName.length > 100) { Alert.alert('Name too long', 'Please use 100 characters or fewer.'); return; }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@ikonek_token');
      if (!token) throw new Error('Please sign in again to update your profile.');
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not update your name. Please try again.');
      setName(data.user?.name || normalizedName);
      setMember((current) => current ? { ...current, name: data.user?.name || normalizedName } : current);
      setEditing(false);
      Alert.alert('Profile updated', 'Your name has been updated successfully.');
    } catch (error) {
      Alert.alert('Could not save profile', error?.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  const initials = (name || user?.name || 'U').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
  const roleLabel = String(user?.role || 'YOUTH').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const card = { backgroundColor: colors.card, borderColor: colors.border };
  const text = { color: colors.text };
  const muted = { color: colors.muted || '#718096' };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container}>
      <View style={[s.top, { backgroundColor: isDarkMode ? '#10264B' : '#2875F5' }]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={s.back}>
          <Ionicons name="arrow-back" size={23} color="#fff" />
        </TouchableOpacity>
        <Text style={s.topTitle}>My Profile</Text>
        <Text style={s.topSubtitle}>Your iKonek account and member information</Text>
      </View>

      <View style={[s.identity, card]}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials || 'U'}</Text></View>
        <Text style={[s.name, text]}>{member?.name || user?.name || 'iKonek User'}</Text>
        <Text style={[s.role, muted]}>{roleLabel}</Text>
        <Text style={[s.email, muted]}>{user?.email || ''}</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color="#2875F5" style={{ margin: 28 }} /> : (
        <>
          <View style={[s.infoCard, card]}>
            <Text style={[s.sectionTitle, text]}>Cell Group</Text>
            <Info label="Cell Leader" value={member?.cellLeader || 'No leader assigned yet'} colors={colors} />
            <Info label="Group / Category" value={member?.category || 'Not assigned'} colors={colors} />
            {!member && <Text style={[s.note, muted]}>This account is not linked to an existing member record yet. Your member QR code will appear here after linking.</Text>}
          </View>

          <TouchableOpacity style={[s.action, { backgroundColor: '#2875F5' }]} onPress={() => { setEditing(v => !v); setShowQr(false); }}>
            <Ionicons name="create-outline" size={21} color="#fff" />
            <Text style={s.actionText}>{editing ? 'Close Edit Profile' : 'Edit Profile'}</Text>
          </TouchableOpacity>
          {editing && (
            <View style={[s.infoCard, card]}>
              <Text style={[s.sectionTitle, text]}>Edit Profile</Text>
              <Text style={[s.fieldLabel, text]}>Name</Text>
              <TextInput value={name} onChangeText={setName} style={[s.input, text, { borderColor: colors.border }]} />
              <Text style={[s.fieldLabel, text]}>Email</Text>
              <TextInput value={email} editable={false} autoCapitalize="none" keyboardType="email-address" style={[s.input, text, { borderColor: colors.border, opacity: 0.7 }]} />
              <TouchableOpacity style={[s.action, { backgroundColor: '#64748b' }]} onPress={saveProfile} disabled={saving}>
                <Text style={s.actionText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
              <Text style={[s.note, muted]}>You can change your display name here. Email changes are handled separately to protect your account.</Text>
            </View>
          )}
          <TouchableOpacity style={[s.action, { backgroundColor: '#0F766E' }]} onPress={() => { setShowQr(v => !v); setEditing(false); }} disabled={!member}>
            <Ionicons name="qr-code-outline" size={21} color="#fff" />
            <Text style={s.actionText}>{showQr ? 'Hide QR Code' : 'View / Download QR Code'}</Text>
          </TouchableOpacity>
          {showQr && member && (
            <View style={[s.qrCard, card]}>
              <QRCode value={member.id} size={210} getRef={(ref) => { qrRef.current = ref; }} />
              <Text style={[s.sectionTitle, text, { marginTop: 16 }]}>Your Member QR Code</Text>
              <Text style={[s.note, muted]}>This uses the same YouthProfile ID as the Member List QR code.</Text>
              <TouchableOpacity style={[s.action, { backgroundColor: '#166534', marginHorizontal: 0, marginTop: 16, marginBottom: 0, width: '100%' }]} onPress={downloadQrCode} disabled={downloadingQr}>
                <Ionicons name="download-outline" size={21} color="#fff" />
                <Text style={s.actionText}>{downloadingQr ? 'Saving QR Code…' : 'Save QR Code to Device'}</Text>
              </TouchableOpacity>
              <Text style={[s.note, muted]}>The saved QR contains the same existing YouthProfile ID used by the Member List. No new member or QR identity is created.</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Info({ label, value, colors }) {
  return <View style={s.infoRow}><Text style={[s.fieldLabel, { color: colors.muted || '#718096' }]}>{label}</Text><Text style={[s.infoValue, { color: colors.text }]}>{value}</Text></View>;
}

const s = StyleSheet.create({
  container: { paddingBottom: 32 },
  top: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { width: 38, height: 38, justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 10 },
  topSubtitle: { color: '#EAF2FF', fontSize: 13, marginTop: 4 },
  identity: { margin: 16, marginTop: -1, padding: 22, borderRadius: 18, borderWidth: 1, alignItems: 'center' },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#2875F5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  name: { fontSize: 21, fontWeight: '800', textAlign: 'center' },
  role: { marginTop: 5, fontSize: 13, fontWeight: '600' },
  email: { marginTop: 4, fontSize: 13 },
  infoCard: { marginHorizontal: 16, marginBottom: 14, padding: 18, borderRadius: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  infoRow: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#CBD5E1' },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  infoValue: { fontSize: 15, fontWeight: '600' },
  action: { marginHorizontal: 16, marginBottom: 14, borderRadius: 13, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  qrCard: { marginHorizontal: 16, marginBottom: 20, padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
});
