import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, shadows } from '../styles/uiTheme';
import NotificationModal from '../components/NotificationModal';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { buses, routes } = useSupabase();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
  });
  const [notificationModal, setNotificationModal] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: null,
    type: 'default',
    icon: null,
  });

  const handleSignOut = async () => {
    setNotificationModal({
      visible: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      buttons: [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null }),
        },
        {
          text: 'Sign Out',
          style: 'default',
          onPress: async () => {
            setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null });
            try {
              await signOut();
            } catch (error) {
              setNotificationModal({
                visible: true,
                title: 'Error',
                message: 'Failed to sign out. Please try again.',
                buttons: null,
                type: 'error',
                icon: 'alert-circle',
              });
            }
          },
        },
      ],
      type: 'default',
      icon: null,
    });
  };

  const handleEditProfile = () => {
    // Initialize form with current user data
    setEditForm({
      fullName: user?.user_metadata?.full_name || '',
      phone: user?.user_metadata?.phone || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateProfile = async () => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please try again.');
      return;
    }

    setIsUpdating(true);
    try {
      // Update user metadata in Supabase
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: editForm.fullName.trim(),
          phone: editForm.phone.trim(),
        },
      });

      if (error) {
        throw error;
      }

      setNotificationModal({
        visible: true,
        title: 'Success',
        message: 'Profile updated successfully!',
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null });
              setShowEditModal(false);
              // The user object will be updated automatically via auth state change
            },
          },
        ],
        type: 'success',
        icon: 'checkmark-circle',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setNotificationModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to update profile. Please try again.',
        buttons: null,
        type: 'error',
        icon: 'alert-circle',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSettings = () => {
    navigation.getParent()?.navigate('Settings');
  };

  const menuItems = [
    {
      title: 'Edit Profile',
      icon: 'person-outline',
      color: colors.brand,
      onPress: handleEditProfile,
    },
    {
      title: 'Settings',
      icon: 'settings-outline',
      color: colors.info,
      onPress: handleSettings,
    },
    {
      title: 'Help & Support',
      icon: 'help-circle-outline',
      color: colors.success,
      onPress: () => navigation.getParent()?.navigate('Help'),
    },
    {
      title: 'About',
      icon: 'information-circle-outline',
      color: colors.textSecondary,
      onPress: () => Alert.alert('About', 'NaviGO v1.0.0\nPublic Transit App'),
    },
  ];

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.menuButton} onPress={() => {}}>
            <Ionicons name="menu-outline" size={22} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
          
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getUserInitials()}</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton} onPress={handleEditProfile}>
              <Ionicons name="camera-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{getUserDisplayName()}</Text>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
          
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="pencil-outline" size={16} color={colors.brand} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionLabel}>Your Activity</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="bus" size={24} color="#f59e0b" />
              <Text style={styles.statNumber}>{buses.length}</Text>
              <Text style={styles.statLabel}>Buses</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="navigate" size={24} color="#10b981" />
              <Text style={styles.statNumber}>{routes.length}</Text>
              <Text style={styles.statLabel}>Routes</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#3b82f6" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Account</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.menuItemText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              disabled={isUpdating}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleUpdateProfile}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.fullName}
                onChangeText={(text) => setEditForm({ ...editForm, fullName: text })}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
                editable={!isUpdating}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={user?.email || ''}
                placeholder="Email cannot be changed"
                placeholderTextColor={colors.textMuted}
                editable={false}
              />
              <Text style={styles.inputHint}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                editable={!isUpdating}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Notification Modal */}
      <NotificationModal
        visible={notificationModal.visible}
        title={notificationModal.title}
        message={notificationModal.message}
        buttons={notificationModal.buttons}
        type={notificationModal.type}
        icon={notificationModal.icon}
        onPress={() => setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.brand,
    paddingTop: 52,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadows.floating,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    backgroundColor: colors.surface,
    marginTop: -40,
    marginHorizontal: spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.floating,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    ...shadows.card,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
    fontFamily: 'System',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand,
    fontFamily: 'System',
  },
  statsSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  menuSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'System',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  versionText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    fontFamily: 'System',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    ...shadows.card,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.xl,
  },
  modalCancel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  modalSave: {
    fontSize: 16,
    color: colors.brand,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContent: {
    flex: 1,
    padding: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontFamily: 'System',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  disabledInput: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontFamily: 'System',
  },
});

