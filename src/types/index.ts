// src/types/index.ts

// Guardian Types
export interface Guardian {
  id: string;
  token: string;
  phone?: string;
  name?: string;
}

// Elder Types
export interface Elder {
  id: string;
  name: string;
  age?: number;
  relationship?: string;
  isOnline: boolean;
  lastSeen?: string;
  batteryLevel?: number;
  lastAlert?: AlertSummary;
}

// Alert Types
export type AlertType = 'SOS' | 'FALL' | 'INACTIVITY' | 'LOW_BATTERY' | 'MISSED_MED';

export interface Alert {
  id: string;
  elderId: string;
  type: AlertType;
  triggeredAt: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  batteryLevel?: number;
  resolved: boolean;
  notes?: string;
}

export interface AlertSummary {
  type: AlertType;
  triggeredAt: string;
  resolved: boolean;
}

// Medication Types
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions?: string;
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  time: string; // HH:MM format
  daysOfWeek: number[]; // 0-6, Sunday = 0
  enabled: boolean;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  scheduleId: string;
  scheduledTime: string;
  takenAt?: string;
  status: 'taken' | 'missed' | 'skipped';
}

// Health Check-in Types
export interface HealthCheckIn {
  id: string;
  elderId: string;
  date: string;
  mood?: number; // 1-5
  painLevel?: number; // 1-10
  sleepQuality?: number; // 1-5
  symptoms?: string[];
  notes?: string;
}

// WebSocket Message Types
export type MessageType =
  | 'GET_STATE'
  | 'STATE_RESPONSE'
  | 'GET_MEDICATIONS'
  | 'MEDICATIONS_RESPONSE'
  | 'UPDATE_MEDICATIONS'
  | 'UPDATE_ACK'
  | 'GET_ALERT_HISTORY'
  | 'ALERT_HISTORY_RESPONSE'
  | 'GET_HEALTH_HISTORY'
  | 'HEALTH_HISTORY_RESPONSE'
  | 'ALERT_EVENT';

export interface WebSocketMessage {
  type: MessageType;
  from: string;
  to: string;
  requestId: string;
  payload: any;
  timestamp?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// State Response Payload
export interface StatePayload {
  elder: {
    name: string;
    age?: number;
    batteryLevel: number;
    lastHeartbeat: string;
  };
  recentAlerts: Alert[];
  medicationSummary?: {
    todayTotal: number;
    takenToday: number;
    missedToday: number;
  };
}