import { useState } from 'react';

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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../context/ThemeContext';

export default function ForgotPasswordScreen({ onNavigateToSignIn }) {
  const { isDarkMode, colors } = useTheme();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
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
    codeBackground: isDarkMode ? '#1E293B' : '#EFF6FF',
    codeBorder: isDarkMode ? '#3B82F6' : '#93C5FD',
    codeNumber: isDarkMode ? '#38BDF8' : '#2563EB',
    icon: colors.muted,
  };

  const styles = createStyles(theme);

  const handleSendResetCode = async () => {
    const cleanEmail = email.trim().toLowerCase();

    // Correct email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    try {
      const storedData = await AsyncStorage.getItem('@ikonek_users');

      const users = storedData ? JSON.parse(storedData) : [];

      const userExists = users.some(
        (u) => u.email?.toLowerCase() === cleanEmail
      );

      if (!userExists) {
        Alert.alert(
          'Error',
          'No account found with this email address.'
        );
        return;
      }

      // Generate 6-digit code
      const code = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      setGeneratedOtp(code);
      setStep(2);

      Alert.alert(
        'Verification Code Sent',
        `Verification code sent to ${cleanEmail}.\n\nYour Code is: ${code}`
      );
    } catch (e) {
      console.error('Send reset code error:', e);

      Alert.alert(
        'Error',
        'An error occurred while checking account.'
      );
    }
  };

  const handleVerifyCode = () => {
    if (otpCode.trim() === generatedOtp) {
      setStep(3);
    } else {
      Alert.alert(
        'Error',
        'Invalid 6-digit verification code.'
      );
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert(
        'Error',
        'Please enter a new password.'
      );
      return;
    }

    if (
      newPassword.trim() !==
      confirmNewPassword.trim()
    ) {
      Alert.alert(
        'Error',
        'Passwords do not match.'
      );
      return;
    }

    try {
      const storedData = await AsyncStorage.getItem(
        '@ikonek_users'
      );

      let users = storedData
        ? JSON.parse(storedData)
        : [];

      const cleanEmail = email.trim().toLowerCase();

      users = users.map((u) => {
        if (u.email?.toLowerCase() === cleanEmail) {
          return {
            ...u,
            password: newPassword.trim(),
          };
        }

        return u;
      });

      await AsyncStorage.setItem(
        '@ikonek_users',
        JSON.stringify(users)
      );

      Alert.alert(
        'Success',
        'Password successfully reset!',
        [
          {
            text: 'Sign In Now',
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
    } catch (e) {
      console.error('Reset password error:', e);

      Alert.alert(
        'Error',
        'Failed to update password.'
      );
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
                Send Verification Code
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to {email}
            </Text>

            <View style={styles.codeBanner}>
              <Text style={styles.codeBannerLabel}>
                Your Verification Code:
              </Text>

              <Text style={styles.codeBannerNumber}>
                {generatedOtp}
              </Text>
            </View>

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
                Verify Code
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
                Reset Password
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

    codeBanner: {
      backgroundColor: theme.codeBackground,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.codeBorder,
    },

    codeBannerLabel: {
      color: theme.secondaryText,
      fontSize: 12,
      marginBottom: 4,
    },

    codeBannerNumber: {
      color: theme.codeNumber,
      fontSize: 28,
      fontWeight: 'bold',
      letterSpacing: 4,
    },
  });