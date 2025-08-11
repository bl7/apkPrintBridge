import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {apiService, LabelSetting} from '../services/api';

const LabelSettingsDisplay: React.FC = () => {
  const [labelSettings, setLabelSettings] = useState<LabelSetting[]>([]);
  const [labelInitials, setLabelInitials] = useState<string[]>([]);
  const [useInitials, setUseInitials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLabelSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getLabelSettings();
      setLabelSettings(response.settings);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch label settings';
      setError(errorMessage);
      console.error('❌ Error fetching label settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLabelInitials = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getLabelInitials();
      setLabelInitials(response.initials);
      setUseInitials(response.use_initials);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch label initials';
      setError(errorMessage);
      console.error('❌ Error fetching label initials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    refreshLabelSettings();
    refreshLabelInitials();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading label settings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={refreshLabelSettings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Label Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Label Types & Expiry Days:</Text>
        {labelSettings.map((setting, index) => (
          <Text key={index} style={styles.settingText}>
            {setting.label_type}: {setting.expiry_days} days
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Initials Configuration:</Text>
        <Text style={styles.settingText}>
          Use Initials: {useInitials ? 'Yes' : 'No'}
        </Text>
        {useInitials && (
          <View>
            <Text style={styles.settingText}>Available Initials:</Text>
            {labelInitials.map((initial, index) => (
              <Text key={index} style={styles.initialText}>
                {initial}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshLabelSettings}>
          <Text style={styles.refreshButtonText}>Refresh Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshLabelInitials}>
          <Text style={styles.refreshButtonText}>Refresh Initials</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  settingText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  initialText: {
    fontSize: 14,
    marginBottom: 2,
    marginLeft: 16,
    color: '#666',
    fontFamily: 'monospace',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#d32f2f',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  refreshButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LabelSettingsDisplay;
