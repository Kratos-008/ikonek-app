import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({
  onNavigateToSignIn,
}) {
  const { isDarkMode, colors } = useTheme();

  const [step, setStep] = useState('register');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [enteredCode, setEnteredCode] = useState('');
  const [loading, setLoading] = useState(false);

  const [resendAvailableAt, setResendAvailableAt] =
    useState(null);

  const [resendSeconds, setResendSeconds] =
    useState(0);

  const API_URL = 'https://ikonek-app.onrender.com';

  const styles = createStyles(colors);

  // ==========================================
  // RESEND COUNTDOWN
  // ==========================================
  useEffect(() => {
    if (!resendAvailableAt) {
      setResendSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (new Date(resendAvailableAt).getTime() -
            Date.now()) /
            1000
        )
      );

      setResendSeconds(seconds);

      if (seconds === 0) {
        setResendAvailableAt(null);
      }
    };

    updateCountdown();

    const timer = setInterval(
      updateCountdown,
      1000
    );

    return () => clearInterval(timer);
  }, [resendAvailableAt]);

  // ==========================================
  // 1. SEND VERIFICATION CODE
  // ==========================================
  const handleSendVerificationCode = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'Error',
        'Please fill in all fields.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Error',
        'Passwords do not match.'
      );
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Existing account that has not been verified
        if (
          data?.code ===
          'EMAIL_NOT_VERIFIED'
        ) {
          setEnteredCode('');

          setResendAvailableAt(
            data?.verificationExpiresAt ||
              null
          );

          setStep('verify');

          Alert.alert(
            'Email Not Verified',
            data?.message ||
              'This email is already registered but has not been verified yet.',
            [
              {
                text: 'Enter Code',
                style: 'cancel',
              },
            ]
          );

          return;
        }

        Alert.alert(
          'Registration Failed',
          data?.message ||
            'Failed to create account.'
        );

        return;
      }

      setEnteredCode('');

      setResendAvailableAt(
        data?.verificationExpiresAt ||
          null
      );

      setStep('verify');

      Alert.alert(
        'Check Your Email',
        `A 6-digit verification code was sent to ${email
          .trim()
          .toLowerCase()}.`
      );
    } catch (error) {
      console.error(
        'Registration error:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. VERIFY CODE
  // ==========================================
  const handleVerifyCode = async () => {
    if (enteredCode.length !== 6) {
      Alert.alert(
        'Error',
        'Please enter the 6-digit verification code.'
      );
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/verify-email`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            code: enteredCode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Verification Failed',
          data?.message ||
            'Invalid verification code.'
        );

        return;
      }

      Alert.alert(
        'Email Verified',
        'Your email has been verified. You can now sign in.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (
                typeof onNavigateToSignIn ===
                'function'
              ) {
                onNavigateToSignIn();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        'Verification error:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. RESEND CODE
  // ==========================================
  const handleResendCode = async () => {
    if (loading) return;

    if (resendSeconds > 0) {
      Alert.alert(
        'Please Wait',
        `You can request a new verification code after ${resendSeconds} second${
          resendSeconds === 1 ? '' : 's'
        }.`
      );

      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/resend-verification`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Resend Failed',
          data?.message ||
            'Could not resend the verification code.'
        );

        return;
      }

      setEnteredCode('');

      setResendAvailableAt(
        data?.verificationExpiresAt ||
          null
      );

      Alert.alert(
        'Code Sent',
        'A new verification code has been sent to your email. You can request another code after it expires in 10 minutes.'
      );
    } catch (error) {
      console.error(
        'Resend verification error:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // BACK TO SIGN IN
  // ==========================================
  const handleBack = () => {
    if (
      typeof onNavigateToSignIn ===
      'function'
    ) {
      onNavigateToSignIn();
    }
  };

  // ==========================================
  // VERIFICATION SCREEN
  // ==========================================
  if (step === 'verify') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={
            isDarkMode
              ? 'light-content'
              : 'dark-content'
          }
          backgroundColor={colors.bg}
        />

        <ScrollView
          contentContainerStyle={
            styles.scrollContainer
          }
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            Enter Verification Code
          </Text>

          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{' '}
            {email}
          </Text>

          <Text style={styles.label}>
            6-Digit Code
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            maxLength={6}
            value={enteredCode}
            onChangeText={setEnteredCode}
            editable={!loading}
          />

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              loading &&
                styles.disabledButton,
            ]}
            onPress={handleVerifyCode}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading
                ? 'Verifying...'
                : 'Verify Email'}
            </Text>
          </TouchableOpacity>

          {/* RESEND COUNTDOWN */}
          {resendSeconds > 0 ? (
            <View
              style={
                styles.resendCountdownContainer
              }
            >
              <Text
                style={
                  styles.resendCountdownText
                }
              >
                {`Resend available in ${Math.floor(
                  resendSeconds / 60
                )}:${String(
                  resendSeconds % 60
                ).padStart(2, '0')}`}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.backToSignContainer,
                loading &&
                  styles.disabledButton,
              ]}
              onPress={handleResendCode}
              disabled={loading}
            >
              <Text
                style={styles.backToSignText}
              >
                {loading
                  ? 'Sending...'
                  : 'Resend Verification Code'}
              </Text>
            </TouchableOpacity>
          )}

          {/* BACK TO SIGN IN */}
          <TouchableOpacity
            style={styles.backToSignContainer}
            onPress={handleBack}
          >
            <Text
              style={styles.backToSignText}
            >
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // REGISTRATION FORM
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={
          isDarkMode
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={colors.bg}
      />

      <ScrollView
        contentContainerStyle={
          styles.scrollContainer
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Create Account
        </Text>

        {/* FULL NAME */}
        <Text style={styles.label}>
          Full Name
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor={colors.muted}
          value={fullName}
          onChangeText={setFullName}
          editable={!loading}
        />

        {/* EMAIL */}
        <Text style={styles.label}>
          Email Address
        </Text>

        <TextInput
          style={styles.input}
          placeholder="example@gmail.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        {/* PASSWORD */}
        <Text style={styles.label}>
          Password
        </Text>

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor={
              colors.muted
            }
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          <TouchableOpacity
            onPress={() =>
              setShowPassword(
                !showPassword
              )
            }
            style={styles.eyeIcon}
            disabled={loading}
          >
            <Ionicons
              name={
                showPassword
                  ? 'eye-outline'
                  : 'eye-off-outline'
              }
              size={21}
              color={colors.muted}
            />
          </TouchableOpacity>
        </View>

        {/* CONFIRM PASSWORD */}
        <Text style={styles.label}>
          Confirm Password
        </Text>

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm your password"
            placeholderTextColor={
              colors.muted
            }
            secureTextEntry={
              !showConfirmPassword
            }
            value={confirmPassword}
            onChangeText={
              setConfirmPassword
            }
            editable={!loading}
          />

          <TouchableOpacity
            onPress={() =>
              setShowConfirmPassword(
                !showConfirmPassword
              )
            }
            style={styles.eyeIcon}
            disabled={loading}
          >
            <Ionicons
              name={
                showConfirmPassword
                  ? 'eye-outline'
                  : 'eye-off-outline'
              }
              size={21}
              color={colors.muted}
            />
          </TouchableOpacity>
        </View>

        {/* SEND VERIFICATION */}
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            loading &&
              styles.disabledButton,
          ]}
          onPress={
            handleSendVerificationCode
          }
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading
              ? 'Sending...'
              : 'Send Verification Code'}
          </Text>
        </TouchableOpacity>

        {/* BACK TO SIGN IN */}
        <TouchableOpacity
          style={styles.backToSignContainer}
          onPress={handleBack}
        >
          <Text
            style={styles.backToSignText}
          >
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ======================================================
// THEME-AWARE STYLES
// ======================================================
const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },

    scrollContainer: {
      paddingHorizontal: 24,
      paddingVertical: 20,
    },

    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },

    subtitle: {
      color: theme.muted,
      fontSize: 14,
      marginBottom: 24,
    },

    label: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },

    input: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 14,
      color: theme.text,
      fontSize: 14,
      marginBottom: 16,
    },

    passwordWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      marginBottom: 16,
      paddingHorizontal: 4,
    },

    passwordInput: {
      flex: 1,
      color: theme.text,
      padding: 14,
      fontSize: 14,
    },

    eyeIcon: {
      paddingHorizontal: 12,
    },

    primaryBtn: {
      backgroundColor:
        theme.primary || '#2563EB',

      paddingVertical: 16,
      borderRadius: 8,

      alignItems: 'center',

      marginTop: 10,
      marginBottom: 20,
    },

    btnText: {
      color: theme.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },

    backToSignContainer: {
      alignItems: 'center',
      paddingVertical: 10,
    },

    backToSignText: {
      color:
        theme.primary || '#38BDF8',

      fontSize: 14,
      fontWeight: '600',

      textDecorationLine:
        'underline',
    },

    resendCountdownContainer: {
      alignItems: 'center',
      marginTop: 18,
      marginBottom: 6,
    },

    resendCountdownText: {
      color: theme.muted,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },

    disabledButton: {
      opacity: 0.5,
    },
  });