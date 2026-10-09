import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import SignInScreen from './src/screens/SignIn';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotScreen from './src/screens/ForgotScreen';
import MainScreen from './src/screens/MainScreen';
import BibleScreen from './src/screens/BibleScreen';
import EventsScreen from './src/screens/EventsScreen';
import PrayerJournalScreen from './src/screens/PrayerJournalScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import { AdminDashboard } from './src/screens/AdminDashboard';

function AppContent() {
  const { colors, isDarkMode } = useTheme();

  const [currentScreen, setCurrentScreen] = useState('SignIn');
  const [currentUser, setCurrentUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerX = useRef(
    new Animated.Value(-Dimensions.get('window').width * 0.78)
  ).current;

  useEffect(() => {
    Animated.timing(drawerX, {
      toValue: drawerOpen
        ? 0
        : -Dimensions.get('window').width * 0.78,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerX]);

  const closeDrawer = () => setDrawerOpen(false);

  const navigateFromDrawer = (screenName) => {
    setCurrentScreen(screenName);
    closeDrawer();
  };

  // ==========================================
  // LOGOUT
  // ==========================================
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            setCurrentUser(null);
            setCurrentScreen('SignIn');
            closeDrawer();
          },
        },
      ]
    );
  };

  // ==========================================
  // NAVIGATION
  // ==========================================
  const navigation = {
    navigate: (screenName) => {
      setDrawerOpen(false);
      setCurrentScreen(screenName);
    },

    goBack: () => {
      setDrawerOpen(false);
      setCurrentScreen('Home');
    },
  };

  // ==========================================
  // LOGIN SUCCESS
  // ==========================================
  const handleSignIn = (user) => {
    console.log('Logged-in user:', user);

    setCurrentUser(user);

    // Admin accounts go to Admin Dashboard
    if (
      user?.role === 'admin' ||
      user?.role === 'superadmin'
    ) {
      setCurrentScreen('AdminDashboard');
    } else {
      // Regular users go to normal app
      setCurrentScreen('Home');
    }
  };

  // ==========================================
  // RENDER SCREEN
  // ==========================================
  const renderScreen = () => {
    switch (currentScreen) {
      case 'SignIn':
        return (
          <SignInScreen
            onSignIn={handleSignIn}
            onNavigateToRegister={() =>
              setCurrentScreen('Register')
            }
            onNavigateToForgot={() =>
              setCurrentScreen('Forgot')
            }
          />
        );

      case 'Register':
        return (
          <RegisterScreen
            onNavigateToSignIn={() =>
              setCurrentScreen('SignIn')
            }
          />
        );

      case 'Forgot':
        return (
          <ForgotScreen
            onNavigateToSignIn={() =>
              setCurrentScreen('SignIn')
            }
          />
        );

      case 'AdminDashboard':
        return (
          <AdminDashboard
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={(screen) => {
              if (screen === 'youthDashboard') {
                setCurrentScreen('Bible');
              }
            }}
          />
        );

      case 'Home':
        return (
          <MainScreen
            navigation={navigation}
            user={currentUser}
            onLogout={handleLogout}
            onOpenDrawer={() => setDrawerOpen(true)}
          />
        );

      case 'Bible':
        return (
          <BibleScreen navigation={navigation} />
        );

      case 'Events':
        return (
          <EventsScreen navigation={navigation} />
        );

      case 'Journal':
        return (
          <PrayerJournalScreen
            navigation={navigation}
          />
        );

      case 'Attendance':
        return (
          <AttendanceScreen
            navigation={navigation}
          />
        );

      default:
        return (
          <MainScreen
            navigation={navigation}
            user={currentUser}
            onLogout={handleLogout}
          />
        );
    }
  };

  // ==========================================
  // SCREEN TYPES
  // ==========================================
  const isAuthScreen = [
    'SignIn',
    'Register',
    'Forgot',
  ].includes(currentScreen);

  const isAdminScreen =
    currentScreen === 'AdminDashboard';

  // ==========================================
  // THEME-AWARE STYLES
  // ==========================================
  const styles = createStyles(colors, isDarkMode);

  return (
    <SafeAreaView style={styles.container}>
      
      {/* ======================================
          SCREEN
      ====================================== */}
      <View
        style={[
          styles.screenContainer,
          isAdminScreen && styles.adminScreenContainer,
        ]}
      >
        {renderScreen()}
      </View>

      {/* ======================================
          NORMAL USER SLIDE DRAWER
      ====================================== */}
      {!isAuthScreen && !isAdminScreen && drawerOpen && (
        <>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.drawerBackdrop}
            onPress={closeDrawer}
          />

          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [{ translateX: drawerX }],
              },
            ]}
          >
            {/* DRAWER HEADER */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerLogoCircle}>
                <Text style={styles.drawerLogoLetter}>
                  I
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.drawerTitle}>
                  IKONEK
                </Text>

                <Text style={styles.drawerSubtitle}>
                  YOUTH CONNECT
                </Text>
              </View>

              <Pressable
                style={styles.drawerClose}
                onPress={closeDrawer}
                onPressIn={closeDrawer}
                hitSlop={12}
                android_ripple={{
                  color: isDarkMode
                    ? '#243B60'
                    : '#CBD5E1',
                  borderless: false,
                }}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <Text
                  pointerEvents="none"
                  style={styles.drawerCloseText}
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <View style={styles.drawerDivider} />

            {/* DRAWER ITEMS */}
            {[
              ['Home', 'home-outline'],
              ['Bible', 'book-outline'],
              ['Events', 'calendar-outline'],
              ['Journal', 'journal-outline'],
              ['Attendance', 'clipboard-outline'],
            ].map(([screen, icon]) => (
              <TouchableOpacity
                key={screen}
                style={[
                  styles.drawerItem,
                  currentScreen === screen &&
                    styles.drawerItemActive,
                ]}
                onPress={() =>
                  navigateFromDrawer(screen)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.drawerIcon,
                    currentScreen === screen &&
                      styles.drawerIconActive,
                  ]}
                >
                  {icon === 'home-outline'
                    ? '⌂'
                    : icon === 'book-outline'
                    ? '📖'
                    : icon === 'calendar-outline'
                    ? '📅'
                    : icon === 'journal-outline'
                    ? '📓'
                    : '📋'}
                </Text>

                <Text
                  style={[
                    styles.drawerItemText,
                    currentScreen === screen &&
                      styles.drawerItemTextActive,
                  ]}
                >
                  {screen}
                </Text>
              </TouchableOpacity>
            ))}

            {/* LOGOUT */}
            <View style={styles.drawerBottom}>
              <TouchableOpacity
                style={styles.drawerLogout}
                onPress={handleLogout}
              >
                <Text style={styles.drawerLogoutIcon}>
                  ↪
                </Text>

                <Text style={styles.drawerLogoutText}>
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}

// ======================================================
// THEME-AWARE STYLES
// ======================================================
const createStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    screenContainer: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    adminScreenContainer: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    drawerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.48)',
      zIndex: 20,
      elevation: 10,
    },

    drawer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: '78%',

      backgroundColor: isDarkMode
        ? '#0B1A35'
        : '#FFFFFF',

      borderRightWidth: 1,

      borderRightColor: colors.border,

      paddingTop: 26,
      paddingHorizontal: 18,

      zIndex: 21,
      elevation: 30,

      shadowColor: '#000',
      shadowOffset: {
        width: 5,
        height: 0,
      },
      shadowOpacity: isDarkMode ? 0.3 : 0.15,
      shadowRadius: 12,
    },

    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },

    drawerLogoCircle: {
      width: 48,
      height: 48,
      borderRadius: 16,

      backgroundColor: '#2875F5',

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 12,
    },

    drawerLogoLetter: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
    },

    drawerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 1,
    },

    drawerSubtitle: {
      color: isDarkMode
        ? '#55A1FF'
        : '#2875F5',

      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginTop: 2,
    },

    drawerClose: {
      width: 38,
      height: 38,
      borderRadius: 12,

      backgroundColor: colors.card,

      borderWidth: 1,
      borderColor: colors.border,

      alignItems: 'center',
      justifyContent: 'center',

      zIndex: 40,
      elevation: 40,
    },

    drawerCloseText: {
      color: colors.muted,
      fontSize: 28,
      lineHeight: 30,
      fontWeight: '300',
    },

    drawerDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 18,
    },

    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',

      paddingVertical: 14,
      paddingHorizontal: 13,

      borderRadius: 14,
      marginBottom: 6,
    },

    drawerItemActive: {
      backgroundColor: isDarkMode
        ? '#16345F'
        : '#E8F1FF',
    },

    drawerIcon: {
      width: 30,

      color: colors.muted,

      fontSize: 20,
      textAlign: 'center',
      marginRight: 10,
    },

    drawerIconActive: {
      color: isDarkMode
        ? '#55A1FF'
        : '#2875F5',
    },

    drawerItemText: {
      color: colors.muted,
      fontSize: 15,
      fontWeight: '700',
    },

    drawerItemTextActive: {
      color: colors.text,
    },

    drawerBottom: {
      marginTop: 'auto',
      paddingBottom: 22,
    },

    drawerLogout: {
      flexDirection: 'row',
      alignItems: 'center',

      paddingVertical: 14,
      paddingHorizontal: 13,

      borderRadius: 14,

      backgroundColor: isDarkMode
        ? '#261B2A'
        : '#FFF1F2',

      borderWidth: 1,

      borderColor: isDarkMode
        ? '#4A2935'
        : '#FECDD3',
    },

    drawerLogoutIcon: {
      width: 30,

      color: '#FF6575',

      fontSize: 22,
      textAlign: 'center',
      marginRight: 10,
    },

    drawerLogoutText: {
      color: '#FF6575',
      fontSize: 15,
      fontWeight: '800',
    },
  });

// ======================================================
// THEME PROVIDER
// ======================================================
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}