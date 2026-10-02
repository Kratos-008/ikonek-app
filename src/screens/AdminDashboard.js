import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';

export function AdminDashboard({ user, onLogout, usersList, setUsersList, onNavigate }) {
  const [tab, setTab] = useState('management');
  const [modalVisible, setModalVisible] = useState(false);
  const [addingRole, setAddingRole] = useState('');

  // Youth Personal Data Form State
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Male'); // 'Male' or 'Female'
  const [address, setAddress] = useState('');
  const [cellLeader, setCellLeader] = useState('');
  const [statusCategory, setStatusCategory] = useState('Newbie'); // 'Newbie' or 'Regular'

  // Generic User Form State (para sa Leaders / Admins)
  const [genericName, setGenericName] = useState('');
  const [genericPassword, setGenericPassword] = useState('');

  // Directory Filter State
  const [directoryFilter, setDirectoryFilter] = useState('All'); // 'All', 'Newbie', 'Regular'

  const openAddModal = (role) => {
    setAddingRole(role);
    setFullName('');
    setAge('');
    setSex('Male');
    setAddress('');
    setCellLeader('');
    setStatusCategory('Newbie');
    setGenericName('');
    setGenericPassword('');
    setModalVisible(true);
  };

  const handleSave = () => {
    if (addingRole === 'youth') {
      if (!fullName.trim() || !age.trim()) {
        alert('Pakilagay ang Complete Name at Age!');
        return;
      }

      const newYouthData = {
        id: Date.now().toString(),
        name: fullName,
        age: age,
        sex: sex,
        address: address,
        cellLeader: cellLeader,
        category: statusCategory, // Newbie or Regular
        role: 'youth',
        createdAt: new Date().toLocaleDateString(),
      };

      setUsersList([...usersList, newYouthData]);
      alert(`Matagumpay na naidagdag si ${fullName} bilang ${statusCategory}!`);
    } else {
      if (!genericName.trim()) {
        alert('Pakilagay ang Pangalan!');
        return;
      }

      const newAccount = {
        id: Date.now().toString(),
        name: genericName,
        password: genericPassword || '123456',
        role: addingRole,
      };

      setUsersList([...usersList, newAccount]);
      alert(`Matagumpay na naidagdag ang ${addingRole}: ${genericName}`);
    }

    setModalVisible(false);
  };

  // Filtered list para sa Youth
  const youthList = usersList.filter((item) => item.role === 'youth');
  const filteredYouth = youthList.filter((item) => {
    if (directoryFilter === 'All') return true;
    return item.category === directoryFilter;
  });

  return (
    <Screen>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={onLogout}>
        <Text style={styles.backBtnText}>⬅️ Back to Sign In</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Admin Dashboard 🛡️</Text>
      <Text style={styles.sub}>Logged in as: {user?.name} ({user?.role})</Text>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'management' && styles.tabActive]}
          onPress={() => setTab('management')}
        >
          <Text style={tab === 'management' ? styles.tabTextActive : styles.tabText}>Management</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'directory' && styles.tabActive]}
          onPress={() => setTab('directory')}
        >
          <Text style={tab === 'directory' ? styles.tabTextActive : styles.tabText}>Youth Directory</Text>
        </TouchableOpacity>
      </View>

      {tab === 'management' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>⚙️ Admin Actions</Text>

          <TouchableOpacity style={styles.actionBtn} onPress={() => openAddModal('youth')}>
            <Text style={styles.actionBtnText}>➕ Add Youth Data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => openAddModal('leader')}>
            <Text style={styles.actionBtnText}>➕ Add Youth Leaders</Text>
          </TouchableOpacity>

          {user?.role === 'superadmin' && (
            <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn]} onPress={() => openAddModal('admin')}>
              <Text style={styles.outlineBtnText}>🔑 Manage Admin Accounts</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981', marginTop: 10 }]}
            onPress={() => onNavigate('youthDashboard')}
          >
            <Text style={styles.actionBtnText}>👁️ Switch to Youth View</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 15 }}>
            <Button title="Logout" onPress={onLogout} type="secondary" />
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>📋 Youth Directory ({youthList.length})</Text>

          {/* Newbie vs Regular Filter Buttons */}
          <View style={styles.filterRow}>
            {['All', 'Newbie', 'Regular'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, directoryFilter === filter && styles.filterChipActive]}
                onPress={() => setDirectoryFilter(filter)}
              >
                <Text style={directoryFilter === filter ? styles.filterTextActive : styles.filterText}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredYouth.length === 0 ? (
            <Text style={styles.emptyText}>Walang nahanap na record para sa {directoryFilter}.</Text>
          ) : (
            filteredYouth.map((item) => (
              <View key={item.id} style={styles.userCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text
                    style={[
                      styles.badge,
                      item.category === 'Newbie' ? styles.badgeNewbie : styles.badgeRegular,
                    ]}
                  >
                    {item.category || 'Youth'}
                  </Text>
                </View>

                <Text style={styles.userDetail}>Age: {item.age} | Sex: {item.sex}</Text>
                <Text style={styles.userDetail}>Address: {item.address || 'N/A'}</Text>
                <Text style={styles.userDetail}>Cell Leader: {item.cellLeader || 'N/A'}</Text>
              </View>
            ))
          )}

          <View style={{ marginTop: 15 }}>
            <Button title="Logout" onPress={onLogout} type="secondary" />
          </View>
        </ScrollView>
      )}

      {/* Modal / Form Overlay */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {addingRole === 'youth' ? '📝 Add Youth Data' : `Add New ${addingRole.toUpperCase()}`}
              </Text>

              {addingRole === 'youth' ? (
                <>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Juan Dela Cruz"
                    value={fullName}
                    onChangeText={setFullName}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Age</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 18"
                        keyboardType="numeric"
                        value={age}
                        onChangeText={setAge}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Sex</Text>
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        <TouchableOpacity
                          style={[styles.sexBtn, sex === 'Male' && styles.sexBtnActive]}
                          onPress={() => setSex('Male')}
                        >
                          <Text style={sex === 'Male' ? styles.sexTextActive : styles.sexText}>Male</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.sexBtn, sex === 'Female' && styles.sexBtnActive]}
                          onPress={() => setSex('Female')}
                        >
                          <Text style={sex === 'Female' ? styles.sexTextActive : styles.sexText}>Female</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter complete address"
                    value={address}
                    onChangeText={setAddress}
                  />

                  <Text style={styles.inputLabel}>Cell Leader</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Name of Cell Leader"
                    value={cellLeader}
                    onChangeText={setCellLeader}
                  />

                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[
                        styles.catBtn,
                        statusCategory === 'Newbie' && styles.catBtnNewbieActive,
                      ]}
                      onPress={() => setStatusCategory('Newbie')}
                    >
                      <Text
                        style={
                          statusCategory === 'Newbie'
                            ? styles.catTextActive
                            : styles.catText
                        }
                      >
                        🌱 Newbie
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.catBtn,
                        statusCategory === 'Regular' && styles.catBtnRegularActive,
                      ]}
                      onPress={() => setStatusCategory('Regular')}
                    >
                      <Text
                        style={
                          statusCategory === 'Regular'
                            ? styles.catTextActive
                            : styles.catText
                        }
                      >
                        ⭐ Regular
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={genericName}
                    onChangeText={setGenericName}
                  />

                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Password (Default: 123456)"
                    secureTextEntry
                    value={genericPassword}
                    onChangeText={setGenericPassword}
                  />
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.btnText}>Save Data</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', marginBottom: 10, paddingVertical: 4 },
  backBtnText: { color: '#2563EB', fontWeight: 'bold', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1A2B4C', textAlign: 'center' },
  sub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 15 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 4, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#2563EB' },
  tabText: { color: '#64748B', fontWeight: '600' },
  tabTextActive: { color: '#FFF', fontWeight: '600' },
  content: { gap: 10, paddingBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A2B4C', marginBottom: 5 },
  actionBtn: { backgroundColor: '#2563EB', padding: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  outlineBtn: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#2563EB', marginTop: 10 },
  outlineBtnText: { color: '#2563EB', fontWeight: 'bold', fontSize: 15 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 20 },

  // Directory Cards
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterChip: { flex: 1, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 20, alignItems: 'center' },
  filterChipActive: { backgroundColor: '#1E293B' },
  filterText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  filterTextActive: { fontSize: 13, color: '#FFF', fontWeight: '600' },
  userCard: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  userName: { fontWeight: 'bold', fontSize: 16, color: '#1E293B' },
  userDetail: { color: '#64748B', fontSize: 13, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  badgeNewbie: { backgroundColor: '#FEF3C7', color: '#D97706' },
  badgeRegular: { backgroundColor: '#D1FAE5', color: '#059669' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A2B4C', textAlign: 'center', marginBottom: 5 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', padding: 10, borderRadius: 8, fontSize: 14, backgroundColor: '#F8FAFC' },

  sexBtn: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', padding: 10, borderRadius: 8, alignItems: 'center' },
  sexBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  sexText: { color: '#64748B', fontWeight: '600' },
  sexTextActive: { color: '#FFF', fontWeight: '600' },

  catBtn: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', padding: 12, borderRadius: 8, alignItems: 'center' },
  catBtnNewbieActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  catBtnRegularActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  catText: { color: '#64748B', fontWeight: '600' },
  catTextActive: { color: '#FFF', fontWeight: 'bold' },

  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 15 },
  saveBtn: { flex: 1, backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#64748B', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
});