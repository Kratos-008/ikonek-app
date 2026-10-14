import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://ikonek-app.onrender.com';

export default function SignInScreen({
  onSignIn,
  onNavigateToRegister,
  onNavigateToForgot,
}) {
  const { colors, isDarkMode } = useTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // LOGIN
  // ==========================================
  const handleLogin = async () => {
    const inputClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    if (!inputClean || !passClean) {
      Alert.alert(
        'Error',
        'Please enter both Email and Password.'
      );
      return;
    }

    if (loading) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: inputClean,
            password: passClean,
          }),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(
          'The server returned an invalid response.'
        );
      }

      console.log('LOGIN STATUS:', response.status);
      console.log('LOGIN RESPONSE:', data);

      if (!response.ok) {
        Alert.alert(
          'Sign In Error',
          data?.message ||
            'Invalid email or password.'
        );
        return;
      }

      if (!data?.token || !data?.user) {
        Alert.alert(
          'Sign In Error',
          'The server did not return valid login information.'
        );
        return;
      }

      // ==========================================
      // SAVE JWT TOKEN
      // ==========================================
      await AsyncStorage.setItem(
        '@ikonek_token',
        data.token
      );

      // ==========================================
      // SAVE USER INFORMATION
      // ==========================================
      await AsyncStorage.setItem(
        '@ikonek_user',
        JSON.stringify(data.user)
      );

      // ==========================================
      // CONTINUE TO APP
      // ==========================================
      onSignIn(data.user);

    } catch (error) {
      console.error('Login error:', error);

      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // THEME-AWARE STYLES
  // ==========================================
  const styles = createStyles(colors);

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

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={styles.content}
      >
        {/* ======================================
            LOGO
        ====================================== */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* ======================================
            INPUTS
        ====================================== */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={colors.muted}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={styles.label}>
            Password
          </Text>

          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() =>
                setShowPassword(!showPassword)
              }
              disabled={loading}
            >
              <Ionicons
                name={
                  showPassword
                    ? 'eye-outline'
                    : 'eye-off-outline'
                }
                size={20}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>

          {/* ======================================
              FORGOT PASSWORD
          ====================================== */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={onNavigateToForgot}
            disabled={loading}
          >
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================
            SIGN IN BUTTON
        ====================================== */}
        <TouchableOpacity
          style={[
            styles.signInBtn,
            loading && styles.signInBtnDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.signInBtnText}>
            {loading
              ? 'Signing In...'
              : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {/* ======================================
            CREATE ACCOUNT
        ====================================== */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
          </Text>

          <TouchableOpacity
            onPress={onNavigateToRegister}
            disabled={loading}
          >
            <Text style={styles.createAccountText}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ======================================================
// STYLES
// ======================================================
const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },

    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
    },

    logoContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },

    logo: {
      width: 220,
      height: 220,
    },

    inputContainer: {
      gap: 8,
      marginBottom: 24,
    },

    label: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 8,
    },

    input: {
      backgroundColor: theme.card,
      color: theme.text,
      padding: 12,
      borderRadius: 8,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },

    passwordWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },

    passwordInput: {
      flex: 1,
      color: theme.text,
      padding: 12,
      fontSize: 14,
    },

    eyeIcon: {
      paddingHorizontal: 12,
    },

    forgotBtn: {
      alignSelf: 'flex-end',
      marginTop: 4,
    },

    forgotText: {
      color: theme.primary || '#3B82F6',
      fontSize: 13,
      fontWeight: '500',
    },

    signInBtn: {
      backgroundColor: theme.primary || '#2563EB',
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },

    signInBtnDisabled: {
      opacity: 0.6,
    },

    signInBtnText: {
      color: theme.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },

    footerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },

    footerText: {
      color: theme.muted,
      fontSize: 14,
    },

    createAccountText: {
      color: theme.primary || '#3B82F6',
      fontSize: 14,
      fontWeight: 'bold',
    },
  });