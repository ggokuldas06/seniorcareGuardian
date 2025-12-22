// src/screens/elders/MedicationsScreen.tsx
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
import { COLORS } from '../../utils/constants';
import { Elder, Medication, MedicationSchedule, MedicationLog } from '../../types';
import { wsService } from '../../services/websocket';
import AddMedicationModal from '../../components/AddMedicationModal';
import SendMessageModal from '../../components/SendMessageModal';

interface MedicationsScreenProps {
  elder: Elder;
  onBack: () => void;
}

interface MedicationsData {
  medications: Medication[];
  schedules: MedicationSchedule[];
  logs: MedicationLog[];
}

export default function MedicationsScreen({ elder, onBack }: MedicationsScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<MedicationsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      setError(null);
      console.log('📤 Requesting medications from elder:', elder.id);

      const response = await wsService.sendRequest<MedicationsData>(
        'GET_MEDICATIONS',
        elder.id,
        {}
      );

      console.log('✅ Received medications:', response);
      setData(response);
    } catch (err) {
      console.error('❌ Failed to fetch medications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch medications');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMedications();
  };

  const getMedicationSchedules = (medId: string) => {
    return data?.schedules.filter(s => s.medicationId === medId) || [];
  };

  const formatScheduleTime = (time: string, daysOfWeek: number[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const selectedDays = daysOfWeek.map(d => days[d]).join(', ');
    return `${time} • ${selectedDays}`;
  };

  const handleAddMedication = async (medicationData: {
    name: string;
    dosage: string;
    instructions: string;
    schedules: any[];
  }) => {
    try {
      console.log('📤 Adding medication:', medicationData);

      const response = await wsService.addMedication(elder.id, medicationData);

      console.log('✅ Medication added successfully:', response);
      Alert.alert('Success', response.message || 'Medication added successfully');

      // Refresh medications list
      fetchMedications();
    } catch (error) {
      console.error('❌ Failed to add medication:', error);
      throw error;
    }
  };

  const handleDeleteMedication = async (medicationId: string, medicationName: string) => {
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete "${medicationName}"? This will remove it from the elder's device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('📤 Deleting medication:', medicationId);

              const response = await wsService.deleteMedication(elder.id, medicationId);

              console.log('✅ Medication deleted successfully:', response);
              Alert.alert('Success', response.message || 'Medication deleted successfully');

              // Refresh medications list
              fetchMedications();
            } catch (error) {
              console.error('❌ Failed to delete medication:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete medication');
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = async (message: string) => {
    try {
      console.log('📤 Sending message to elder');

      const response = await wsService.sendMessageToElder(elder.id, {
        guardianName: elder.name || 'Guardian',
        message,
        requiresAcknowledgment: false,
      });

      console.log('✅ Message sent successfully:', response);
      Alert.alert('Success', response.message || 'Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  };

  const handleSendReminder = async (
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'urgent'
  ) => {
    try {
      console.log('📤 Sending reminder to elder');

      const response = await wsService.sendReminder(elder.id, {
        title,
        message,
        priority,
      });

      console.log('✅ Reminder sent successfully:', response);
      Alert.alert('Success', response.message || 'Reminder sent successfully');
    } catch (error) {
      console.error('❌ Failed to send reminder:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medications</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading medications...</Text>
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
          <Text style={styles.headerTitle}>Medications</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMedications}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medications</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowMessageModal(true)}
        >
          <Text style={styles.iconButtonText}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
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
        {data?.medications && data.medications.length > 0 ? (
          data.medications.map((med) => {
            const schedules = getMedicationSchedules(med.id);
            
            return (
              <View key={med.id} style={styles.medicationCard}>
                <View style={styles.medicationHeader}>
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{med.name}</Text>
                    <Text style={styles.medicationDosage}>{med.dosage}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteMedication(med.id, med.name)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                {med.instructions && (
                  <Text style={styles.medicationInstructions}>
                    📝 {med.instructions}
                  </Text>
                )}

                <View style={styles.schedulesSection}>
                  <Text style={styles.schedulesTitle}>Schedule:</Text>
                  {schedules.map((schedule) => (
                    <View key={schedule.id} style={styles.scheduleItem}>
                      <View style={[
                        styles.scheduleDot,
                        { backgroundColor: schedule.enabled ? COLORS.success : COLORS.textSecondary }
                      ]} />
                      <Text style={styles.scheduleText}>
                        {formatScheduleTime(schedule.time, schedule.daysOfWeek)}
                      </Text>
                      {!schedule.enabled && (
                        <View style={styles.disabledBadge}>
                          <Text style={styles.disabledText}>Disabled</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyTitle}>No Medications</Text>
            <Text style={styles.emptyText}>
              No medications have been added yet.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add First Medication</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <AddMedicationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMedication}
      />

      <SendMessageModal
        visible={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        onSendMessage={handleSendMessage}
        onSendReminder={handleSendReminder}
        guardianName={elder.name || 'Guardian'}
      />
    </View>
  );
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
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  iconButtonText: {
    fontSize: 24,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
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
  medicationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  medicationDosage: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  medicationInstructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  schedulesSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  schedulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scheduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  scheduleText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  disabledBadge: {
    backgroundColor: COLORS.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disabledText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});