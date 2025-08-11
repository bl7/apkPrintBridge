import React, {useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import SettingsPage from '../pages/SettingsPage';
import PrintPage from '../pages/PrintPage';
import HistoryPage from '../pages/HistoryPage';
import PPDsPage from '../pages/PPDsPage';
import LabelsPage from '../pages/LabelsPage';

type TabType = 'Settings' | 'Print' | 'Logs' | 'PPDS' | 'Labels';

const CustomTabNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('Settings');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Settings':
        return <SettingsPage />;
      case 'Print':
        return <PrintPage />;
      case 'Logs':
        return <HistoryPage />;
      case 'PPDS':
        return <PPDsPage />;
      case 'Labels':
        return <LabelsPage />;
      default:
        return <SettingsPage />;
    }
  };

  const renderTab = (tab: TabType, iconName: string, label: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => setActiveTab(tab)}>
        <MaterialIcons
          name={iconName}
          size={24}
          color={isActive ? 'white' : '#8A2BE2'}
        />
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>{renderTabContent()}</View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {renderTab('Settings', 'bluetooth', 'Settings')}
        {renderTab('Print', 'print', 'Print')}
        {renderTab('Logs', 'history', 'Print Sessions')}
        {renderTab('PPDS', 'settings', 'PPDS')}
        {renderTab('Labels', 'label', 'Labels')}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#8A2BE2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A2BE2',
    textAlign: 'center',
  },
  activeTabText: {
    color: 'white',
  },
});

export default CustomTabNavigator;
