import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {PrinterProvider} from './src/PrinterContext';
import PrinterConnectionPage from './src/pages/PrinterConnectionPage';
import PrintPage from './src/pages/PrintPage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'connection' | 'print'>(
    'connection',
  );

  return (
    <PrinterProvider>
      <SafeAreaView style={styles.container}>
        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'connection' && styles.activeTab]}
            onPress={() => setActiveTab('connection')}>
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
            onPress={() => setActiveTab('print')}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1976D2',
    backgroundColor: '#f0f8ff',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});

export default App;
