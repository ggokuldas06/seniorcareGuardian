// src/screens/elders/EldersListScreen.tsx - WITH LOGOUT
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { COLORS, STATUS_COLORS } from '../../utils/constants';
import { useEldersStore } from '../../store/eldersStore';
import { useAuthStore } from '../../store/authStore';
import { useConnectionStore } from '../../store/connectionStore';
import { Elder } from '../../types';
import AddElderScreen from './AddElderScreen';

interface EldersListScreenProps {
  onElderPress: (elder: Elder) => void;
  onLogout: () => void;
  onSettings: () => void;
}

export default function EldersListScreen({ onElderPress, onLogout, onSettings }: EldersListScreenProps) {
  const [showAddElder, setShowAddElder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const { elders, loadElders } = useEldersStore();
  const { guardian } = useAuthStore();
  const { status } = useConnectionStore();

  useEffect(() => {
    loadElders();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadElders();
    setRefreshing(false);
  };

  const handleAddElderSuccess = () => {
    setShowAddElder(false);
    loadElders(); // Refresh list
  };

  if (showAddElder) {
    return (
      <AddElderScreen
        onSuccess={handleAddElderSuccess}
        onCancel={() => setShowAddElder(false)}
      />
    );
  }

  const renderElderCard = ({ item: elder }: { item: Elder }) => (
    <TouchableOpacity
      style={styles.elderCard}
      onPress={() => onElderPress(elder)}
      activeOpacity={0.7}
    >
      <View style={styles.elderHeader}>
        <View style={styles.elderInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.elderName}>{elder.name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: elder.isOnline ? STATUS_COLORS.online : STATUS_COLORS.offline },
              ]}
            >
              <Text style={styles.statusText}>
                {elder.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          
          {elder.age && (
            <Text style={styles.elderDetail}>Age: {elder.age}</Text>
          )}
          
          {elder.relationship && (
            <Text style={styles.elderDetail}>Relationship: {elder.relationship}</Text>
          )}
        </View>
      </View>

      <View style={styles.elderFooter}>
        {elder.batteryLevel !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Battery:</Text>
            <Text style={[
              styles.statValue,
              { color: elder.batteryLevel < 20 ? COLORS.error : COLORS.text }
            ]}>
              {elder.batteryLevel}%
            </Text>
          </View>
        )}

        {elder.lastSeen && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Last Seen:</Text>
            <Text style={styles.statValue}>
              {formatLastSeen(elder.lastSeen)}
            </Text>
          </View>
        )}

        {elder.lastAlert && (
          <View style={[styles.alertBadge, { backgroundColor: COLORS.alertWarning }]}>
            <Text style={styles.alertText}>⚠️ {elder.lastAlert.type}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>👴🏻👵🏻</Text>
      <Text style={styles.emptyTitle}>No Elders Yet</Text>
      <Text style={styles.emptyText}>
        Add your first elder to start monitoring their well-being
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setShowAddElder(true)}
      >
        <Text style={styles.emptyButtonText}>Add Elder</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, {guardian?.name || 'Guardian'}!</Text>
          <Text style={styles.subtitle}>
            {elders.length} {elders.length === 1 ? 'Elder' : 'Elders'} Connected
          </Text>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: status === 'connected' ? STATUS_COLORS.online : STATUS_COLORS.offline }
            ]} />
            <Text style={styles.connectionText}>
              {status === 'connected' ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onSettings}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddElder(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Elders List */}
      <FlatList
        data={elders}
        renderItem={renderElderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          elders.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      />
    </View>
  );
}

function formatLastSeen(lastSeen: string): string {
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerButtons: {
    gap: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  elderCard: {
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
  elderHeader: {
    marginBottom: 12,
  },
  elderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  elderName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  elderDetail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  elderFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});