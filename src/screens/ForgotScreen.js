import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ForgotPasswordScreen({ onNavigateToSignIn }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Verification Code, 3: New Password
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSendResetCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    try {
      const storedData = await AsyncStorage.getItem('@ikonek_users');
      const users = storedData ? JSON.parse(storedData) : [];

      const userExists = users.some((u) => u.email.toLowerCase() === cleanEmail);
      if (!userExists) {
        Alert.alert('Error', 'No account found with this email address.');
        return;
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setStep(2);

      Alert.alert(
        'Verification Code Sent',
        `Verification code sent to ${cleanEmail}.\n\nYour Code is: ${code}`
      );
    } catch (e) {
      Alert.alert('Error', 'An error occurred while checking account.');
    }
  };

  const handleVerifyCode = () => {
    if (otpCode.trim() === generatedOtp) {
      setStep(3);
    } else {
      Alert.alert('Error', 'Invalid 6-digit verification code.');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password.');
      return;
    }
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      const storedData = await AsyncStorage.getItem('@ikonek_users');
      let users = storedData ? JSON.parse(storedData) : [];

      const cleanEmail = email.trim().toLowerCase();

      users = users.map((u) => {
        if (u.email.toLowerCase() === cleanEmail) {
          return { ...u, password: newPassword.trim() };
        }
        return u;
      });

      await AsyncStorage.setItem('@ikonek_users', JSON.stringify(users));

      Alert.alert('Success', 'Password successfully reset!', [
        { text: 'Sign In Now', onPress: () => {
            if (typeof onNavigateToSignIn === 'function') {
              onNavigateToSignIn();
            }
          } 
        },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to update password.');
    }
  };

  // Universal function para bumalik sa Sign In
  const handleBackToSignIn = () => {
    if (typeof onNavigateToSignIn === 'function') {
      onNavigateToSignIn();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password</Text>

        {step === 1 && (
          <>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter registered email"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSendResetCode}>
              <Text style={styles.btnText}>Send Verification Code</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>

            <View style={styles.codeBanner}>
              <Text style={styles.codeBannerLabel}>Your Verification Code:</Text>
              <Text style={styles.codeBannerNumber}>{generatedOtp}</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor="#64748B"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyCode}>
              <Text style={styles.btnText}>Verify Code</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#64748B"
              secureTextEntry={!showPassword}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword}>
              <Text style={styles.btnText}>Reset Password</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.backBtn} onPress={handleBackToSignIn}>
          <Text style={styles.backText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { color: '#94A3B8', fontSize: 14, marginBottom: 16 },
  label: { color: '#F8FAFC', fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  passwordInput: { flex: 1, color: '#FFFFFF', padding: 12, fontSize: 14 },
  eyeIcon: { paddingHorizontal: 12 },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  backBtn: { alignItems: 'center', marginTop: 16 },
  backText: { color: '#94A3B8', fontSize: 14 },
  codeBanner: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  codeBannerLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  codeBannerNumber: { color: '#38BDF8', fontSize: 28, fontWeight: 'bold', letterSpacing: 4 },
});