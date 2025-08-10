import {ENV, API_ENDPOINTS, HTTP_STATUS} from '../config/env';

// Types for API responses
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  uuid: string;
  email: string;
  name: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// API Service Class
class ApiService {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseURL = ENV.API_BASE_URL;
  }

  // Set access token for authenticated requests
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  // Clear access token
  clearAccessToken() {
    this.accessToken = null;
  }

  // Get access token
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Generic HTTP request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if token exists
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      if (ENV.ENABLE_LOGGING) {
        console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      }

      const response = await fetch(url, config);
      const responseData = await response.json();

      if (ENV.ENABLE_LOGGING) {
        console.log(`📡 API Response:`, responseData);
      }

      // Handle HTTP errors
      if (!response.ok) {
        const error: ApiError = {
          message: responseData.message || 'An error occurred',
          status: response.status,
          code: responseData.code,
        };

        // Handle specific status codes
        switch (response.status) {
          case HTTP_STATUS.UNAUTHORIZED:
            error.message = 'Invalid credentials or session expired';
            break;
          case HTTP_STATUS.FORBIDDEN:
            error.message = 'Access denied';
            break;
          case HTTP_STATUS.NOT_FOUND:
            error.message = 'Resource not found';
            break;
          case HTTP_STATUS.INTERNAL_SERVER_ERROR:
            error.message = 'Server error, please try again later';
            break;
        }

        throw error;
      }

      return responseData;
    } catch (error) {
      if (ENV.ENABLE_LOGGING) {
        console.error('❌ API Error:', error);
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw {
          message: 'Network error. Please check your internet connection.',
          status: 0,
          code: 'NETWORK_ERROR',
        } as ApiError;
      }

      // Re-throw API errors
      throw error;
    }
  }

  // Authentication Methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Health check method
  async healthCheck(): Promise<{status: string; timestamp: string}> {
    return this.request<{status: string; timestamp: string}>('/health', {
      method: 'GET',
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types
export type {LoginRequest, LoginResponse, ApiError};
