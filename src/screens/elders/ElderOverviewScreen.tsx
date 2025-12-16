// src/screens/elders/ElderOverviewScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { COLORS, STATUS_COLORS, ALERT_SEVERITY } from '../../utils/constants';
import { Elder, Alert as AlertType, StatePayload } from '../../types';
import { wsService } from '../../services/websocket';
import { useEldersStore } from '../../store/eldersStore';

interface ElderOverviewScreenProps {
  elder: Elder;
  onBack: () => void;
  onNavigateToMedications: () => void;
  onNavigateToAlerts: () => void;
  onNavigateToHealth: () => void;
}

export default function ElderOverviewScreen({ elder, onBack, onNavigateToMedications, onNavigateToAlerts, onNavigateToHealth }: ElderOverviewScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [elderState, setElderState] = useState<StatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { updateElder } = useEldersStore();

  useEffect(() => {
    fetchElderState();
    
    // Listen for real-time updates from elder
    const unsubscribe = wsService.onMessage((message) => {
      if (message.from === elder.id && message.type === 'STATE_RESPONSE') {
        console.log('📨 Received state update from elder');
        handleStateUpdate(message.payload);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [elder.id]);

  const fetchElderState = async () => {
    try {
      setError(null);
      console.log('📤 Requesting state from elder:', elder.id);

      const response = await wsService.sendRequest<StatePayload>(
        'GET_STATE',
        elder.id,
        {
          includeMedications: true,
          includeAlertsSummary: true,
          includeHealthSummary: true,
        }
      );

      console.log('✅ Received elder state:', response);
      handleStateUpdate(response);
    } catch (err) {
      console.error('❌ Failed to fetch elder state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch elder data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleStateUpdate = (payload: StatePayload) => {
    setElderState(payload);
    
    // Update elder in store with fresh data
    updateElder(elder.id, {
      name: payload.elder.name || elder.name,
      age: payload.elder.age,
      batteryLevel: payload.elder.batteryLevel,
      lastSeen: payload.elder.lastHeartbeat,
      isOnline: true, // If we got a response, elder is online
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchElderState();
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetchElderState();
  };

  const handleRemoveElder = () => {
    Alert.alert(
      'Remove Elder',
      `Are you sure you want to remove ${elderState?.elder.name || elder.name}?\n\nThis will unpair this device from your guardian account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from local store
              await useEldersStore.getState().removeElder(elder.id);
              
              Alert.alert('Success', 'Elder removed successfully', [
                {
                  text: 'OK',
                  onPress: onBack,
                },
              ]);
            } catch (error) {
              console.error('❌ Error removing elder:', error);
              Alert.alert('Error', 'Failed to remove elder. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{elder.name}</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading elder data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{elder.name}</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load Data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <Text style={styles.errorHint}>
            Make sure the elder's device is online and connected.
          </Text>
        </View>
      </View>
    );
  }

  const batteryColor = elderState?.elder.batteryLevel 
    ? elderState.elder.batteryLevel < 20 
      ? COLORS.error 
      : elderState.elder.batteryLevel < 50 
        ? COLORS.warning 
        : COLORS.success
    : COLORS.textSecondary;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{elderState?.elder.name || elder.name}</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS.online }]}>
                <Text style={styles.statusBadgeText}>Online</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Battery</Text>
              <Text style={[styles.statusValue, { color: batteryColor }]}>
                {elderState?.elder.batteryLevel ?? '--'}%
              </Text>
            </View>

            {elderState?.elder.age && (
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Age</Text>
                <Text style={styles.statusValue}>{elderState.elder.age}</Text>
              </View>
            )}

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Last Seen</Text>
              <Text style={styles.statusValue}>
                {elderState?.elder.lastHeartbeat 
                  ? formatTimestamp(elderState.elder.lastHeartbeat)
                  : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Alerts */}
        {elderState?.recentAlerts && elderState.recentAlerts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Alerts</Text>
            {elderState.recentAlerts.map((alert, index) => (
              <View key={index} style={styles.alertItem}>
                <View style={[
                  styles.alertDot,
                  { backgroundColor: getAlertColor(alert.type) }
                ]} />
                <View style={styles.alertContent}>
                  <Text style={styles.alertType}>{formatAlertType(alert.type)}</Text>
                  <Text style={styles.alertTime}>
                    {formatTimestamp(alert.triggeredAt)}
                  </Text>
                </View>
                {!alert.resolved && (
                  <View style={styles.unresolvedBadge}>
                    <Text style={styles.unresolvedText}>Active</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Medication Summary */}
        {elderState?.medicationSummary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Medications Today</Text>
            
            <View style={styles.medicationGrid}>
              <View style={styles.medicationItem}>
                <Text style={styles.medicationValue}>
                  {elderState.medicationSummary.todayTotal}
                </Text>
                <Text style={styles.medicationLabel}>Total</Text>
              </View>

              <View style={styles.medicationItem}>
                <Text style={[styles.medicationValue, { color: COLORS.success }]}>
                  {elderState.medicationSummary.takenToday}
                </Text>
                <Text style={styles.medicationLabel}>Taken</Text>
              </View>

              <View style={styles.medicationItem}>
                <Text style={[styles.medicationValue, { color: COLORS.error }]}>
                  {elderState.medicationSummary.missedToday}
                </Text>
                <Text style={styles.medicationLabel}>Missed</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onNavigateToMedications}
          >
            <Text style={styles.actionButtonText}>💊 View Medications</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onNavigateToAlerts}
          >
            <Text style={styles.actionButtonText}>🚨 View All Alerts</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onNavigateToHealth}
          >
            <Text style={styles.actionButtonText}>❤️ Health Check-ins</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manage Elder</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleRemoveElder}
          >
            <Text style={styles.dangerButtonText}>🗑️ Remove Elder</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}

function formatAlertType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'SOS': '🆘 Emergency',
    'FALL': '⚠️ Fall Detected',
    'MISSED_MED': '💊 Missed Medication',
    'INACTIVITY': '😴 No Activity',
    'LOW_BATTERY': '🔋 Low Battery',
  };
  return typeMap[type] || type;
}

function getAlertColor(type: string): string {
  const severity = ALERT_SEVERITY[type as keyof typeof ALERT_SEVERITY] || 'info';
  
  const colorMap = {
    critical: COLORS.alertCritical,
    warning: COLORS.alertWarning,
    info: COLORS.alertInfo,
  };
  
  return colorMap[severity];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statusItem: {
    flex: 1,
    minWidth: 100,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  alertDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  unresolvedBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unresolvedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  medicationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  medicationItem: {
    alignItems: 'center',
  },
  medicationValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  medicationLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionButton: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  dangerButton: {
    borderColor: COLORS.error,
  },
  dangerButtonText: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: '600',
  },
});