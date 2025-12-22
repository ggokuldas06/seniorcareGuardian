import { WS_BASE_URL, WS_RECONNECT_INTERVAL, WS_MAX_RECONNECT_ATTEMPTS, WS_REQUEST_TIMEOUT } from '../utils/constants';
import { WebSocketMessage, MessageType } from '../types';

/**
 * Generate UUID without external library
 * Works in React Native without crypto.getRandomValues
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionStatusCallback = (status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting') => void;

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private guardianId: string | null = null;
  
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  
  private pendingRequests: Map<string, PendingRequest> = new Map();

  /**
   * Connect to WebSocket server
   */
  connect(guardianId: string) {
    // Ensure any previous socket is fully torn down before creating a new one
    if (this.ws) {
      this.disconnect();
    }

    // Preserve guardianId so pairing remains across logout/login flows
    this.guardianId = guardianId;

    // Reset reconnect attempts for fresh connect
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    this._connect();
  }

  private _connect() {
    if (!this.guardianId) {
      console.error('❌ Cannot connect: missing guardian ID');
      return;
    }

    this.updateStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      // Connect with deviceId and type parameters
      const wsUrl = `${WS_BASE_URL}?deviceId=${this.guardianId}&type=guardian`;
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      // Defensive: if a socket exists and isn't closed, don't create another
      if (this.ws && this.ws.readyState !== WebSocket.CLOSED && this.ws.readyState !== WebSocket.CLOSING) {
        console.log('ℹ️ WebSocket already exists and is not closed; skipping new connect');
        return;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle connection acknowledgment
          if (message.type === 'CONNECTION_ACK') {
            console.log('✅ Connection acknowledged by server');
            return;
          }
          
          console.log('📨 Message received:', message.type);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.updateStatus('disconnected');

        // Clear ws reference after handlers run
        const hadShouldReconnect = this.shouldReconnect;
        if (this.ws) {
          // Clear handlers to avoid any accidental calls
          this.ws.onopen = null;
          this.ws.onmessage = null;
          this.ws.onclose = null;
          this.ws.onerror = null;
          this.ws = null;
        }

        if (hadShouldReconnect && this.reconnectAttempts < WS_MAX_RECONNECT_ATTEMPTS) {
          this.scheduleReconnect();
        } else if (this.reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
          console.error('❌ Max reconnection attempts reached');
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting in ${WS_RECONNECT_INTERVAL}ms (attempt ${this.reconnectAttempts}/${WS_MAX_RECONNECT_ATTEMPTS})`);
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectTimeout = setTimeout(() => {
      this._connect();
    }, WS_RECONNECT_INTERVAL);
  }

  disconnect() {
    // Prevent automatic reconnects during an explicit disconnect (logout)
    this.shouldReconnect = false;

    // Clear any pending reconnect timer
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      // Remove event listeners before closing to avoid race-calls
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (err) {
        // ignore
      }
      this.ws = null;
    }

    // Reject and clear any pending requests
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeout);
      try {
        pending.reject(new Error('WebSocket disconnected'));
      } catch (e) {
        // ignore
      }
    });
    this.pendingRequests.clear();

    // Reset reconnect attempts so next explicit connect starts fresh
    this.reconnectAttempts = 0;

    console.log('🔌 WebSocket disconnected');
  }

  /**
   * Send a request and wait for response
   */
  async sendRequest<T = any>(
    type: MessageType,
    to: string, // elder device ID
    payload: any = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      if (!this.guardianId) {
        reject(new Error('Guardian ID not set'));
        return;
      }

      const requestId = generateUUID(); // Using our custom UUID function

      const message: WebSocketMessage = {
        type,
        from: this.guardianId,
        to,
        requestId,
        payload,
        timestamp: new Date().toISOString(),
      };

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, WS_REQUEST_TIMEOUT);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
      });

      console.log('📤 Sending request:', type, 'to', to);
      this.ws.send(JSON.stringify(message));
    });
  }

  /**
   * Send a message without expecting response
   */
  sendMessage(type: MessageType, to: string, payload: any = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot send: WebSocket not connected');
      return;
    }

    if (!this.guardianId) {
      console.error('❌ Cannot send: Guardian ID not set');
      return;
    }

    const message: WebSocketMessage = {
      type,
      from: this.guardianId,
      to,
      requestId: generateUUID(), // Using our custom UUID function
      payload,
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Sending message:', type);
    this.ws.send(JSON.stringify(message));
  }

  private handleMessage(message: WebSocketMessage) {
    // Check for ERROR messages
    if (message.type === 'ERROR') {
      console.error('❌ Server error:', message.payload?.error || 'Unknown error');
      
      // Reject pending request if it has requestId
      if (message.requestId) {
        const pending = this.pendingRequests.get(message.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.requestId);
          pending.reject(new Error(message.payload?.error || 'Server error'));
        }
      }
      return;
    }

    // Check if this is a response to a pending request
    const pending = this.pendingRequests.get(message.requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.requestId);
      pending.resolve(message.payload);
    }

    // Notify all message handlers
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('❌ Message handler error:', error);
      }
    });
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onStatusChange(callback: ConnectionStatusCallback) {
    this.statusCallbacks.add(callback);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  private updateStatus(status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting') {
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error('❌ Status callback error:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  // ============== Command Methods (Guardian -> Elder) ==============

  /**
   * Add medication to elder's device
   */
  async addMedication(
    elderId: string,
    payload: import('../types').AddMedicationPayload
  ): Promise<import('../types').CommandSuccessPayload> {
    return this.sendRequest('ADD_MEDICATION', elderId, payload);
  }

  /**
   * Update medication on elder's device
   */
  async updateMedication(
    elderId: string,
    payload: import('../types').UpdateMedicationPayload
  ): Promise<import('../types').CommandSuccessPayload> {
    return this.sendRequest('UPDATE_MEDICATION', elderId, payload);
  }

  /**
   * Delete medication from elder's device
   */
  async deleteMedication(
    elderId: string,
    medicationId: string
  ): Promise<import('../types').CommandSuccessPayload> {
    return this.sendRequest('DELETE_MEDICATION', elderId, { medicationId });
  }

  /**
   * Send reminder to elder
   */
  async sendReminder(
    elderId: string,
    payload: import('../types').SendReminderPayload
  ): Promise<import('../types').CommandSuccessPayload> {
    return this.sendRequest('SEND_REMINDER', elderId, payload);
  }

  /**
   * Send message to elder
   */
  async sendMessageToElder(
    elderId: string,
    payload: import('../types').SendMessagePayload
  ): Promise<import('../types').CommandSuccessPayload> {
    return this.sendRequest('SEND_MESSAGE', elderId, payload);
  }

  /**
   * Update emergency contact on elder's device
   */
  async updateEmergencyContact(
    elderId: string,
    payload: import('../types').UpdateEmergencyContactPayload
  ): Promise<import('../types').CommandSuccessPayload> {
    return this.sendRequest('UPDATE_EMERGENCY_CONTACT', elderId, payload);
  }

  /**
   * Delete emergency contact from elder's device
   */
  async deleteEmergencyContact(
    elderId: string,
    contactId: string
  ): Promise<import('../types').CommandSuccessPayload> {
    return this.sendRequest('DELETE_EMERGENCY_CONTACT', elderId, { contactId });
  }
}

export const wsService = new WebSocketService();
