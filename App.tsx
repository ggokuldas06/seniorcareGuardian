// App.tsx - COMPLETE FINAL VERSION
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import { useConnectionStore } from './src/store/connectionStore';
import { useEldersStore } from './src/store/eldersStore';
import { wsService } from './src/services/websocket';
import { apiService } from './src/services/api';
import LoginScreen from './src/screens/auth/LoginScreen';
import EldersListScreen from './src/screens/elders/EldersListScreen';
import ElderOverviewScreen from './src/screens/elders/ElderOverviewScreen';
import MedicationsScreen from './src/screens/elders/MedicationsScreen';
import AlertsHistoryScreen from './src/screens/elders/AlertsHistoryScreen';
import HealthCheckinsScreen from './src/screens/elders/HealthCheckinsScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import { COLORS } from './src/utils/constants';
import { Elder } from './src/types';

type Screen = 
  | { name: 'list' }
  | { name: 'overview'; elder: Elder }
  | { name: 'medications'; elder: Elder }
  | { name: 'alerts'; elder: Elder }
  | { name: 'health'; elder: Elder }
  | { name: 'settings' };

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>({ name: 'list' });
  
  const { isAuthenticated, guardian, loadGuardian, clearGuardian } = useAuthStore();
  const { setStatus } = useConnectionStore();
  const { loadElders } = useEldersStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing app...');
      await loadGuardian();
      console.log('✅ App initialized');
    } catch (error) {
      console.error('❌ Initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && guardian) {
      console.log('🔌 Auto-connecting WebSocket for guardian:', guardian.id);
      
      wsService.disconnect();
      apiService.setGuardianId(guardian.id);
      wsService.connect(guardian.id);
      loadElders();
      
      const unsubscribe = wsService.onStatusChange((status) => {
        console.log('🔌 Connection status:', status);
        setStatus(status);
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [isAuthenticated, guardian]);

  const handleLoginSuccess = () => {
    console.log('✅ Login success');
  };

  const handleElderPress = (elder: Elder) => {
    console.log('📱 Opening elder overview:', elder.name);
    setCurrentScreen({ name: 'overview', elder });
  };

  const handleBackToList = () => {
    console.log('📱 Returning to elders list');
    setCurrentScreen({ name: 'list' });
    loadElders();
  };

  const handleNavigateToMedications = (elder: Elder) => {
    console.log('📱 Opening medications for:', elder.name);
    setCurrentScreen({ name: 'medications', elder });
  };

  const handleNavigateToAlerts = (elder: Elder) => {
    console.log('📱 Opening alerts for:', elder.name);
    setCurrentScreen({ name: 'alerts', elder });
  };

  const handleNavigateToHealth = (elder: Elder) => {
    console.log('📱 Opening health check-ins for:', elder.name);
    setCurrentScreen({ name: 'health', elder });
  };

  const handleBackToOverview = (elder: Elder) => {
    console.log('📱 Returning to overview');
    setCurrentScreen({ name: 'overview', elder });
  };

  const handleOpenSettings = () => {
    console.log('📱 Opening settings');
    setCurrentScreen({ name: 'settings' });
  };

  const handleBackFromSettings = () => {
    console.log('📱 Returning from settings');
    setCurrentScreen({ name: 'list' });
  };

  const handleLogout = async () => {
    console.log('🚪 Logging out...');
    wsService.disconnect();
    await clearGuardian();
    setCurrentScreen({ name: 'list' });
    console.log('✅ Logged out');
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="auto" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  // Navigation based on current screen
  if (currentScreen.name === 'settings') {
    return (
      <>
        <StatusBar style="auto" />
        <SettingsScreen
          onBack={handleBackFromSettings}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (currentScreen.name === 'health') {
    return (
      <>
        <StatusBar style="auto" />
        <HealthCheckinsScreen
          elder={currentScreen.elder}
          onBack={() => handleBackToOverview(currentScreen.elder)}
        />
      </>
    );
  }

  if (currentScreen.name === 'medications') {
    return (
      <>
        <StatusBar style="auto" />
        <MedicationsScreen
          elder={currentScreen.elder}
          onBack={() => handleBackToOverview(currentScreen.elder)}
        />
      </>
    );
  }

  if (currentScreen.name === 'alerts') {
    return (
      <>
        <StatusBar style="auto" />
        <AlertsHistoryScreen
          elder={currentScreen.elder}
          onBack={() => handleBackToOverview(currentScreen.elder)}
        />
      </>
    );
  }

  if (currentScreen.name === 'overview') {
    return (
      <>
        <StatusBar style="auto" />
        <ElderOverviewScreen
          elder={currentScreen.elder}
          onBack={handleBackToList}
          onNavigateToMedications={() => handleNavigateToMedications(currentScreen.elder)}
          onNavigateToAlerts={() => handleNavigateToAlerts(currentScreen.elder)}
          onNavigateToHealth={() => handleNavigateToHealth(currentScreen.elder)}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <EldersListScreen
        onElderPress={handleElderPress}
        onLogout={handleLogout}
        onSettings={handleOpenSettings}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});