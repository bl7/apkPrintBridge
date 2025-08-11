import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiService, LoginRequest} from '../services/api';

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
} as const;

interface User {
  id: string;
  email: string;
  name: string;
  company_name?: string; // Add company name field
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  handleTokenExpiration: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Check authentication status from stored tokens
  const checkAuthStatus = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (storedToken && userData) {
        // Set token in API service
        apiService.setAccessToken(storedToken);

        // Parse and set user data
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setAccessToken(storedToken);

        // No need to validate token - just trust the stored token
        // If it's invalid, the API calls will fail and we can handle it then
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

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
      setAccessToken(null);
    } catch (err) {
      console.error('Error clearing auth data:', err);
    }
  };

  // Handle token expiration
  const handleTokenExpiration = useCallback(async () => {
    console.warn('🔄 Token expired, logging out user');
    await clearAuthData();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);

      const response = await apiService.login(credentials);

      // Fetch profile data to get company name
      let companyName: string | undefined;
      try {
        console.log('🔍 Fetching profile data for user:', response.uuid);
        console.log(
          '🔍 Profile API endpoint:',
          `https://webdashboard-two.vercel.app/api/profile?user_id=${response.uuid}`,
        );

        const profileResponse = await apiService.getProfile(response.uuid);

        console.log('📡 Raw profile API response:', profileResponse);
        console.log('📋 Profile response type:', typeof profileResponse);
        console.log('📋 Profile response keys:', Object.keys(profileResponse));

        if (profileResponse && profileResponse.profile) {
          console.log(
            '👤 Profile object keys:',
            Object.keys(profileResponse.profile),
          );
          console.log(
            '🏢 Company name from profile:',
            profileResponse.profile.company_name,
          );
          companyName = profileResponse.profile.company_name;
        } else {
          console.warn(
            '⚠️ Profile response structure unexpected:',
            profileResponse,
          );
        }

        console.log('✅ Profile data fetched successfully:', {
          company_name: companyName,
          full_profile: profileResponse.profile,
        });
      } catch (profileError) {
        console.warn('⚠️ Failed to fetch profile data:', profileError);
        console.error('❌ Profile fetch error details:', {
          error: profileError,
          errorMessage:
            profileError instanceof Error
              ? profileError.message
              : 'Unknown error',
          errorStack:
            profileError instanceof Error
              ? profileError.stack
              : 'No stack trace',
        });
        // Continue without company name if profile fetch fails
      }

      // Transform API response to our User interface
      const userData: User = {
        id: response.uuid,
        email: response.email,
        name: response.name,
        company_name: companyName, // Include company name if available
      };

      // Store tokens and user data
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.token);
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData),
      );

      // Set token in API service
      apiService.setAccessToken(response.token);

      // Update state
      setUser(userData);
      setIsAuthenticated(true);
      setAccessToken(response.token);
    } catch (err) {
      console.error('Login error:', err);
      throw err;
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
    } catch (err) {
      console.error('Logout error:', err);
      // Force clear data even if there's an error
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    accessToken,
    login,
    logout,
    handleTokenExpiration,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
