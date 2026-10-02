import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignInScreen({
  onSignIn,
  onNavigateToRegister,
  onNavigateToForgot,
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const inputClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    if (!inputClean || !passClean) {
      Alert.alert('Error', 'Please enter both Email and Password.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        'http://192.168.1.36:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: inputClean,
            password: passClean,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Sign In Error',
          data.message || 'Invalid email or password.'
        );
        return;
      }

      // Save the JWT token
      await AsyncStorage.setItem('@ikonek_token', data.token);

      // Save the logged-in user's information
      await AsyncStorage.setItem(
        '@ikonek_user',
        JSON.stringify(data.user)
      );

      // Continue to the main app
      onSignIn(data.user);
    } catch (error) {
      console.error('Login error:', error);

      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Make sure the backend is running and your phone is connected to the same Wi-Fi as your computer.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#64748B"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#64748B"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={onNavigateToForgot}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.signInBtn,
            loading && styles.signInBtnDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.signInBtnText}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't have an account? </Text>

          <TouchableOpacity onPress={onNavigateToRegister}>
            <Text style={styles.createAccountText}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },

  input: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },

  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },

  passwordInput: {
    flex: 1,
    color: '#FFFFFF',
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
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '500',
  },

  signInBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  signInBtnDisabled: {
    opacity: 0.6,
  },

  signInBtnText: {
    color: '#FFFFFF',
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
    color: '#94A3B8',
    fontSize: 14,
  },

  createAccountText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
});