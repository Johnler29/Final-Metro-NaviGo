import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { validatePassword, DEFAULT_PASSWORD_OPTIONS } from '../utils/passwordValidation';

export default function PasswordRequirementsModal({ 
  visible, 
  onClose, 
  password = '',
  options = DEFAULT_PASSWORD_OPTIONS 
}) {
  // Validate current password to show which requirements are met
  const validation = validatePassword(password, options);
  
  const requirements = [
    {
      key: 'length',
      label: `Minimum ${options.minLength} characters`,
      description: `Your password must be at least ${options.minLength} characters long`,
      test: password.length >= options.minLength,
      current: password.length,
      target: options.minLength,
      icon: 'checkmark-circle',
    },
    {
      key: 'uppercase',
      label: 'At least one uppercase letter',
      description: 'Include at least one capital letter (A, B, C, ..., Z)',
      test: options.requireUppercase ? /[A-Z]/.test(password) : true,
      hasRequirement: options.requireUppercase,
      icon: 'checkmark-circle',
    },
    {
      key: 'lowercase',
      label: 'At least one lowercase letter',
      description: 'Include at least one small letter (a, b, c, ..., z)',
      test: options.requireLowercase ? /[a-z]/.test(password) : true,
      hasRequirement: options.requireLowercase,
      icon: 'checkmark-circle',
    },
    {
      key: 'number',
      label: 'At least one number',
      description: 'Include at least one digit (0, 1, 2, ..., 9)',
      test: options.requireNumber ? /[0-9]/.test(password) : true,
      hasRequirement: options.requireNumber,
      icon: 'checkmark-circle',
    },
    {
      key: 'special',
      label: 'At least one special character',
      description: 'Include at least one special character: ! @ # $ % ^ & * ( ) _ + - = [ ] { } | ; : , . < > ?',
      test: options.requireSpecialChar ? /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) : true,
      hasRequirement: options.requireSpecialChar,
      icon: 'checkmark-circle',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.title}>Password Requirements</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            <Text style={styles.subtitle}>
              Your password must meet all of the following requirements:
            </Text>

            <View style={styles.requirementsList}>
              {requirements
                .filter(req => req.hasRequirement !== false)
                .map((req) => {
                  const isValid = req.test;
                  const isMissing = password.length > 0 && !isValid;
                  return (
                    <View 
                      key={req.key} 
                      style={[
                        styles.requirementItem,
                        isMissing && styles.requirementItemMissing
                      ]}
                    >
                      <Ionicons
                        name={isValid ? "checkmark-circle" : "close-circle"}
                        size={26}
                        color={isValid ? "#10B981" : (isMissing ? "#EF4444" : "#D1D5DB")}
                        style={styles.requirementIcon}
                      />
                      <View style={styles.requirementContent}>
                        <Text
                          style={[
                            styles.requirementLabel,
                            isValid && styles.requirementLabelMet,
                            isMissing && styles.requirementLabelMissing,
                          ]}
                        >
                          {req.label}
                          {isMissing && <Text style={styles.missingIndicator}> - Missing</Text>}
                        </Text>
                        <Text style={[
                          styles.requirementDescription,
                          isMissing && styles.requirementDescriptionMissing
                        ]}>
                          {req.description}
                        </Text>
                        {req.key === 'length' && password.length > 0 && (
                          <View style={styles.progressContainer}>
                            <Text style={[
                              styles.requirementProgress,
                              !isValid && styles.requirementProgressMissing
                            ]}>
                              {password.length} / {req.target} characters
                            </Text>
                            {!isValid && (
                              <Text style={styles.missingCount}>
                                Need {req.target - password.length} more
                              </Text>
                            )}
                          </View>
                        )}
                        {isMissing && req.key !== 'length' && (
                          <View style={styles.missingDetails}>
                            <Text style={styles.missingDetailsText}>
                              Your password doesn't contain this requirement yet
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
            </View>

            {password.length > 0 && !validation.isValid && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>Missing Requirements:</Text>
                  <Text style={styles.errorText}>
                    {requirements
                      .filter(req => req.hasRequirement !== false && !req.test && password.length > 0)
                      .map(req => req.label)
                      .join(', ')}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.button}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 22,
  },
  requirementsList: {
    gap: 20,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  requirementItemMissing: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  requirementIcon: {
    marginRight: 14,
    marginTop: 2,
  },
  requirementContent: {
    flex: 1,
  },
  requirementLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  requirementLabelMet: {
    color: '#1F2937',
    fontWeight: '700',
  },
  requirementLabelMissing: {
    color: '#DC2626',
    fontWeight: '700',
  },
  missingIndicator: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  requirementDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 4,
  },
  requirementDescriptionMissing: {
    color: '#F87171',
  },
  progressContainer: {
    marginTop: 4,
  },
  requirementProgress: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  requirementProgressMissing: {
    color: '#EF4444',
    fontWeight: '600',
  },
  missingCount: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 2,
  },
  missingDetails: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  missingDetailsText: {
    fontSize: 12,
    color: '#DC2626',
    fontStyle: 'italic',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  button: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

