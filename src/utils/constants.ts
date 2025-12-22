// src/utils/constants.ts

// API Configuration
// IMPORTANT: Update these with your Mac's IP address when testing on phone
// Find your IP: Open Terminal and run: ifconfig | grep "inet " | grep -v 127.0.0.1

// For testing on physical phone (same WiFi as Mac):
export const API_BASE_URL = 'ur ip here'; // REPLACE WITH YOUR MAC'S IP
export const WS_BASE_URL = 'ws://ur ip here'; // REPLACE WITH YOUR MAC'S IP

// For testing on simulator (same machine):
// export const API_BASE_URL = 'http://localhost:3000';
// export const WS_BASE_URL = 'ws://localhost:3000';

// API Endpoints
export const API_ENDPOINTS = {
  REGISTER: '/api/guardian/register',
  PAIR: '/api/pair',
  GET_ELDERS: '/api/guardian', // /:guardianId/elders
};

// WebSocket Configuration
export const WS_RECONNECT_INTERVAL = 3000; // 3 seconds
export const WS_MAX_RECONNECT_ATTEMPTS = 10;
export const WS_REQUEST_TIMEOUT = 30000; // 30 seconds

// Storage Keys
export const STORAGE_KEYS = {
  GUARDIAN_TOKEN: 'guardian_token',
  GUARDIAN_ID: 'guardian_id',
  GUARDIAN_INFO: 'guardian_info',
  ELDERS_CACHE: 'elders_cache',
};

// Alert Severity
export const ALERT_SEVERITY = {
  SOS: 'critical',
  FALL: 'critical',
  MISSED_MED: 'warning',
  INACTIVITY: 'warning',
  LOW_BATTERY: 'info',
} as const;

// Colors (for consistent theming)
export const COLORS = {
  primary: '#6200ee',
  secondary: '#03dac6',
  error: '#b00020',
  warning: '#ff9800',
  success: '#4caf50',
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#000000',
  textSecondary: '#666666',
  border: '#e0e0e0',
  
  // Alert colors
  alertCritical: '#d32f2f',
  alertWarning: '#f57c00',
  alertInfo: '#1976d2',
};

// Status Colors
export const STATUS_COLORS = {
  online: '#4caf50',
  offline: '#9e9e9e',
  warning: '#ff9800',
  error: '#f44336',
};