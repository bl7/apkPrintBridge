import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  History,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Printer,
} from 'lucide-react-native';
import {useAuth} from '../contexts/AuthContext';
import {apiService} from '../services/api';
import {ActivityLog} from '../services/api';

const HistoryPage: React.FC = () => {
  const {accessToken} = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setError(null);
      const response = await apiService.getActivityLogs();
      console.log('Raw logs response:', response);

      // Filter to only show print-related actions since that's what's being logged
      const printLogs = (response.logs || []).filter(log =>
        log.action.toLowerCase().includes('print'),
      );

      console.log('Filtered print logs:', printLogs);

      // Ensure all log details are properly formatted and safe to render
      const sanitizedLogs = printLogs.map(log => {
        // Deep sanitize the details object to prevent any object rendering issues
        const safeDetails: any = {};
        if (log.details && typeof log.details === 'object') {
          Object.keys(log.details).forEach(key => {
            const value = log.details[key];
            if (value !== null && value !== undefined) {
              safeDetails[key] = value;
            }
          });
        }

        return {
          ...log,
          details: safeDetails,
        };
      });

      setLogs(sanitizedLogs);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch print logs';
      setError(errorMessage);
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  useEffect(() => {
    if (accessToken) {
      fetchLogs();
    }
  }, [accessToken]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60),
      );

      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else if (diffInHours < 48) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'Unknown date';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('print')) {
      return <Printer size={16} color="#8A2BE2" />;
    }
    return <FileText size={16} color="#8A2BE2" />;
  };

  const getActionColor = (action: string) => {
    return '#8A2BE2'; // All print actions use the same purple color
  };

  const getActionDisplayName = (action: string) => {
    if (action.toLowerCase().includes('batch')) {
      return 'BATCH PRINT';
    }
    return 'PRINT LABEL';
  };

  // Helper function to safely convert any value to string
  const safeString = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      // If it's an object, try to extract useful information
      if (value.name) return String(value.name);
      if (value.id) return String(value.id);
      if (value.toString) return value.toString();
      return 'Object';
    }
    return String(value);
  };

  const renderLogItem = ({item}: {item: ActivityLog}) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <View style={styles.actionContainer}>
          {getActionIcon(item.action)}
          <Text
            style={[styles.actionText, {color: getActionColor(item.action)}]}>
            {getActionDisplayName(item.action)}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
      </View>

      {item.details && typeof item.details === 'object' && (
        <View style={styles.detailsContainer}>
          {item.details.labelType && (
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Label Type:</Text>{' '}
              {safeString(item.details.labelType).toUpperCase()}
            </Text>
          )}
          {item.details.itemName && (
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Item:</Text>{' '}
              {safeString(item.details.itemName)}
            </Text>
          )}
          {item.details.quantity && (
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Quantity:</Text>{' '}
              {safeString(item.details.quantity)}
            </Text>
          )}
          {item.details.expiryDate && (
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Expiry:</Text>{' '}
              {safeString(item.details.expiryDate)}
            </Text>
          )}

          {item.details.labelHeight && (
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Label Height:</Text>{' '}
              {safeString(item.details.labelHeight)}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8A2BE2" />
          <Text style={styles.loadingText}>Loading print sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={80} color="#F44336" />
          <Text style={styles.errorTitle}>Failed to Load Print Sessions</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText} onPress={fetchLogs}>
            Tap to retry
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!logs.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Printer size={80} color="#8A2BE2" />
          <Text style={styles.title}>Print Sessions</Text>
          <Text style={styles.subtitle}>No print sessions found</Text>
          <Text style={styles.emptySubtitle}>
            Your label printing sessions will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Printer size={24} color="#8A2BE2" />
        <Text style={styles.title}>Print Sessions</Text>
        <Text style={styles.subtitle}>
          {logs.length} print session{logs.length !== 1 ? 's' : ''} recorded
        </Text>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item, index) =>
          `${item.user_id}-${item.created_at}-${index}`
        }
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryText: {
    fontSize: 16,
    color: '#8A2BE2',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#666',
  },
});

export default HistoryPage;
