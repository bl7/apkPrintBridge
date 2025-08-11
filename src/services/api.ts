import {
  ENV,
  API_ENDPOINTS,
  HTTP_STATUS,
  INSTALABEL_ENV,
  INSTALABEL_API_ENDPOINTS,
} from '../config/env';

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

// Profile API types
export interface ProfileResponse {
  profile: {
    user_id: string;
    full_name: string;
    email: string;
    company_name: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    phone: string;
    profile_picture: string;
  };
}

// New types for labels system
export interface Allergen {
  uuid: string;
  allergenName: string;
  isCustom: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Ingredient {
  ingredientID: string;
  ingredientName: string;
  allergens: {
    allergenName: string;
    uuid: string;
  }[];
  expiryDays: number;
  printedOn?: string;
}

export interface MenuItem {
  menuItemID: string;
  menuItemName: string;
  expiryDays: number;
  ingredients: {
    uuid: string;
    ingredientName: string;
  }[];
  categoryName?: string;
}

export interface MenuItemsResponse {
  data: {
    categoryName: string;
    items: MenuItem[];
  }[];
}

export interface AllergensResponse {
  data: Allergen[];
}

export interface PrintLabelRequest {
  items: PrintQueueItem[];
  labelHeight: string;
  initials: string;
}

export interface PrintQueueItem {
  uid: string;
  name: string;
  type: 'ingredients' | 'menu';
  quantity: number;
  labelType: 'cooked' | 'prep' | 'ppds' | 'use-first' | 'defrost';
  expiryDate: string;
  allergens: string[];
  ingredients: string[]; // Add ingredients field to store ingredient names
  labelHeight: string;
  customExpiry?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// New types for InstaLabel.co API
export interface LabelSetting {
  label_type: string;
  expiry_days: number;
}

export interface LabelSettingsResponse {
  settings: LabelSetting[];
}

export interface LabelInitialsResponse {
  use_initials: boolean;
  initials: string[];
}

export interface SubscriptionStatus {
  user_id: string;
  plan_id: string;
  plan_name: string;
  status: 'active' | 'trialing' | 'canceled' | string;
  trial_end?: string;
}

export interface SubscriptionResponse {
  subscription: SubscriptionStatus;
}

export interface ActivityLog {
  user_id: string;
  action: string;
  details: any;
  created_at: string;
}

export interface LogsResponse {
  logs: ActivityLog[];
}

// Print label log interface
export interface PrintLabelLog {
  labelType: string;
  itemId: string;
  itemName: string;
  quantity: number;
  printedAt: string;
  expiryDate: string;
  initial?: string;
  labelHeight: string;
  printerUsed: string;
  sessionId?: string;
}

export interface LogRequest {
  action: 'print_label' | 'print_label_batch';
  details: PrintLabelLog | PrintLabelLog[];
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
    if (ENV.ENABLE_LOGGING) {
      console.log(
        '🔑 Token set in API service:',
        token.substring(0, 20) + '...',
      );
    }
  }

  // Get access token
  getAccessToken(): string | null {
    if (ENV.ENABLE_LOGGING) {
      console.log(
        '🔍 Getting access token:',
        this.accessToken ? this.accessToken.substring(0, 20) + '...' : 'null',
      );
    }
    return this.accessToken;
  }

  // Validate if current token is still valid
  async validateToken(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      // Make a simple request to test token validity
      await this.request<{valid: boolean}>('/api/validate-token', {
        method: 'GET',
      });
      return true;
    } catch (error) {
      if (ENV.ENABLE_LOGGING) {
        console.log('❌ Token validation failed:', error);
      }
      return false;
    }
  }

  // Clear access token
  clearAccessToken() {
    this.accessToken = null;
  }

  // Generic HTTP request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    customBaseURL?: string,
  ): Promise<T> {
    const baseURL = customBaseURL || this.baseURL;
    const url = `${baseURL}${endpoint}`;

    // Debug: Log request details
    if (ENV.ENABLE_LOGGING) {
      console.log('🔍 request method - Debug info:');
      console.log('🔍 Endpoint:', endpoint);
      console.log('🔍 Custom base URL:', customBaseURL);
      console.log('🔍 Final base URL:', baseURL);
      console.log('🔍 Final URL:', url);
      console.log('🔍 Current token exists:', !!this.accessToken);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge custom headers if provided
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Add authorization header if token exists
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
      if (ENV.ENABLE_LOGGING) {
        console.log(
          '🔐 Adding Authorization header with token:',
          this.accessToken.substring(0, 20) + '...',
        );
        console.log('🔐 Full Authorization header:', headers.Authorization);
        console.log('🔐 Base URL being used:', baseURL);
        console.log('🔐 Full URL:', url);
      }
    } else {
      if (ENV.ENABLE_LOGGING) {
        console.log('⚠️ No access token available for request');
        console.log('⚠️ Base URL being used:', baseURL);
        console.log('⚠️ Full URL:', url);
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      if (ENV.ENABLE_LOGGING) {
        console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
        console.log('🌐 Headers being sent:', JSON.stringify(headers, null, 2));
        console.log('🌐 Full request config:', JSON.stringify(config, null, 2));
      }

      const response = await fetch(url, config);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        if (ENV.ENABLE_LOGGING) {
          console.log(`📡 Non-JSON Response:`, textResponse.substring(0, 200));
        }
        throw {
          message: `Server returned non-JSON response: ${contentType}`,
          status: response.status,
          code: 'INVALID_RESPONSE',
        } as ApiError;
      }

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
    } catch (error: unknown) {
      if (ENV.ENABLE_LOGGING) {
        console.error('❌ API Error:', error);
        if (error && typeof error === 'object' && 'message' in error) {
          console.error('❌ Error details:', {
            message: (error as any).message,
            status: (error as any).status,
            code: (error as any).code,
            stack: (error as any).stack,
          });
        }
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

  // User authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<void> {
    return this.request<void>('/api/auth/logout', {
      method: 'POST',
    });
  }

  // New methods for labels system
  async getIngredients(): Promise<Ingredient[]> {
    const response = await this.request<{message: string; data: Ingredient[]}>(
      API_ENDPOINTS.INGREDIENTS.GET_ALL,
      {
        method: 'GET',
      },
    );
    return response.data;
  }

  async getMenuItems(): Promise<MenuItem[]> {
    const response = await this.request<MenuItemsResponse>(
      API_ENDPOINTS.MENU_ITEMS.GET_ALL,
      {
        method: 'GET',
      },
    );

    if (response && response.data) {
      const menuItems: MenuItem[] = [];

      // Extract items from all categories
      response.data.forEach(category => {
        if (category.items && Array.isArray(category.items)) {
          category.items.forEach(item => {
            menuItems.push({
              menuItemID: item.menuItemID,
              menuItemName: item.menuItemName,
              expiryDays: item.expiryDays || 7,
              ingredients: item.ingredients || [],
              categoryName: category.categoryName,
            });
          });
        }
      });

      return menuItems;
    }

    return [];
  }

  async getAllergens(): Promise<Allergen[]> {
    const response = await this.request<AllergensResponse>(
      API_ENDPOINTS.ALLERGENS.GET_ALL,
      {
        method: 'GET',
      },
    );

    if (response && response.data) {
      return response.data;
    }

    return [];
  }

  // NEW: Label Settings methods using InstaLabel.co API
  async getLabelSettings(): Promise<LabelSettingsResponse> {
    const response = await this.request<LabelSettingsResponse>(
      INSTALABEL_API_ENDPOINTS.LABEL_SETTINGS.GET,
      {
        method: 'GET',
      },
      INSTALABEL_ENV.API_BASE_URL, // Use different base URL
    );
    return response;
  }

  async getLabelInitials(): Promise<LabelInitialsResponse> {
    const response = await this.request<LabelInitialsResponse>(
      INSTALABEL_API_ENDPOINTS.LABEL_INITIALS.GET,
      {
        method: 'GET',
      },
      INSTALABEL_ENV.API_BASE_URL,
    );

    if (response && response.use_initials !== undefined) {
      return response;
    }

    return {use_initials: false, initials: []};
  }

  // Update label settings
  async updateLabelSettings(
    userId: string,
    settings: LabelSetting[],
  ): Promise<{success: boolean; message: string}> {
    const response = await this.request<{success: boolean; message: string}>(
      INSTALABEL_API_ENDPOINTS.LABEL_SETTINGS.PUT,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          settings: settings,
        }),
      },
      INSTALABEL_ENV.API_BASE_URL,
    );
    return response;
  }

  // Update label initials
  async updateLabelInitials(
    userId: string,
    useInitials: boolean,
    initials: string[],
  ): Promise<{success: boolean; message: string}> {
    const response = await this.request<{success: boolean; message: string}>(
      INSTALABEL_API_ENDPOINTS.LABEL_INITIALS.PUT,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          use_initials: useInitials,
          initials: initials,
        }),
      },
      INSTALABEL_ENV.API_BASE_URL,
    );
    return response;
  }

  // Get user profile including company name
  async getProfile(userId: string): Promise<ProfileResponse> {
    try {
      console.log('🌐 getProfile called with userId:', userId);
      console.log(
        '🌐 Profile API URL:',
        `${INSTALABEL_API_ENDPOINTS.PROFILE.GET}?user_id=${userId}`,
      );
      console.log('🌐 Using base URL:', INSTALABEL_ENV.API_BASE_URL);
      console.log('🔑 Access token available:', !!this.accessToken);

      const response = await this.request<ProfileResponse>(
        `${INSTALABEL_API_ENDPOINTS.PROFILE.GET}?user_id=${userId}`,
        {
          method: 'GET',
        },
        INSTALABEL_ENV.API_BASE_URL,
      );

      // Log the completely raw, unmapped response
      console.log(
        '🔥 RAW FETCH RESPONSE (unmapped):',
        JSON.stringify(response, null, 2),
      );
      console.log('🔥 Raw response type:', typeof response);
      console.log('🔥 Raw response constructor:', response?.constructor?.name);
      console.log(
        '🔥 Raw response is null/undefined:',
        response === null || response === undefined,
      );
      console.log(
        '🔥 Raw response keys (if object):',
        response && typeof response === 'object'
          ? Object.keys(response)
          : 'Not an object',
      );

      console.log('📡 getProfile raw response:', response);
      console.log('📡 Response type:', typeof response);
      console.log(
        '📡 Response keys:',
        response ? Object.keys(response) : 'No response',
      );

      if (response && response.profile) {
        console.log('✅ Profile data found in response');
        console.log('👤 Profile object:', response.profile);
        return response;
      } else {
        console.warn('⚠️ Profile response missing or invalid structure');
        console.warn('⚠️ Expected: { profile: { company_name: "...", ... } }');
        console.warn('⚠️ Got:', response);
        throw new Error(
          'Failed to fetch profile data - invalid response structure',
        );
      }
    } catch (error) {
      console.error('❌ getProfile error:', error);
      throw error;
    }
  }

  // NEW: Subscription status using InstaLabel.co API
  async getSubscriptionStatus(): Promise<SubscriptionResponse> {
    const response = await this.request<SubscriptionResponse>(
      INSTALABEL_API_ENDPOINTS.SUBSCRIPTION.STATUS,
      {
        method: 'GET',
      },
      INSTALABEL_ENV.API_BASE_URL, // Use different base URL
    );
    return response;
  }

  // NEW: Activity logs using InstaLabel.co API
  async getActivityLogs(): Promise<LogsResponse> {
    // Debug: Log the current token state
    if (ENV.ENABLE_LOGGING) {
      console.log('🔍 getActivityLogs - Current token state:');
      console.log('🔍 Token exists:', !!this.accessToken);
      console.log(
        '🔍 Token length:',
        this.accessToken ? this.accessToken.length : 0,
      );
      console.log(
        '🔍 Token preview:',
        this.accessToken ? this.accessToken.substring(0, 50) + '...' : 'null',
      );
    }

    const response = await this.request<LogsResponse>(
      INSTALABEL_API_ENDPOINTS.LOGS.GET,
      {
        method: 'GET',
      },
      INSTALABEL_ENV.API_BASE_URL, // Use different base URL
    );
    return response;
  }

  async postActivityLog(
    logRequest: LogRequest,
  ): Promise<{success: boolean; message: string}> {
    try {
      const response = await this.request<{success: boolean; message: string}>(
        INSTALABEL_API_ENDPOINTS.LOGS.POST,
        {
          method: 'POST',
          body: JSON.stringify(logRequest),
        },
        INSTALABEL_ENV.API_BASE_URL,
      );

      if (response && response.success) {
        return {success: true, message: 'Log posted successfully'};
      } else {
        return {success: false, message: 'Failed to post log'};
      }
    } catch (error) {
      console.error('Error posting activity log:', error);
      return {success: false, message: 'Error posting log'};
    }
  }

  // Log print action
  async logPrintAction(labelData: {
    labelType: string;
    itemId: string;
    itemName: string;
    quantity: number;
    expiryDate: string;
    initial?: string;
    labelHeight: string;
    printerUsed: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      const logData: PrintLabelLog = {
        labelType: labelData.labelType,
        itemId: labelData.itemId,
        itemName: labelData.itemName,
        quantity: labelData.quantity,
        printedAt: new Date().toISOString(),
        expiryDate: labelData.expiryDate,
        initial: labelData.initial,
        labelHeight: labelData.labelHeight,
        printerUsed: labelData.printerUsed,
        sessionId: labelData.sessionId,
      };

      const logRequest: LogRequest = {
        action: 'print_label',
        details: logData,
      };

      await this.postActivityLog(logRequest);
      console.log('Print action logged successfully');
    } catch (error) {
      console.error('Failed to log print action:', error);
      // Don't throw error - logging failure shouldn't stop printing
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
