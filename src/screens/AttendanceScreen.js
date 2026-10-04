import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Modal,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'https://ikonek-app.onrender.com';

const ATTENDANCE_STORAGE_KEY = '@youth_attendance_state';

export default function AttendanceScreen({ navigation }) {
  const [theme, setTheme] = useState('dark');

  const [youthList, setYouthList] = useState([]);
  const [loadingYouth, setLoadingYouth] = useState(true);

  // Local attendance state for now.
  // Youth profiles themselves are stored in PostgreSQL.
  const [attendanceState, setAttendanceState] = useState({});

  useEffect(() => {
    loadYouthData();
    loadAttendanceState();
    loadThemePreference();
  }, []);

  // =========================================================
  // AUTH TOKEN
  // =========================================================

  const getAuthToken = async () => {
    const token = await AsyncStorage.getItem('@ikonek_token');

    if (!token) {
      Alert.alert(
        'Authentication Required',
        'Please sign in again before managing youth profiles.'
      );
      return null;
    }

    return token;
  };

  // =========================================================
  // LOAD YOUTH FROM DATABASE
  // =========================================================

  const loadYouthData = async () => {
    try {
      setLoadingYouth(true);

      const token = await AsyncStorage.getItem('@ikonek_token');

      if (!token) {
        setYouthList([]);
        Alert.alert(
          'Authentication Required',
          'Please sign in again to load the youth list.'
        );
        return;
      }

      const response = await fetch(`${API_URL}/api/youth`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('Load youth API error:', data);

        if (response.status === 401) {
          Alert.alert(
            'Session Expired',
            'Please sign in again.'
          );
        } else {
          Alert.alert(
            'Error',
            data.message || 'Failed to load youth profiles.'
          );
        }

        setYouthList([]);
        return;
      }

      if (!data.success || !Array.isArray(data.youth)) {
        setYouthList([]);
        return;
      }

      // Convert database records into the format
      // already used by the existing UI.
      const formattedYouth = data.youth.map((item) => ({
        id: item.id,
        name: item.name || '',
        gender: item.gender || '',
        age:
          item.age !== null && item.age !== undefined
            ? String(item.age)
            : '',
        birthday: item.birthday || '',
        address: item.address || '',
        leader: item.cellLeader || 'N/A',
        category: item.category || 'Newbie',

        // Attendance is currently stored separately.
        status: attendanceState[item.id]?.status || 'Absent',
        presentCount: attendanceState[item.id]?.presentCount || 0,

        // YouthProfile currently has createdAt.
        date: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '',

        image: item.image || null,
      }));

      setYouthList(formattedYouth);
    } catch (error) {
      console.error('Failed to load youth data:', error);

      Alert.alert(
        'Connection Error',
        'Unable to connect to the church server.'
      );

      setYouthList([]);
    } finally {
      setLoadingYouth(false);
    }
  };

  // =========================================================
  // LOCAL ATTENDANCE STATE
  // =========================================================

  const loadAttendanceState = async () => {
    try {
      const saved = await AsyncStorage.getItem(
        ATTENDANCE_STORAGE_KEY
      );

      if (saved) {
        setAttendanceState(JSON.parse(saved));
      }
    } catch (error) {
      console.log(
        'Failed to load attendance state:',
        error
      );
    }
  };

  const saveAttendanceState = async (newState) => {
    try {
      setAttendanceState(newState);

      await AsyncStorage.setItem(
        ATTENDANCE_STORAGE_KEY,
        JSON.stringify(newState)
      );
    } catch (error) {
      console.log(
        'Failed to save attendance state:',
        error
      );
    }
  };

  // =========================================================
  // THEME
  // =========================================================

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(
        '@app_theme'
      );

      if (savedTheme !== null) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.log(
        'Failed to load theme:',
        error
      );
    }
  };

  const toggleTheme = async () => {
    const newTheme =
      theme === 'dark' ? 'light' : 'dark';

    setTheme(newTheme);

    await AsyncStorage.setItem(
      '@app_theme',
      newTheme
    );
  };

  const isDark = theme === 'dark';
  const currentStyles = isDark
    ? darkStyles
    : lightStyles;

  // =========================================================
  // SCREEN STATES
  // =========================================================

  const [activeView, setActiveView] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [sortAscending, setSortAscending] = useState(false);

  // QR Modal
  const [qrModalVisible, setQrModalVisible] =
    useState(false);
  const [selectedQRItem, setSelectedQRItem] =
    useState(null);

  // Camera
  const [scannerVisible, setScannerVisible] =
    useState(false);
  const [permission, requestPermission] =
    useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [leader, setLeader] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [dateAdded, setDateAdded] = useState('');
  const [currentCategory, setCurrentCategory] =
    useState('Newbie');

  // Calendar
  const [showBirthdayPicker, setShowBirthdayPicker] =
    useState(false);
  const [showDateAddedPicker, setShowDateAddedPicker] =
    useState(false);

  const [birthdayDateObj, setBirthdayDateObj] =
    useState(new Date(2004, 1, 20));

  const [dateAddedObj, setDateAddedObj] =
    useState(new Date());

  // =========================================================
  // QR SCANNER
  // =========================================================

  const openCameraScanner = async () => {
    if (!permission || !permission.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to scan QR codes.'
        );
        return;
      }
    }

    setScanned(false);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (scanned) return;

    setScanned(true);
    setScannerVisible(false);

    const youthIndex = youthList.findIndex(
      (item) => item.id === data
    );

    if (youthIndex === -1) {
      Alert.alert(
        'Not Found',
        `No youth found for this ID: ${data}`
      );
      return;
    }

    const currentItem = youthList[youthIndex];

    if (currentItem.status === 'Present') {
      Alert.alert(
        'Already Present',
        `${currentItem.name} is already marked as PRESENT.`
      );
      return;
    }

    const newCount =
      (currentItem.presentCount || 0) + 1;

    const newState = {
      ...attendanceState,
      [currentItem.id]: {
        status: 'Present',
        presentCount: newCount,
      },
    };

    await saveAttendanceState(newState);

    setYouthList((prev) =>
      prev.map((item) =>
        item.id === currentItem.id
          ? {
              ...item,
              status: 'Present',
              presentCount: newCount,
            }
          : item
      )
    );

    Alert.alert(
      'Success! 🎉',
      `${currentItem.name} is now marked as PRESENT. Total Presents: ${newCount}`
    );
  };

  // =========================================================
  // IMAGE PICKER
  // =========================================================

  const pickImageFromGallery = async () => {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhotoWithCamera = async () => {
    const cameraPerm =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!cameraPerm.granted) {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to take a photo.'
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // =========================================================
  // ADD YOUTH
  // =========================================================

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);

    setName('');
    setGender('');
    setAge('');
    setBirthday('Feb 20, 2004');
    setAddress('');
    setLeader('');
    setImageUri(null);
    setCurrentCategory('Newbie');

    const currentDateStr =
      new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

    setDateAdded(currentDateStr);
    setDateAddedObj(new Date());

    setModalVisible(true);
  };

  // =========================================================
  // EDIT YOUTH
  // =========================================================

  const handleOpenEdit = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);

    setName(item.name || '');
    setGender(item.gender || '');
    setAge(item.age || '');
    setBirthday(
      item.birthday || 'Feb 20, 2004'
    );
    setAddress(item.address || '');
    setLeader(item.leader || '');
    setImageUri(item.image || null);
    setCurrentCategory(
      item.category || 'Newbie'
    );

    setDateAdded(
      item.date ||
        new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
    );

    setModalVisible(true);
  };

  // =========================================================
  // SAVE YOUTH TO DATABASE
  // =========================================================

  const handleSaveYouth = async (
    selectedCategory
  ) => {
    if (!name.trim()) {
      Alert.alert(
        'Validation',
        'Please enter the Full Name.'
      );
      return;
    }

    const token = await getAuthToken();

    if (!token) return;

    const finalLeader =
      leader.trim() === '' ? 'N/A' : leader.trim();

    const numericAge =
      age.trim() === ''
        ? null
        : Number(age);

    if (
      numericAge !== null &&
      (!Number.isInteger(numericAge) ||
        numericAge < 1 ||
        numericAge > 120)
    ) {
      Alert.alert(
        'Validation',
        'Please enter a valid age between 1 and 120.'
      );
      return;
    }

    const payload = {
      name: name.trim(),
      gender: gender.trim() || null,
      age: numericAge,
      birthday: birthday.trim() || null,
      address: address.trim() || null,
      cellLeader: finalLeader,
      category: selectedCategory,
      image: imageUri || null,
    };

    try {
      let response;

      if (isEditing) {
        response = await fetch(
          `${API_URL}/api/youth/${currentId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(
          `${API_URL}/api/youth`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
      }

      const data = await response.json();

      if (!response.ok) {
        console.log(
          'Save youth API error:',
          data
        );

        if (response.status === 403) {
          Alert.alert(
            'Admin Access Required',
            'Only an administrator can add or edit youth profiles.'
          );
        } else if (response.status === 401) {
          Alert.alert(
            'Session Expired',
            'Please sign in again.'
          );
        } else {
          Alert.alert(
            'Error',
            data.message ||
              'Failed to save youth profile.'
          );
        }

        return;
      }

      if (!data.success || !data.youth) {
        Alert.alert(
          'Error',
          'The server did not return the saved youth profile.'
        );
        return;
      }

      const savedYouth = data.youth;

      const formattedYouth = {
        id: savedYouth.id,
        name: savedYouth.name || '',
        gender: savedYouth.gender || '',
        age:
          savedYouth.age !== null &&
          savedYouth.age !== undefined
            ? String(savedYouth.age)
            : '',
        birthday: savedYouth.birthday || '',
        address: savedYouth.address || '',
        leader:
          savedYouth.cellLeader || 'N/A',
        category:
          savedYouth.category || 'Newbie',

        status:
          isEditing &&
          attendanceState[savedYouth.id]
            ? attendanceState[savedYouth.id]
                .status
            : 'Absent',

        presentCount:
          isEditing &&
          attendanceState[savedYouth.id]
            ? attendanceState[savedYouth.id]
                .presentCount
            : 0,

        date: savedYouth.createdAt
          ? new Date(
              savedYouth.createdAt
            ).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : dateAdded,

        image: savedYouth.image || null,
      };

      if (isEditing) {
        setYouthList((prev) =>
          prev.map((item) =>
            item.id === savedYouth.id
              ? formattedYouth
              : item
          )
        );

        Alert.alert(
          'Success',
          'Youth profile updated successfully.'
        );
      } else {
        setYouthList((prev) => [
          ...prev,
          formattedYouth,
        ]);

        Alert.alert(
          'Success',
          'Youth profile added successfully.'
        );
      }

      setModalVisible(false);
    } catch (error) {
      console.error(
        'Save youth error:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Unable to connect to the church server.'
      );
    }
  };

  // =========================================================
  // DELETE YOUTH FROM DATABASE
  // =========================================================

  const handleDeleteYouth = (id, youthName) => {
    Alert.alert(
      'Delete Youth',
      `Are you sure you want to delete ${youthName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            const token =
              await getAuthToken();

            if (!token) return;

            try {
              const response =
                await fetch(
                  `${API_URL}/api/youth/${id}`,
                  {
                    method: 'DELETE',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type':
                        'application/json',
                    },
                  }
                );

              const data =
                await response.json();

              if (!response.ok) {
                console.log(
                  'Delete youth API error:',
                  data
                );

                if (
                  response.status === 403
                ) {
                  Alert.alert(
                    'Admin Access Required',
                    'Only an administrator can delete youth profiles.'
                  );
                } else if (
                  response.status === 401
                ) {
                  Alert.alert(
                    'Session Expired',
                    'Please sign in again.'
                  );
                } else {
                  Alert.alert(
                    'Error',
                    data.message ||
                      'Failed to delete youth profile.'
                  );
                }

                return;
              }

              // Remove from current UI
              setYouthList((prev) =>
                prev.filter(
                  (item) => item.id !== id
                )
              );

              // Also remove any temporary
              // attendance data for this youth.
              const newAttendanceState = {
                ...attendanceState,
              };

              delete newAttendanceState[id];

              await saveAttendanceState(
                newAttendanceState
              );

              Alert.alert(
                'Deleted',
                `${youthName} has been permanently deleted.`
              );
            } catch (error) {
              console.error(
                'Delete youth error:',
                error
              );

              Alert.alert(
                'Connection Error',
                'Unable to connect to the church server.'
              );
            }
          },
        },
      ]
    );
  };

  // =========================================================
  // ATTENDANCE STATUS
  // =========================================================

  const toggleAttendanceStatus = async (id) => {
    const currentItem = youthList.find(
      (item) => item.id === id
    );

    if (!currentItem) return;

    const newStatus =
      currentItem.status === 'Present'
        ? 'Absent'
        : 'Present';

    const newCount =
      newStatus === 'Present'
        ? (currentItem.presentCount || 0) + 1
        : Math.max(
            0,
            (currentItem.presentCount || 1) - 1
          );

    const newState = {
      ...attendanceState,
      [id]: {
        status: newStatus,
        presentCount: newCount,
      },
    };

    await saveAttendanceState(newState);

    setYouthList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
              presentCount: newCount,
            }
          : item
      )
    );
  };

  // =========================================================
  // MOVE TO REGULAR
  // =========================================================

  const moveToRegular = async (id) => {
    const token = await getAuthToken();

    if (!token) return;

    try {
      const response = await fetch(
        `${API_URL}/api/youth/${id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: 'Regular',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          Alert.alert(
            'Admin Access Required',
            'Only an administrator can change youth categories.'
          );
        } else {
          Alert.alert(
            'Error',
            data.message ||
              'Failed to move youth to Regular.'
          );
        }

        return;
      }

      setYouthList((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                category: 'Regular',
              }
            : item
        )
      );

      Alert.alert(
        'Success! 🚀',
        'Successfully moved this youth to Regular category.'
      );
    } catch (error) {
      console.error(
        'Move to regular error:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Unable to connect to the church server.'
      );
    }
  };

  // =========================================================
  // PRINT
  // =========================================================

  const printAttendanceReport = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body {
                font-family: Helvetica, Arial, sans-serif;
                padding: 20px;
                color: #333;
              }

              h1 {
                text-align: center;
                color: #2563EB;
                margin-bottom: 5px;
              }

              p {
                text-align: center;
                color: #666;
                margin-top: 0;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }

              th, td {
                border: 1px solid #CBD5E1;
                padding: 10px;
                text-align: left;
                font-size: 12px;
              }

              th {
                background-color: #F1F5F9;
                color: #0F172A;
              }

              .present {
                color: #16A34A;
                font-weight: bold;
              }

              .absent {
                color: #64748B;
                font-weight: bold;
              }
            </style>
          </head>

          <body>
            <h1>Youth Attendance Report</h1>

            <p>
              Generated on:
              ${new Date().toLocaleDateString()}
            </p>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Gender / Age</th>
                  <th>Cell Leader</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                ${youthList
                  .map(
                    (item) => `
                      <tr>
                        <td>
                          <b>${item.name}</b>
                          <br/>
                          <span style="font-size:10px; color:#666;">
                            ${item.address || ''}
                          </span>
                        </td>

                        <td>${item.category}</td>

                        <td>
                          ${item.gender || ''}
                          (${item.age || ''})
                        </td>

                        <td>
                          ${item.leader || 'N/A'}
                        </td>

                        <td class="${(
                          item.status || 'Absent'
                        ).toLowerCase()}">
                          ${item.status || 'Absent'}
                        </td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      await Print.printAsync({
        html: htmlContent,
      });
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to print attendance report.'
      );
    }
  };

  // =========================================================
  // COUNTS / FILTERING
  // =========================================================

  const newbieCount = youthList.filter(
    (y) => y.category === 'Newbie'
  ).length;

  const regularCount = youthList.filter(
    (y) => y.category === 'Regular'
  ).length;

  const allCount = youthList.length;

  const filteredList = youthList.filter(
    (item) => {
      const matchesCategory =
        activeView === 'All' ||
        item.category === activeView;

      const matchesSearch =
        (item.name || '')
          .toLowerCase()
          .includes(
            searchQuery.toLowerCase()
          );

      return (
        matchesCategory &&
        matchesSearch
      );
    }
  );

  const displayedYouthList = [
    ...filteredList,
  ].sort((a, b) => {
    if (searchQuery.trim() !== '') {
      const aStarts = a.name
        .toLowerCase()
        .startsWith(
          searchQuery.toLowerCase()
        );

      const bStarts = b.name
        .toLowerCase()
        .startsWith(
          searchQuery.toLowerCase()
        );

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    }

    if (sortAscending) {
      return a.name.localeCompare(
        b.name
      );
    }

    return 0;
  });

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <SafeAreaView
      style={[
        styles.container,
        currentStyles.container,
      ]}
    >
      <StatusBar
        barStyle={
          isDark
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={
          isDark
            ? '#0F172A'
            : '#F8FAFC'
        }
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          currentStyles.header,
        ]}
      >
        <TouchableOpacity
          onPress={() =>
            navigation &&
            navigation.goBack &&
            navigation.goBack()
          }
        >
          <Text
            style={[
              styles.backText,
              currentStyles.backText,
            ]}
          >
            ← Back
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            currentStyles.headerTitle,
          ]}
        >
          Attendance Tracker
        </Text>

        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.themeBtn}
            onPress={toggleTheme}
          >
            <Text style={styles.themeBtnText}>
              {isDark ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
      >
        {/* Search / Scan / Print */}
        <View style={styles.searchScanRow}>
          <TextInput
            style={[
              styles.searchInput,
              currentStyles.searchInput,
              {
                flex: 1,
                marginBottom: 0,
              },
            ]}
            placeholder="Search youth name..."
            placeholderTextColor={
              isDark
                ? '#64748B'
                : '#94A3B8'
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <TouchableOpacity
            style={styles.scanBtnHeader}
            onPress={openCameraScanner}
          >
            <Text style={styles.scanBtnHeaderText}>
              📷 Scan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.printBtnHeader}
            onPress={printAttendanceReport}
          >
            <Text style={styles.printBtnHeaderText}>
              🖨️ Print
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              currentStyles.filterChip,
              activeView === 'All' &&
                styles.filterActive,
            ]}
            onPress={() =>
              setActiveView('All')
            }
          >
            <Text
              style={[
                styles.filterText,
                currentStyles.filterText,
                activeView === 'All' &&
                  styles.filterActiveText,
              ]}
            >
              All ({allCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              currentStyles.filterChip,
              activeView === 'Newbie' &&
                styles.filterActive,
            ]}
            onPress={() =>
              setActiveView('Newbie')
            }
          >
            <Text
              style={[
                styles.filterText,
                currentStyles.filterText,
                activeView === 'Newbie' &&
                  styles.filterActiveText,
              ]}
            >
              Newbie ({newbieCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              currentStyles.filterChip,
              activeView === 'Regular' &&
                styles.filterActive,
            ]}
            onPress={() =>
              setActiveView('Regular')
            }
          >
            <Text
              style={[
                styles.filterText,
                currentStyles.filterText,
                activeView === 'Regular' &&
                  styles.filterActiveText,
              ]}
            >
              Regular ({regularCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              currentStyles.filterChip,
              sortAscending &&
                styles.filterActive,
            ]}
            onPress={() =>
              setSortAscending(
                !sortAscending
              )
            }
          >
            <Text
              style={[
                styles.filterText,
                currentStyles.filterText,
                sortAscending &&
                  styles.filterActiveText,
              ]}
            >
              {sortAscending
                ? 'AZ ✓'
                : 'AZ'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              styles.sectionTitle,
              currentStyles.sectionTitle,
            ]}
          >
            {activeView === 'All'
              ? 'All Youth List'
              : `${activeView} Members`}
          </Text>

          <Text style={styles.sectionCount}>
            Total: {displayedYouthList.length}
          </Text>
        </View>

        {/* Loading */}
        {loadingYouth ? (
          <View
            style={styles.emptyContainer}
          >
            <Text
              style={[
                styles.emptyText,
                currentStyles.emptyText,
              ]}
            >
              Loading youth list...
            </Text>
          </View>
        ) : displayedYouthList.length ===
          0 ? (
          <View
            style={styles.emptyContainer}
          >
            <Text
              style={[
                styles.emptyText,
                currentStyles.emptyText,
              ]}
            >
              No youth found in this category.
            </Text>
          </View>
        ) : (
          displayedYouthList.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                currentStyles.card,
              ]}
            >
              <View
                style={styles.cardTopRow}
              >
                {item.image ? (
                  <Image
                    source={{
                      uri: item.image,
                    }}
                    style={
                      styles.avatarImage
                    }
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      currentStyles.avatar,
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        currentStyles.avatarText,
                      ]}
                    >
                      {item.name
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}

                <View
                  style={styles.cardInfo}
                >
                  <View
                    style={styles.nameRow}
                  >
                    <Text
                      style={[
                        styles.name,
                        currentStyles.name,
                      ]}
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={[
                        styles.dateText,
                        currentStyles.dateText,
                      ]}
                    >
                      {item.date}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.details,
                      currentStyles.details,
                    ]}
                  >
                    {item.gender || 'N/A'} •{' '}
                    {item.age || 'N/A'} yrs •
                    {' '}B-Day:{' '}
                    {item.birthday ||
                      'N/A'}
                  </Text>

                  <Text
                    style={[
                      styles.details,
                      currentStyles.details,
                    ]}
                  >
                    Address:{' '}
                    {item.address ||
                      'N/A'}
                  </Text>

                  <Text
                    style={[
                      styles.details,
                      currentStyles.details,
                    ]}
                  >
                    Leader:{' '}
                    {item.leader ||
                      'N/A'}
                  </Text>

                  {item.category ===
                    'Newbie' && (
                    <Text
                      style={{
                        color: '#F59E0B',
                        fontSize: 12,
                        fontWeight:
                          'bold',
                        marginTop: 3,
                      }}
                    >
                      Present Count:{' '}
                      {item.presentCount ||
                        0}{' '}
                      / 4
                    </Text>
                  )}

                  <View
                    style={styles.badgeRow}
                  >
                    <Text
                      style={[
                        styles.tag,
                        item.category ===
                        'Regular'
                          ? styles.regularTag
                          : styles.newbieTag,
                      ]}
                    >
                      {item.category}
                    </Text>

                    {item.category ===
                      'Regular' && (
                      <TouchableOpacity
                        style={
                          styles.showQrTagBtn
                        }
                        onPress={() => {
                          setSelectedQRItem(
                            item
                          );
                          setQrModalVisible(
                            true
                          );
                        }}
                      >
                        <Text
                          style={
                            styles.showQrTagText
                          }
                        >
                          📱 View QR
                        </Text>
                      </TouchableOpacity>
                    )}

                    {item.category ===
                      'Newbie' &&
                      (item.presentCount ||
                        0) >= 4 && (
                        <TouchableOpacity
                          style={
                            styles.moveToRegularBtn
                          }
                          onPress={() =>
                            moveToRegular(
                              item.id
                            )
                          }
                        >
                          <Text
                            style={
                              styles.moveToRegularText
                            }
                          >
                            🚀 Move to Regular
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View
                style={[
                  styles.cardActions,
                  currentStyles.cardActions,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.editBtn,
                    currentStyles.editBtn,
                  ]}
                  onPress={() =>
                    handleOpenEdit(item)
                  }
                >
                  <Text
                    style={[
                      styles.editBtnText,
                      currentStyles.editBtnText,
                    ]}
                  >
                    ✏️ Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.deleteBtn
                  }
                  onPress={() =>
                    handleDeleteYouth(
                      item.id,
                      item.name
                    )
                  }
                >
                  <Text
                    style={
                      styles.deleteBtnText
                    }
                  >
                    🗑️ Delete
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusBtn,
                    item.status ===
                    'Present'
                      ? styles.presentBg
                      : styles.absentBg,
                  ]}
                  onPress={() =>
                    toggleAttendanceStatus(
                      item.id
                    )
                  }
                >
                  <Text
                    style={
                      styles.btnText
                    }
                  >
                    {item.status}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Add */}
        <TouchableOpacity
          style={styles.addYouthBtn}
          onPress={handleOpenAdd}
        >
          <Text
            style={styles.addYouthBtnText}
          >
            + Add New Youth
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* =====================================================
          QR MODAL
      ====================================================== */}
      <Modal
        visible={qrModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              currentStyles.modalContent,
              {
                alignItems: 'center',
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                currentStyles.modalTitle,
              ]}
            >
              Regular Member QR Code
            </Text>

            <Text
              style={{
                color: '#38BDF8',
                fontSize: 16,
                fontWeight:
                  'bold',
                marginBottom: 15,
              }}
            >
              {selectedQRItem?.name}
            </Text>

            {selectedQRItem && (
              <View
                style={{
                  backgroundColor:
                    '#FFF',
                  padding: 15,
                  borderRadius: 10,
                  marginBottom: 20,
                }}
              >
                <QRCode
                  value={
                    selectedQRItem.id
                  }
                  size={180}
                />
              </View>
            )}

            <Text
              style={{
                color: '#94A3B8',
                fontSize: 12,
                textAlign:
                  'center',
                marginBottom: 20,
              }}
            >
              Scan this QR code using
              the app scanner to
              automatically mark as
              Present.
            </Text>

            <TouchableOpacity
              style={[
                styles.fullSaveBtn,
                {
                  backgroundColor:
                    '#2563EB',
                  width: '100%',
                },
              ]}
              onPress={() =>
                setQrModalVisible(
                  false
                )
              }
            >
              <Text
                style={
                  styles.fullSaveBtnText
                }
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          QR SCANNER
      ====================================================== */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        transparent={false}
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={
            scanned
              ? undefined
              : handleBarcodeScanned
          }
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <SafeAreaView
            style={{
              flex: 1,
              justifyContent:
                'space-between',
              padding: 20,
              backgroundColor:
                'transparent',
            }}
          >
            <Text
              style={{
                color: '#FFF',
                fontSize: 18,
                fontWeight:
                  'bold',
                textAlign:
                  'center',
                marginTop: 10,
                backgroundColor:
                  'rgba(0,0,0,0.6)',
                padding: 10,
                borderRadius: 8,
              }}
            >
              Point Camera at QR Code
            </Text>

            <View
              style={{
                alignSelf:
                  'center',
                width: 220,
                height: 220,
                borderWidth: 2,
                borderColor:
                  '#38BDF8',
                borderRadius: 12,
                backgroundColor:
                  'transparent',
              }}
            />

            <TouchableOpacity
              style={{
                backgroundColor:
                  '#EF4444',
                padding: 15,
                borderRadius: 10,
                alignItems:
                  'center',
                marginBottom: 20,
              }}
              onPress={() =>
                setScannerVisible(
                  false
                )
              }
            >
              <Text
                style={{
                  color: '#FFF',
                  fontWeight:
                    'bold',
                  fontSize: 16,
                }}
              >
                Close Scanner
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </CameraView>
      </Modal>

      {/* =====================================================
          ADD / EDIT MODAL
      ====================================================== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
      >
        <View
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={
              styles.modalScroll
            }
          >
            <View
              style={[
                styles.modalContent,
                currentStyles.modalContent,
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  currentStyles.modalTitle,
                ]}
              >
                {isEditing
                  ? 'Edit Youth Information'
                  : 'Add New Youth'}
              </Text>

              {/* Photo */}
              <View
                style={{
                  alignItems:
                    'center',
                  marginBottom: 15,
                }}
              >
                {imageUri ? (
                  <Image
                    source={{
                      uri: imageUri,
                    }}
                    style={
                      styles.modalAvatarImage
                    }
                  />
                ) : (
                  <View
                    style={[
                      styles.modalAvatarPlaceholder,
                      currentStyles.modalAvatarPlaceholder,
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          '#94A3B8',
                        fontSize: 12,
                      }}
                    >
                      No Photo
                    </Text>
                  </View>
                )}

                <View
                  style={{
                    flexDirection:
                      'row',
                    marginTop: 10,
                  }}
                >
                  <TouchableOpacity
                    style={
                      styles.photoPickerBtn
                    }
                    onPress={
                      takePhotoWithCamera
                    }
                  >
                    <Text
                      style={
                        styles.photoPickerBtnText
                      }
                    >
                      📷 Take Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.photoPickerBtn,
                      {
                        backgroundColor:
                          '#0284C7',
                        marginLeft: 8,
                      },
                    ]}
                    onPress={
                      pickImageFromGallery
                    }
                  >
                    <Text
                      style={
                        styles.photoPickerBtnText
                      }
                    >
                      🖼 Gallery
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Name */}
              <TextInput
                style={[
                  styles.input,
                  currentStyles.input,
                ]}
                placeholder="Full Name"
                placeholderTextColor={
                  isDark
                    ? '#64748B'
                    : '#94A3B8'
                }
                value={name}
                onChangeText={setName}
              />

              {/* Gender */}
              <TextInput
                style={[
                  styles.input,
                  currentStyles.input,
                ]}
                placeholder="Gender (e.g. Male / Female)"
                placeholderTextColor={
                  isDark
                    ? '#64748B'
                    : '#94A3B8'
                }
                value={gender}
                onChangeText={setGender}
              />

              {/* Age */}
              <TextInput
                style={[
                  styles.input,
                  currentStyles.input,
                ]}
                placeholder="Age"
                placeholderTextColor={
                  isDark
                    ? '#64748B'
                    : '#94A3B8'
                }
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />

              {/* Birthday */}
              <TouchableOpacity
                onPress={() =>
                  setShowBirthdayPicker(
                    true
                  )
                }
              >
                <View
                  pointerEvents="none"
                >
                  <TextInput
                    style={[
                      styles.input,
                      currentStyles.input,
                    ]}
                    placeholder="Birthday (e.g. Feb 20, 2004)"
                    placeholderTextColor={
                      isDark
                        ? '#64748B'
                        : '#94A3B8'
                    }
                    value={birthday}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>

              {showBirthdayPicker && (
                <DateTimePicker
                  value={
                    birthdayDateObj
                  }
                  mode="date"
                  display="default"
                  onChange={(
                    event,
                    selectedDate
                  ) => {
                    setShowBirthdayPicker(
                      Platform.OS ===
                        'ios'
                    );

                    if (
                      selectedDate
                    ) {
                      setBirthdayDateObj(
                        selectedDate
                      );

                      const formatted =
                        selectedDate.toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        );

                      setBirthday(
                        formatted
                      );
                    }
                  }}
                />
              )}

              {/* Address */}
              <TextInput
                style={[
                  styles.input,
                  currentStyles.input,
                ]}
                placeholder="Address"
                placeholderTextColor={
                  isDark
                    ? '#64748B'
                    : '#94A3B8'
                }
                value={address}
                onChangeText={
                  setAddress
                }
              />

              {/* Leader */}
              <TextInput
                style={[
                  styles.input,
                  currentStyles.input,
                ]}
                placeholder="Cell Leader Name (Type N/A if none)"
                placeholderTextColor={
                  isDark
                    ? '#64748B'
                    : '#94A3B8'
                }
                value={leader}
                onChangeText={
                  setLeader
                }
              />

              {/* Date Added */}
              <TouchableOpacity
                onPress={() =>
                  setShowDateAddedPicker(
                    true
                  )
                }
              >
                <View
                  pointerEvents="none"
                >
                  <TextInput
                    style={[
                      styles.input,
                      currentStyles.input,
                    ]}
                    placeholder="Date Added"
                    placeholderTextColor={
                      isDark
                        ? '#64748B'
                        : '#94A3B8'
                    }
                    value={dateAdded}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>

              {showDateAddedPicker && (
                <DateTimePicker
                  value={
                    dateAddedObj
                  }
                  mode="date"
                  display="default"
                  onChange={(
                    event,
                    selectedDate
                  ) => {
                    setShowDateAddedPicker(
                      Platform.OS ===
                        'ios'
                    );

                    if (
                      selectedDate
                    ) {
                      setDateAddedObj(
                        selectedDate
                      );

                      const formatted =
                        selectedDate.toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        );

                      setDateAdded(
                        formatted
                      );
                    }
                  }}
                />
              )}

              {/* Category */}
              <Text
                style={[
                  styles.modalSubtitle,
                  currentStyles.modalSubtitle,
                ]}
              >
                Save as Category:
              </Text>

              <View
                style={
                  styles.modalBtnRow
                }
              >
                <TouchableOpacity
                  style={[
                    styles.modalActionBtn,
                    currentStyles.cancelBtn,
                  ]}
                  onPress={() =>
                    setModalVisible(
                      false
                    )
                  }
                >
                  <Text
                    style={[
                      styles.cancelBtnText,
                      currentStyles.cancelBtnText,
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalActionBtn,
                    styles.newbieSaveBtn,
                  ]}
                  onPress={() =>
                    handleSaveYouth(
                      'Newbie'
                    )
                  }
                >
                  <Text
                    style={
                      styles.saveBtnText
                    }
                  >
                    Newbie
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalActionBtn,
                    styles.regularSaveBtn,
                  ]}
                  onPress={() =>
                    handleSaveYouth(
                      'Regular'
                    )
                  }
                >
                  <Text
                    style={
                      styles.saveBtnText
                    }
                  >
                    Regular
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditing && (
                <TouchableOpacity
                  style={
                    styles.fullSaveBtn
                  }
                  onPress={() =>
                    handleSaveYouth(
                      currentCategory
                    )
                  }
                >
                  <Text
                    style={
                      styles.fullSaveBtnText
                    }
                  >
                    💾 Save Changes
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =========================================================
// GENERAL STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  themeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  themeBtnText: {
    fontSize: 16,
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  searchScanRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },

  searchInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },

  scanBtnHeader: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },

  scanBtnHeaderText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  printBtnHeader: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  printBtnHeaderText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  filterRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },

  filterChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 3,
    borderWidth: 1,
  },

  filterActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  filterText: {
    fontWeight: 'bold',
    fontSize: 12,
  },

  filterActiveText: {
    color: '#FFF',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },

  sectionCount: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: 'bold',
  },

  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  avatarImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
  },

  cardInfo: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  dateText: {
    fontSize: 11,
  },

  details: {
    fontSize: 12,
    marginVertical: 2,
  },

  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    overflow: 'hidden',
    marginRight: 8,
    marginBottom: 4,
  },

  newbieTag: {
    color: '#F59E0B',
    backgroundColor: '#451A03',
  },

  regularTag: {
    color: '#38BDF8',
    backgroundColor: '#0369A1',
  },

  showQrTagBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },

  showQrTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  moveToRegularBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 4,
  },

  moveToRegularText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },

  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 6,
    justifyContent: 'center',
  },

  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 6,
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },

  deleteBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11,
  },

  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    minWidth: 80,
    alignItems: 'center',
  },

  presentBg: {
    backgroundColor: '#16A34A',
  },

  absentBg: {
    backgroundColor: '#64748B',
  },

  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11,
  },

  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 13,
  },

  addYouthBtn: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },

  addYouthBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.8)',
    justifyContent: 'center',
  },

  modalScroll: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },

  modalContent: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  input: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },

  modalSubtitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },

  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },

  modalActionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },

  cancelBtnText: {
    fontWeight: 'bold',
    fontSize: 12,
  },

  newbieSaveBtn: {
    backgroundColor: '#D97706',
  },

  regularSaveBtn: {
    backgroundColor: '#0284C7',
  },

  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  fullSaveBtn: {
    backgroundColor: '#16A34A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },

  fullSaveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  modalAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  photoPickerBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  photoPickerBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

// =========================================================
// DARK THEME
// =========================================================

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
  },

  header: {
    borderBottomColor: '#1E293B',
  },

  headerTitle: {
    color: '#FFF',
  },

  backText: {
    color: '#60A5FA',
  },

  searchInput: {
    backgroundColor: '#1E293B',
    color: '#FFF',
    borderColor: '#334155',
  },

  filterChip: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },

  filterText: {
    color: '#94A3B8',
  },

  sectionTitle: {
    color: '#FFF',
  },

  card: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },

  avatar: {
    backgroundColor: '#334155',
  },

  avatarText: {
    color: '#FFF',
  },

  name: {
    color: '#FFF',
  },

  dateText: {
    color: '#64748B',
  },

  details: {
    color: '#94A3B8',
  },

  cardActions: {
    borderTopColor: '#334155',
  },

  editBtn: {
    backgroundColor: '#334155',
  },

  editBtnText: {
    color: '#FFF',
  },

  emptyText: {
    color: '#64748B',
  },

  modalContent: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },

  modalTitle: {
    color: '#FFF',
  },

  input: {
    backgroundColor: '#0F172A',
    color: '#FFF',
    borderColor: '#334155',
  },

  modalSubtitle: {
    color: '#94A3B8',
  },

  cancelBtn: {
    backgroundColor: '#334155',
  },

  cancelBtnText: {
    color: '#FFF',
  },

  modalAvatarPlaceholder: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
});

// =========================================================
// LIGHT THEME
// =========================================================

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
  },

  header: {
    borderBottomColor: '#E2E8F0',
  },

  headerTitle: {
    color: '#0F172A',
  },

  backText: {
    color: '#2563EB',
  },

  searchInput: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderColor: '#CBD5E1',
  },

  filterChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },

  filterText: {
    color: '#64748B',
  },

  sectionTitle: {
    color: '#0F172A',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },

  avatar: {
    backgroundColor: '#CBD5E1',
  },

  avatarText: {
    color: '#0F172A',
  },

  name: {
    color: '#0F172A',
  },

  dateText: {
    color: '#64748B',
  },

  details: {
    color: '#475569',
  },

  cardActions: {
    borderTopColor: '#E2E8F0',
  },

  editBtn: {
    backgroundColor: '#E2E8F0',
  },

  editBtnText: {
    color: '#0F172A',
  },

  emptyText: {
    color: '#64748B',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },

  modalTitle: {
    color: '#0F172A',
  },

  input: {
    backgroundColor: '#F1F5F9',
    color: '#0F172A',
    borderColor: '#CBD5E1',
  },

  modalSubtitle: {
    color: '#475569',
  },

  cancelBtn: {
    backgroundColor: '#E2E8F0',
  },

  cancelBtnText: {
    color: '#0F172A',
  },

  modalAvatarPlaceholder: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
});