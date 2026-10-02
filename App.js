import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';

import SignInScreen from './src/screens/SignIn';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotScreen from './src/screens/ForgotScreen';
import BibleScreen from './src/screens/BibleScreen';
import EventsScreen from './src/screens/EventsScreen';
import PrayerJournalScreen from './src/screens/PrayerJournalScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('SignIn');

  // Function para mag-logout na naka-English na ang mensahe
  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: () => setCurrentScreen('SignIn') 
        }
      ]
    );
  };

  const navigation = {
    navigate: (screenName) => {
      setCurrentScreen(screenName);
    },
    goBack: () => setCurrentScreen('Bible'),
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'SignIn':
        return (
          <SignInScreen
            onSignIn={() => setCurrentScreen('Bible')}
            onNavigateToRegister={() => setCurrentScreen('Register')}
            onNavigateToForgot={() => setCurrentScreen('Forgot')}
          />
        );
      case 'Register':
        return <RegisterScreen onNavigateToSignIn={() => setCurrentScreen('SignIn')} />;
      case 'Forgot':
        return <ForgotScreen onNavigateToSignIn={() => setCurrentScreen('SignIn')} />;
      case 'Bible':
        return <BibleScreen navigation={navigation} />;
      case 'Events':
        return <EventsScreen navigation={navigation} />;
      case 'Journal':
        return <PrayerJournalScreen navigation={navigation} />;
      case 'Attendance':
        return <AttendanceScreen navigation={navigation} />;
      default:
        return <BibleScreen navigation={navigation} />;
    }
  };

  const isAuthScreen = ['SignIn', 'Register', 'Forgot'].includes(currentScreen);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER NA MAY LOGOUT BUTTON SA ITAAS */}
      {!isAuthScreen && (
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>IKONEK</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* BOTTOM NAVIGATION BAR */}
      {!isAuthScreen && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItemButton}
            onPress={() => setCurrentScreen('Bible')}
          >
            <Text style={[styles.navText, currentScreen === 'Bible' && styles.activeNavText]}>
              📖 Bible
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItemButton}
            onPress={() => setCurrentScreen('Events')}
          >
            <Text style={[styles.navText, currentScreen === 'Events' && styles.activeNavText]}>
              📅 Events
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItemButton}
            onPress={() => setCurrentScreen('Journal')}
          >
            <Text style={[styles.navText, currentScreen === 'Journal' && styles.activeNavText]}>
              📓 Journal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItemButton}
            onPress={() => setCurrentScreen('Attendance')}
          >
            <Text style={[styles.navText, currentScreen === 'Attendance' && styles.activeNavText]}>
              📋 Attendance
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItemButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeNavText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});