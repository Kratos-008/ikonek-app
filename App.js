
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import LinkMemberScreen from './src/screens/LinkMemberScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SignInScreen from './src/screens/SignIn';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotScreen from './src/screens/ForgotScreen';
import MainScreen from './src/screens/MainScreen';
import BibleScreen from './src/screens/BibleScreen';
import EventsScreen from './src/screens/EventsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PrayerJournalScreen from './src/screens/PrayerJournalScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import { AdminDashboard } from './src/screens/AdminDashboard';
import { registerAfterSignIn, registerForPushNotifications } from './src/services/pushNotifications';
import {
  clearStoredSession,
  isAdminUser,
  loadStoredSession,
  signOutCleanup,
  verifySession,
} from './src/services/session';
import usePushLifecycle from './src/hooks/usePushLifecycle';

// ======================================================
// INTRO VIDEO SCREEN
// ======================================================
function IntroScreen({ onFinish }) {
  const player = useVideoPlayer(
    require('./assets/ikonek_intro_adapted.mp4'),
    (videoPlayer) => {
      videoPlayer.loop = false;
      videoPlayer.muted = false;
      videoPlayer.play();
    }
  );

  useEffect(() => {
    const subscription = player.addListener('playToEnd', onFinish);
    return () => subscription.remove();
  }, [player, onFinish]);

  return (
    <View style={introStyles.container}>
      <VideoView
        player={player}
        style={introStyles.video}
        contentFit="contain"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const introStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});

// ======================================================
// MAIN APP
// ======================================================
function AppContent() {
  const { colors, isDarkMode } = useTheme();

  const [showIntro, setShowIntro] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('SignIn');
  const [currentUser, setCurrentUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminYouthView, setAdminYouthView] = useState(false);
  // True until the saved login (if any) has been read from the phone.
  const [booting, setBooting] = useState(true);

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
  // SESSION: stay signed in until the user taps Log Out
  // ==========================================
  const performLogout = async ({ expired = false } = {}) => {
    try {
      // Removes this phone's push token from the server, cancels local
      // reminders and wipes the saved login (in that order).
      await signOutCleanup({ skipServer: expired });
    } catch (error) {
      console.warn('Sign-out cleanup failed:', error?.message || error);
      await clearStoredSession().catch(() => {});
    }

    setAdminYouthView(false);
    setCurrentUser(null);
    setCurrentScreen('SignIn');
    closeDrawer();

    if (expired) {
      Alert.alert('Session expired', 'Please sign in again.');
    }
  };

  // On launch, restore the saved login instead of always starting at Sign In.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await loadStoredSession();
        if (!stored) return;

        let user = stored.user;
        let checked = null;

        if (!user) {
          // A token without a saved profile: the server has to tell us who this is.
          checked = await verifySession(stored.token);
          if (checked.valid === false) await clearStoredSession();
          if (checked.valid !== true) return;
          user = checked.user;
        }
        if (cancelled) return;

        setCurrentUser(user);
        setCurrentScreen(isAdminUser(user) ? 'AdminDashboard' : 'Home');

        // Make sure this phone's push token is on the server for this account.
        registerForPushNotifications({ prompt: false, force: true }).catch((error) => {
          console.warn('Push notification registration failed:', error?.message || error);
        });

        // Open the app right away, then confirm the login in the background.
        if (!checked) {
          verifySession(stored.token).then((result) => {
            if (cancelled) return;
            if (result.valid === false) {
              performLogout({ expired: true });
            } else if (result.valid === true) {
              setCurrentUser((previous) => (previous ? { ...previous, ...result.user } : previous));
            }
          });
        }
      } catch (error) {
        console.warn('Could not restore the saved session:', error?.message || error);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once on launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tapping a notification opens the right screen; keeps the push token fresh.
  usePushLifecycle({
    user: currentUser,
    onOpenScreen: (screenName) => {
      setDrawerOpen(false);
      setCurrentScreen(screenName);
    },
  });

  // ==========================================
  // LOGOUT
  // ==========================================
  const handleLogout = () => {
    setAdminYouthView(false);

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
            performLogout();
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
    console.log('Logged-in user:', {
      id: user?.id,
      role: user?.role,
    });

    setCurrentUser(user);

    registerAfterSignIn().catch((error) => {
      // Push registration is optional; a network or permission issue must not block sign-in.
      console.warn('Push notification registration failed:', error.message);
    });

    const role = String(user?.role || '').trim().toLowerCase();

    if (role === 'admin' || role === 'superadmin') {
      setCurrentScreen('AdminDashboard');
    } else {
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
                setAdminYouthView(true);
                setDrawerOpen(false);
                setCurrentScreen('Home');
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
        return <BibleScreen navigation={navigation} />;

      case 'Events':
        return <EventsScreen navigation={navigation} />;

      case 'Notifications':
        return <NotificationsScreen navigation={navigation} />;

      case 'Journal':
        return (
          <PrayerJournalScreen navigation={navigation} />
        );

      case 'Attendance':
        return <AttendanceScreen navigation={navigation} />;

      case 'Profile':
        return (
          <ProfileScreen
            user={currentUser}
            navigation={navigation}
          />
        );

      case 'LinkMember':
        return (
          <LinkMemberScreen
            onCancel={() => setCurrentScreen('Home')}
            onLinked={(user) => {
              setCurrentUser(user);
              setCurrentScreen('Home');
            }}
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

  // Play intro before showing Sign In.
  if (showIntro) {
    return (
      <IntroScreen
        onFinish={() => setShowIntro(false)}
      />
    );
  }

  // Wait until the saved login has been checked, so a signed-in user never
  // sees the Sign In screen flash by.
  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

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

        {adminYouthView && (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              right: 12,
              bottom: 34,
              alignItems: 'flex-end',
              zIndex: 999,
              elevation: 999,
            }}
          >
            {/* Admin preview indicator */}
            <View
              style={{
                backgroundColor: '#102A43',
                borderWidth: 1,
                borderColor: '#2875F5',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                marginBottom: 7,
              }}
            >
              <Text
                style={{
                  color: '#93C5FD',
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1,
                }}
              >
                ADMIN VIEW
              </Text>
            </View>

            {/* Compact return button */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Return to Admin Dashboard"
              style={{
                backgroundColor: '#075985',
                paddingVertical: 10,
                paddingHorizontal: 15,
                borderRadius: 24,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.22,
                shadowRadius: 5,
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                elevation: 6,
              }}
              onPress={() => {
                setAdminYouthView(false);
                setDrawerOpen(false);
                setCurrentScreen('AdminDashboard');
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  marginRight: 6,
                }}
              >
                ⚙
              </Text>

              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: 13,
                }}
              >
                Admin
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ======================================
          NORMAL USER SLIDE DRAWER
      ====================================== */}
      <Modal
        visible={!isAuthScreen && !isAdminScreen && drawerOpen}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={styles.drawerModalRoot}>
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
            {/* PROFILE HEADER */}
            <View style={styles.drawerHeader}>
              <Pressable
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => navigateFromDrawer('Profile')}
                accessibilityRole="button"
                accessibilityLabel="Open My Profile"
              >
                <View style={styles.drawerLogoCircle}>
                  <Text style={styles.drawerLogoLetter}>
                    {(currentUser?.name || 'U')
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0] || '')
                      .join('')
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.drawerTitle}
                    numberOfLines={1}
                  >
                    {currentUser?.name || 'My Profile'}
                  </Text>

                  <Text style={styles.drawerSubtitle}>
                    {String(currentUser?.role || 'YOUTH').replace(/_/g, ' ')} · View Profile
                  </Text>
                </View>
              </Pressable>

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
              ['LinkMember', 'link-outline'],
            ].map(([screen, icon]) => (
              <TouchableOpacity
                key={screen}
                style={[
                  styles.drawerItem,
                  currentScreen === screen &&
                    styles.drawerItemActive,
                ]}
                onPress={() => navigateFromDrawer(screen)}
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
                    : icon === 'clipboard-outline'
                    ? '📋'
                    : '🔗'}
                </Text>

                <Text
                  style={[
                    styles.drawerItemText,
                    currentScreen === screen &&
                      styles.drawerItemTextActive,
                  ]}
                >
                  {screen === 'LinkMember'
                    ? 'Link My Account'
                    : screen}
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
        </View>
      </Modal>
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

    drawerModalRoot: {
      flex: 1,
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
    },

    drawerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.48)',
    },

    drawer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: '78%',
      maxWidth: 360,

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
      flexShrink: 1,
      minWidth: 0,
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
      flexShrink: 1,
      minWidth: 0,
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
