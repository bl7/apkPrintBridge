import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  apiService,
  LoginRequest,
  LoginResponse,
  ApiError,
} from '../services/api';

// Types for authentication context
interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'instalabel_access_token',
  USER_DATA: 'instalabel_user_data',
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check authentication status from stored tokens
  const checkAuthStatus = async () => {
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (accessToken && userData) {
        // Set token in API service
        apiService.setAccessToken(accessToken);

        // Parse and set user data
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  // Store authentication data
  const storeAuthData = async (accessToken: string, userData: User) => {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.USER_DATA, JSON.stringify(userData)],
      ]);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Failed to save authentication data');
    }
  };

  // Clear authentication data
  const clearAuthData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);

      // Clear from API service
      apiService.clearAccessToken();

      // Clear state
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  // Login function
  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);

      // Call API login
      const response: LoginResponse = await apiService.login(credentials);

      // Transform API response to our User interface
      const userData: User = {
        id: response.uuid,
        email: response.email,
        name: response.name,
      };

      // Store token and user data
      await storeAuthData(response.token, userData);

      // Set token in API service
      apiService.setAccessToken(response.token);

      // Update state
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);

      // Handle specific API errors
      if (error && typeof error === 'object' && 'message' in error) {
        const apiError = error as ApiError;
        throw new Error(apiError.message);
      }

      throw new Error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);

      // Clear all local data
      await clearAuthData();
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear data even if there's an error
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
