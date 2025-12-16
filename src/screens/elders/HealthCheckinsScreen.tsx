// src/screens/elders/HealthCheckinsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../utils/constants';
import { Elder, HealthCheckIn } from '../../types';
import { wsService } from '../../services/websocket';

interface HealthCheckinsScreenProps {
  elder: Elder;
  onBack: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HealthCheckinsScreen({ elder, onBack }: HealthCheckinsScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkIns, setCheckIns] = useState<HealthCheckIn[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealthHistory();
  }, []);

  const fetchHealthHistory = async () => {
    try {
      setError(null);
      console.log('📤 Requesting health history from elder:', elder.id);

      const response = await wsService.sendRequest<{ checkIns: HealthCheckIn[] }>(
        'GET_HEALTH_HISTORY',
        elder.id,
        {}
      );

      console.log('✅ Received health check-ins:', response);
      setCheckIns(response.checkIns || []);
    } catch (err) {
      console.error('❌ Failed to fetch health history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealthHistory();
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getMoodEmoji = (mood?: number): string => {
    if (!mood) return '😐';
    if (mood >= 5) return '😊';
    if (mood >= 4) return '🙂';
    if (mood >= 3) return '😐';
    if (mood >= 2) return '😕';
    return '😢';
  };

  const getPainColor = (pain?: number): string => {
    if (!pain) return COLORS.success;
    if (pain >= 7) return COLORS.error;
    if (pain >= 4) return COLORS.warning;
    return COLORS.success;
  };

  const getSleepQualityText = (quality?: number): string => {
    if (!quality) return 'Not recorded';
    if (quality >= 4) return 'Excellent';
    if (quality >= 3) return 'Good';
    if (quality >= 2) return 'Fair';
    return 'Poor';
  };

  const calculateAverages = () => {
    if (checkIns.length === 0) return null;

    const recentCheckIns = checkIns.slice(0, 7); // Last 7 days
    const avgMood = recentCheckIns.reduce((sum, c) => sum + (c.mood || 0), 0) / recentCheckIns.length;
    const avgPain = recentCheckIns.reduce((sum, c) => sum + (c.painLevel || 0), 0) / recentCheckIns.length;
    const avgSleep = recentCheckIns.reduce((sum, c) => sum + (c.sleepQuality || 0), 0) / recentCheckIns.length;

    return {
      mood: avgMood.toFixed(1),
      pain: avgPain.toFixed(1),
      sleep: avgSleep.toFixed(1),
    };
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Check-ins</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading health data...</Text>
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
          <Text style={styles.headerTitle}>Health Check-ins</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHealthHistory}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const averages = calculateAverages();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Check-ins</Text>
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
        {/* Averages Card */}
        {averages && checkIns.length > 0 && (
          <View style={styles.averagesCard}>
            <Text style={styles.averagesTitle}>7-Day Averages</Text>
            <View style={styles.averagesGrid}>
              <View style={styles.averageItem}>
                <Text style={styles.averageLabel}>Mood</Text>
                <Text style={styles.averageValue}>{getMoodEmoji(parseFloat(averages.mood))}</Text>
                <Text style={styles.averageNumber}>{averages.mood}/5</Text>
              </View>

              <View style={styles.averageItem}>
                <Text style={styles.averageLabel}>Pain</Text>
                <Text style={[styles.averageValue, { color: getPainColor(parseFloat(averages.pain)) }]}>
                  {parseFloat(averages.pain).toFixed(1)}
                </Text>
                <Text style={styles.averageNumber}>out of 10</Text>
              </View>

              <View style={styles.averageItem}>
                <Text style={styles.averageLabel}>Sleep</Text>
                <Text style={styles.averageValue}>😴</Text>
                <Text style={styles.averageNumber}>{averages.sleep}/5</Text>
              </View>
            </View>
          </View>
        )}

        {/* Check-ins List */}
        {checkIns.length > 0 ? (
          checkIns.map((checkIn) => (
            <View key={checkIn.id} style={styles.checkInCard}>
              <View style={styles.checkInHeader}>
                <Text style={styles.checkInDate}>{formatDate(checkIn.date)}</Text>
                <Text style={styles.checkInEmoji}>{getMoodEmoji(checkIn.mood)}</Text>
              </View>

              <View style={styles.metricsGrid}>
                {checkIn.mood !== undefined && (
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Mood</Text>
                    <View style={styles.metricBar}>
                      <View style={[
                        styles.metricFill,
                        { 
                          width: `${(checkIn.mood / 5) * 100}%`,
                          backgroundColor: COLORS.primary
                        }
                      ]} />
                    </View>
                    <Text style={styles.metricValue}>{checkIn.mood}/5</Text>
                  </View>
                )}

                {checkIn.painLevel !== undefined && (
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Pain Level</Text>
                    <View style={styles.metricBar}>
                      <View style={[
                        styles.metricFill,
                        { 
                          width: `${(checkIn.painLevel / 10) * 100}%`,
                          backgroundColor: getPainColor(checkIn.painLevel)
                        }
                      ]} />
                    </View>
                    <Text style={styles.metricValue}>{checkIn.painLevel}/10</Text>
                  </View>
                )}

                {checkIn.sleepQuality !== undefined && (
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Sleep Quality</Text>
                    <View style={styles.metricBar}>
                      <View style={[
                        styles.metricFill,
                        { 
                          width: `${(checkIn.sleepQuality / 5) * 100}%`,
                          backgroundColor: COLORS.success
                        }
                      ]} />
                    </View>
                    <Text style={styles.metricValue}>
                      {getSleepQualityText(checkIn.sleepQuality)}
                    </Text>
                  </View>
                )}
              </View>

              {checkIn.symptoms && checkIn.symptoms.length > 0 && (
                <View style={styles.symptomsSection}>
                  <Text style={styles.symptomsLabel}>Symptoms:</Text>
                  <View style={styles.symptomsList}>
                    {checkIn.symptoms.map((symptom, index) => (
                      <View key={index} style={styles.symptomBadge}>
                        <Text style={styles.symptomText}>{symptom}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {checkIn.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{checkIn.notes}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyTitle}>No Check-ins Yet</Text>
            <Text style={styles.emptyText}>
              Health check-ins will appear here once the elder starts recording them.
            </Text>
          </View>
        )}
      </ScrollView>
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
  averagesCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  averagesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  averagesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  averageItem: {
    alignItems: 'center',
  },
  averageLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  averageValue: {
    fontSize: 32,
    marginBottom: 4,
  },
  averageNumber: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  checkInCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkInDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  checkInEmoji: {
    fontSize: 28,
  },
  metricsGrid: {
    gap: 12,
  },
  metricItem: {
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metricBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  metricFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  symptomsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  symptomsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  symptomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  symptomText: {
    fontSize: 12,
    color: COLORS.text,
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    marginTop: 32,
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
    lineHeight: 22,
  },
});