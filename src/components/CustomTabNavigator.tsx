import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {Cog, Printer, History, Settings, FileText} from 'lucide-react-native';

// Import pages
import SettingsPage from '../pages/SettingsPage';
import PrintPage from '../pages/PrintPage';
import PPDsPage from '../pages/PPDsPage';
import HistoryPage from '../pages/HistoryPage';
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

  const renderTab = (
    tabName: TabType,
    IconComponent: React.ComponentType<any>,
    title: string,
  ) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}>
      <IconComponent
        size={24}
        color={activeTab === tabName ? '#8A2BE2' : '#666'}
      />
      <Text
        style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>{renderTabContent()}</View>

      <View style={styles.tabBar}>
        {renderTab('Settings', Cog, 'Settings')}
        {renderTab('Print', Printer, 'Print')}
        {renderTab('Logs', History, 'Print Sessions')}
        {renderTab('PPDS', Printer, 'PPDS')}
        {renderTab('Labels', Printer, 'Labels')}
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
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 10,
    paddingTop: 10,
    height: 70,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  activeTab: {
    // Active tab styling
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#8A2BE2',
    fontWeight: '600',
  },
});

export default CustomTabNavigator;
