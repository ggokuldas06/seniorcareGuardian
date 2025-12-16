// src/services/api.ts - COMPLETE FILE
import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../utils/constants';
import { ApiResponse } from '../types';

class ApiService {
  private client: AxiosInstance;
  private guardianId: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log('📥 API Response:', response.status, response.config.url);
        return response;
      },
      (error: AxiosError) => {
        console.error('❌ Response Error:', error.response?.status, error.message);
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const message = (error.response.data as any)?.error || error.message;
      return new Error(message);
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return new Error(error.message);
    }
  }

  setGuardianId(id: string) {
    this.guardianId = id;
  }

  /**
   * Register Guardian
   */
  async register(name: string, phone: string): Promise<ApiResponse<{
    guardianId: string;
    token: string;
    name: string;
    phone: string;
  }>> {
    try {
      const response = await this.client.post(API_ENDPOINTS.REGISTER, {
        name,
        phone,
      });
      
      if (response.data.success) {
        this.guardianId = response.data.data.guardianId;
      }
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Pair with Elder using pairing code
   * UPDATED: Now includes guardianId
   */
  async pairWithElder(pairingCode: string): Promise<ApiResponse<{
    elderId: string;
    pairedAt: string;
  }>> {
    try {
      if (!this.guardianId) {
        throw new Error('Guardian ID not set. Please login first.');
      }

      const response = await this.client.post(API_ENDPOINTS.PAIR, {
        guardianId: this.guardianId,
        pairingCode,
      });
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get list of paired elders
   */
  async getPairedElders(): Promise<ApiResponse<Array<{
    elderId: string;
    pairedAt: string;
    isOnline: boolean;
  }>>> {
    try {
      if (!this.guardianId) {
        throw new Error('Guardian ID not set');
      }

      const response = await this.client.get(`${API_ENDPOINTS.GET_ELDERS}/${this.guardianId}/elders`);
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Test server connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();