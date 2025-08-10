import React, {useState} from 'react';
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import {PrinterProvider} from './src/PrinterContext';
import {AuthProvider, useAuth} from './src/contexts/AuthContext';
import PrinterConnectionPage from './src/pages/PrinterConnectionPage';
import PrintPage from './src/pages/PrintPage';
import LoginPage from './src/pages/LoginPage';

// Import debug script in development
if (__DEV__) {
  require('./debug_printbridge.js');
}

// Main App Content Component
const AppContent: React.FC = () => {
  const {isAuthenticated, logout, user} = useAuth();
  const [activeTab, setActiveTab] = useState<'connection' | 'print'>(
    'connection',
  );

  const handleTabSwitch = (tab: 'connection' | 'print') => {
    setActiveTab(tab);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API fails
    }
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  // Show main app content if authenticated
  return (
    <PrinterProvider>
      <SafeAreaView style={styles.container}>
        {/* Header with User Info and Logout */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>InstaLabel</Text>
            {user && <Text style={styles.userInfo}>Welcome, {user.name}</Text>}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'connection' && styles.activeTab]}
            onPress={() => handleTabSwitch('connection')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'connection' && styles.activeTabText,
              ]}>
              📱 Connection
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'print' && styles.activeTab]}
            onPress={() => handleTabSwitch('print')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'print' && styles.activeTabText,
              ]}>
              🖨️ Print
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'connection' ? (
            <PrinterConnectionPage />
          ) : (
            <PrintPage />
          )}
        </View>
      </SafeAreaView>
    </PrinterProvider>
  );
};

// Main App Component with Providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8A2BE2',
    marginBottom: 2,
  },
  userInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  logoutButton: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#8A2BE2',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
});

export default App;
