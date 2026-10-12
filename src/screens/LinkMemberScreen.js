import React, { useState } from 'react';
import {
View,
Text,
TextInput,
TouchableOpacity,
StyleSheet,
StatusBar,
KeyboardAvoidingView,
Platform,
ScrollView,
Alert,
ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'https://ikonek-app.onrender.com';

export default function LinkMemberScreen({ onCancel, onLinked }) {
const { colors, isDarkMode } = useTheme();

const [linkingCode, setLinkingCode] = useState('');
const [loading, setLoading] = useState(false);

const handleLinkAccount = async () => {
const code = linkingCode.trim().toUpperCase();

if (!code) {
  Alert.alert(
    'Missing Code',
    'Please enter the member registration code provided to you.'
  );
  return;
}

const codePattern = /^IK-[A-F0-9]{8}-[A-F0-9]{8}$/;

if (!codePattern.test(code)) {
  Alert.alert(
    'Invalid Code Format',
    'Please enter the complete code in this format:\nIK-XXXXXXXX-XXXXXXXX'
  );
  return;
}

try {
  setLoading(true);

  const token = await AsyncStorage.getItem('@ikonek_token');

  if (!token) {
    Alert.alert(
      'Session Expired',
      'Please sign in again before linking your member account.',
      [
        {
          text: 'OK',
          onPress: () => onCancel?.(),
        },
      ]
    );
    return;
  }

  const response = await fetch(`${API_URL}/api/auth/link-member`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      linkingCode: code,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || 'Unable to link your member account.'
    );
  }

  if (!data.token || !data.user) {
    throw new Error(
      'The server response is incomplete. Please try again.'
    );
  }

  // Save the refreshed token and updated user information.
  await AsyncStorage.setItem('@ikonek_token', data.token);
  await AsyncStorage.setItem(
    '@ikonek_user',
    JSON.stringify(data.user)
  );

  Alert.alert(
    'Account Linked Successfully!',
    'Your existing iKonek member record is now connected to your account.',
    [
      {
        text: 'Continue',
        onPress: () => onLinked?.(data.user),
      },
    ]
  );
} catch (error) {
  Alert.alert(
    'Unable to Link Account',
    error.message ||
      'Something went wrong. Please check your connection and try again.'
  );
} finally {
  setLoading(false);
}

};

const backgroundColor = colors?.background || (isDarkMode ? '#121212' : '#F5F7FA');
const textColor = colors?.text || (isDarkMode ? '#FFFFFF' : '#1F2937');
const cardColor = colors?.card || (isDarkMode ? '#1E1E1E' : '#FFFFFF');
const borderColor = colors?.border || (isDarkMode ? '#444444' : '#D1D5DB');
const primaryColor = colors?.primary || '#2563EB';
const mutedColor = isDarkMode ? '#AAAAAA' : '#6B7280';

return (
<SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
<StatusBar
barStyle={isDarkMode ? 'light-content' : 'dark-content'}
backgroundColor={backgroundColor}
/>

  <KeyboardAvoidingView
  style={styles.flex}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onCancel}
          disabled={loading}
          style={styles.backButton}
        >
          <Text style={[styles.backText, { color: primaryColor }]}>
            {'‹  Back'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.brand, { color: primaryColor }]}>
          iKonek
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: cardColor, borderColor },
        ]}
      >
        <Text style={[styles.icon, { color: primaryColor }]}>
          🔗
        </Text>

        <Text style={[styles.title, { color: textColor }]}>
          Link My Account
        </Text>

        <Text style={[styles.description, { color: mutedColor }]}>
          Already have a member record in iKonek? Enter the registration
          code given to you by your administrator to connect that record
          to your existing account.
        </Text>

        <Text style={[styles.label, { color: textColor }]}>
          Member Registration Code
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              color: textColor,
              borderColor,
              backgroundColor,
            },
          ]}
          placeholder="IK-XXXXXXXX-XXXXXXXX"
          placeholderTextColor={mutedColor}
          value={linkingCode}
          onChangeText={(value) =>
            setLinkingCode(value.toUpperCase())
          }
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
          maxLength={21}
          returnKeyType="done"
          onSubmitEditing={handleLinkAccount}
        />

        <TouchableOpacity
          style={[
            styles.linkButton,
            { backgroundColor: primaryColor },
            loading && styles.disabledButton,
          ]}
          onPress={handleLinkAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.linkButtonText}>
              Link My Account
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.note, { color: mutedColor }]}>
          Your code can only be used once. Make sure you are using the
          code assigned to your own member record.
        </Text>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
</SafeAreaView>

);
}

const styles = StyleSheet.create({
safeArea: {
flex: 1,
},
flex: {
flex: 1,
},
scrollContent: {
flexGrow: 1,
padding: 20,
justifyContent: 'center',
},
header: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
marginBottom: 24,
},
backButton: {
paddingVertical: 8,
paddingRight: 12,
},
backText: {
fontSize: 16,
fontWeight: '600',
},
brand: {
fontSize: 21,
fontWeight: 'bold',
},
card: {
borderWidth: 1,
borderRadius: 18,
padding: 24,
width: '100%',
maxWidth: 500,
alignSelf: 'center',
},
icon: {
fontSize: 36,
textAlign: 'center',
marginBottom: 12,
},
title: {
fontSize: 24,
fontWeight: 'bold',
textAlign: 'center',
marginBottom: 12,
},
description: {
fontSize: 14,
lineHeight: 22,
textAlign: 'center',
marginBottom: 26,
},
label: {
fontSize: 14,
fontWeight: '600',
marginBottom: 8,
},
input: {
borderWidth: 1,
borderRadius: 10,
paddingHorizontal: 14,
paddingVertical: 13,
fontSize: 15,
marginBottom: 18,
},
linkButton: {
minHeight: 48,
borderRadius: 10,
alignItems: 'center',
justifyContent: 'center',
padding: 12,
},
disabledButton: {
opacity: 0.65,
},
linkButtonText: {
color: '#FFFFFF',
fontSize: 16,
fontWeight: 'bold',
},
note: {
fontSize: 12,
lineHeight: 18,
textAlign: 'center',
marginTop: 18,
},
});