import { useEffect, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

const API_URL = 'https://ikonek-app.onrender.com';

export default function ForgotPasswordScreen({ onNavigateToSignIn }) {
  const { isDarkMode, colors } = useTheme();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const theme = {
    background: colors.bg,
    title: colors.text,
    text: colors.text,
    secondaryText: colors.muted,
    inputBackground: colors.card,
    inputText: colors.text,
    border: colors.border,
    primary: colors.primary || '#2563EB',
    buttonText: colors.buttonText,
    icon: colors.muted,
  };

  const styles = createStyles(theme);

  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds > 0]);

  const formatCountdown = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleSendResetCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    if (loading) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        Alert.alert('Error', data?.message || 'Unable to request password recovery. Please try again.');
        return;
      }
      setEmail(cleanEmail);
      setStep(2);
      setOtpCode('');
      setCooldownSeconds(
        Number.isFinite(Number(data?.retryAfterSeconds))
          ? Math.max(0, Number(data.retryAfterSeconds))
          : 600
      );
      Alert.alert('Check your email', data?.message || 'If an account exists for this email, a recovery code has been sent.');
    } catch (error) {
      console.error('Request password reset error:', error);
      Alert.alert('Connection Error', 'Unable to connect to iKonek. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    if (loading || cooldownSeconds > 0) return;
    const cleanEmail = email.trim().toLowerCase();
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (Number(data?.retryAfterSeconds) > 0) {
          setCooldownSeconds(Number(data.retryAfterSeconds));
        }
        Alert.alert('Unable to resend code', data?.message || 'Please wait before requesting another code.');
        return;
      }
      setOtpCode('');
      setCooldownSeconds(
        Number.isFinite(Number(data?.retryAfterSeconds))
          ? Math.max(0, Number(data.retryAfterSeconds))
          : 600
      );
      Alert.alert('Recovery code requested', data?.message || 'If an account exists for this email, a new recovery code has been sent.');
    } catch (error) {
      console.error('Resend password reset code error:', error);
      Alert.alert('Connection Error', 'Unable to connect to iKonek. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const cleanCode = otpCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      Alert.alert('Error', 'Enter the 6-digit code sent to your email.');
      return;
    }
    if (loading) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/verify-password-reset`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: cleanCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        Alert.alert('Error', data?.message || 'The code is invalid or expired.');
        return;
      }
      setStep(3);
    } catch (error) {
      console.error('Verify password reset code error:', error);
      Alert.alert('Connection Error', 'Unable to connect to iKonek. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Your new password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (loading) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otpCode.trim(),
          newPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        Alert.alert('Error', data?.message || 'Unable to reset password. Please request a new recovery code.');
        return;
      }
      Alert.alert('Password Updated', 'Your password has been updated. You can now sign in with your new password.', [
        { text: 'Sign In', onPress: () => {
          if (typeof onNavigateToSignIn === 'function') onNavigateToSignIn();
        }},
      ]);
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Connection Error', 'Unable to connect to iKonek. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    if (
      typeof onNavigateToSignIn ===
      'function'
    ) {
      onNavigateToSignIn();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.content}>
        <Text style={styles.title}>
          Forgot Password
        </Text>

        {step === 1 && (
          <>
            <Text style={styles.label}>
              Email Address
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter registered email"
              placeholderTextColor={
                theme.secondaryText
              }
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSendResetCode}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to {email}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={
                theme.secondaryText
              }
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleVerifyCode}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.subtitle}>
              {cooldownSeconds > 0
                ? `You can request a new recovery code in ${formatCountdown(cooldownSeconds)}.`
                : 'You can request a new recovery code now.'}
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, cooldownSeconds > 0 && { opacity: 0.45 }]}
              onPress={handleResendResetCode}
              disabled={loading || cooldownSeconds > 0}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>
                {loading ? 'Sending...' : cooldownSeconds > 0
                  ? `Resend Code (${formatCountdown(cooldownSeconds)})`
                  : 'Resend Verification Code'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.label}>
              New Password
            </Text>

            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                placeholderTextColor={
                  theme.secondaryText
                }
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() =>
                  setShowPassword(!showPassword)
                }
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={20}
                  color={theme.icon}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>
              Confirm New Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={
                theme.secondaryText
              }
              secureTextEntry={!showPassword}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleResetPassword}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>
                {loading ? 'Updating...' : 'Reset Password'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBackToSignIn}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={theme.secondaryText}
          />

          <Text style={styles.backText}>
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },

    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
    },

    title: {
      color: theme.title,
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
    },

    subtitle: {
      color: theme.secondaryText,
      fontSize: 14,
      marginBottom: 16,
      lineHeight: 20,
    },

    label: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 8,
      marginBottom: 4,
    },

    input: {
      backgroundColor: theme.inputBackground,
      color: theme.inputText,
      padding: 12,
      borderRadius: 8,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 8,
    },

    passwordWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.inputBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 8,
    },

    passwordInput: {
      flex: 1,
      color: theme.inputText,
      padding: 12,
      fontSize: 14,
    },

    eyeIcon: {
      paddingHorizontal: 12,
    },

    primaryBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },

    btnText: {
      color: theme.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },

    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      paddingVertical: 8,
    },

    backText: {
      color: theme.secondaryText,
      fontSize: 14,
      marginLeft: 2,
    },
  });