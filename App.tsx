import React from 'react';
import {AuthProvider} from './src/contexts/AuthContext';
import {PrinterProvider} from './src/PrinterContext';
import LoginPage from './src/pages/LoginPage';
import CustomTabNavigator from './src/components/CustomTabNavigator';
import {useAuth} from './src/contexts/AuthContext';

// Import debug script in development
if (__DEV__) {
  require('./debug_printbridge.js');
}

const AppContent: React.FC = () => {
  const {isAuthenticated} = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <CustomTabNavigator />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PrinterProvider>
        <AppContent />
      </PrinterProvider>
    </AuthProvider>
  );
};

export default App;
