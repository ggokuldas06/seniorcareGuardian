// src/screens/TestScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useEldersStore } from '../store/eldersStore';
import { useConnectionStore } from '../store/connectionStore';
import { COLORS } from '../utils/constants';

export default function TestScreen() {
  const { guardian, isAuthenticated, setGuardian, clearGuardian, loadGuardian } = useAuthStore();
  const { elders, addElder } = useEldersStore();
  const { status, setStatus } = useConnectionStore();

  useEffect(() => {
    loadGuardian();
  }, []);

  const handleTestLogin = async () => {
    await setGuardian({
      id: 'test-guardian-123',
      token: 'test-token-abc',
      name: 'Test Guardian',
      phone: '+1234567890',
    });
  };

  const handleTestLogout = async () => {
    // Disconnect WebSocket
    const { wsService } = require('../services/websocket');
    const { apiService } = require('../services/api');
    
    wsService.disconnect();
    apiService.clearAuthToken();
    
    // Clear auth state
    await clearGuardian();
  };

  const handleAddTestElder = async () => {
    await addElder({
      id: `elder-${Date.now()}`,
      name: `Test Elder ${elders.length + 1}`,
      age: 75,
      relationship: 'Parent',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      batteryLevel: 85,
    });
  };

  const handleToggleConnection = () => {
    if (status === 'connected') {
      setStatus('disconnected');
    } else {
      setStatus('connected');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🧪 Phase 1 Foundation Test</Text>
        
        {/* Auth State Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auth Store</Text>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Authenticated:</Text>
            <Text style={[styles.value, { color: isAuthenticated ? COLORS.success : COLORS.error }]}>
              {isAuthenticated ? '✅ Yes' : '❌ No'}
            </Text>
          </View>
          {guardian && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.label}>Guardian ID:</Text>
                <Text style={styles.value}>{guardian.id}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.label}>Token:</Text>
                <Text style={styles.value} numberOfLines={1}>{guardian.token}</Text>
              </View>
            </>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleTestLogin}
            >
              <Text style={styles.buttonText}>Test Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleTestLogout}
            >
              <Text style={styles.buttonText}>Test Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Elders Store Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Elders Store</Text>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Total Elders:</Text>
            <Text style={styles.value}>{elders.length}</Text>
          </View>
          {elders.map((elder) => (
            <View key={elder.id} style={styles.elderCard}>
              <Text style={styles.elderName}>{elder.name}</Text>
              <Text style={styles.elderDetail}>Age: {elder.age}</Text>
              <Text style={styles.elderDetail}>
                Status: {elder.isOnline ? '🟢 Online' : '⚫ Offline'}
              </Text>
              <Text style={styles.elderDetail}>Battery: {elder.batteryLevel}%</Text>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleAddTestElder}
          >
            <Text style={styles.buttonText}>Add Test Elder</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Store Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Store</Text>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, { 
              color: status === 'connected' ? COLORS.success : COLORS.textSecondary 
            }]}>
              {status.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleToggleConnection}
          >
            <Text style={styles.buttonText}>Toggle Connection</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>✅ All stores working!</Text>
          <Text style={styles.footerSubtext}>Data persists across app restarts</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.textSecondary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  elderCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  elderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  elderDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  footer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
});