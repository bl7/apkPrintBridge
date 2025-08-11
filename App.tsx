import React from 'react';
import {AuthProvider, useAuth} from './src/contexts/AuthContext';
import {PrinterProvider} from './src/PrinterContext';
import LoginPage from './src/pages/LoginPage';
import CustomTabNavigator from './src/components/CustomTabNavigator';

// Import debug script in development
if (__DEV__) {
  require('./debug_printbridge.js');
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PrinterProvider>
        <AppContent />
      </PrinterProvider>
    </AuthProvider>
  );
};

// Move AppContent inside the context providers
const AppContent: React.FC = () => {
  const {isAuthenticated, accessToken} = useAuth();

  // Debug: Log the token being passed
  console.log('🔑 AppContent - isAuthenticated:', isAuthenticated);
  console.log(
    '🔑 AppContent - accessToken:',
    accessToken ? accessToken.substring(0, 20) + '...' : 'null',
  );
  console.log('🔑 AppContent - token length:', accessToken?.length || 0);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <CustomTabNavigator />;
};

export default App;
