import React, {useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Types for the labels system
type TabType = 'ingredients' | 'menu';
type LabelHeight = '31mm' | '40mm' | '80mm';
type LabelType = 'cooked' | 'prep' | 'ppds' | 'use-first' | 'defrost';

interface PrintQueueItem {
  uid: string;
  name: string;
  type: TabType;
  quantity: number;
  labelType: LabelType;
  expiryDate: string;
  allergens: string[];
  labelHeight: LabelHeight;
}

interface IngredientItem {
  uid: string;
  name: string;
  allergens: string[];
  category: string;
}

interface MenuItem {
  uid: string;
  name: string;
  ingredients: string[];
  allergens: string[];
  category: string;
}

interface Allergen {
  id: string;
  name: string;
  icon: string;
}

const LabelsPage: React.FC = () => {
  // Core data state
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('ingredients');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Print settings
  const [labelHeight, setLabelHeight] = useState<LabelHeight>('40mm');
  const [customExpiry, setCustomExpiry] = useState<Record<string, string>>({});
  const [initials, setInitials] = useState('NG');

  // Mock data for demonstration
  React.useEffect(() => {
    // Mock ingredients
    setIngredients([
      {
        uid: '1',
        name: 'Potato',
        allergens: [],
        category: 'Vegetables',
      },
      {
        uid: '2',
        name: 'Chicken',
        allergens: [],
        category: 'Protein',
      },
      {
        uid: '3',
        name: 'Tomato',
        allergens: [],
        category: 'Vegetables',
      },
      {
        uid: '4',
        name: 'Onion',
        allergens: [],
        category: 'Vegetables',
      },
      {
        uid: '5',
        name: 'Carrot',
        allergens: [],
        category: 'Vegetables',
      },
    ]);

    // Mock menu items
    setMenuItems([
      {
        uid: 'm1',
        name: 'Chicken Stir Fry',
        ingredients: ['Chicken', 'Bell Peppers', 'Soy Sauce'],
        allergens: ['gluten', 'soy'],
        category: 'Main Course',
      },
      {
        uid: 'm2',
        name: 'Vegetable Curry',
        ingredients: ['Potato', 'Carrot', 'Onion'],
        allergens: [],
        category: 'Main Course',
      },
    ]);

    // Mock allergens
    setAllergens([
      {id: 'gluten', name: 'Gluten', icon: '🌾'},
      {id: 'dairy', name: 'Dairy', icon: '🥛'},
      {id: 'soy', name: 'Soy', icon: '🫘'},
      {id: 'nuts', name: 'Nuts', icon: '🥜'},
    ]);
  }, []);

  // Queue management functions
  const addToPrintQueue = (item: IngredientItem | MenuItem, type: TabType) => {
    const newItem: PrintQueueItem = {
      uid: `${type}-${item.uid}-${Date.now()}`,
      name: item.name,
      type,
      quantity: 1,
      labelType: 'cooked',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      allergens: 'allergens' in item ? item.allergens : [],
      labelHeight,
    };

    setPrintQueue(prev => [...prev, newItem]);
    Alert.alert('Added to Queue', `${item.name} added to print queue`);
  };

  const removeFromQueue = (uid: string) => {
    setPrintQueue(prev => prev.filter(item => item.uid !== uid));
  };

  const updateQuantity = (uid: string, quantity: number) => {
    setPrintQueue(prev =>
      prev.map(item =>
        item.uid === uid ? {...item, quantity: Math.max(1, quantity)} : item,
      ),
    );
  };

  const updateLabelType = (uid: string, labelType: LabelType) => {
    setPrintQueue(prev =>
      prev.map(item => (item.uid === uid ? {...item, labelType} : item)),
    );
  };

  const clearPrintQueue = () => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to clear the entire print queue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setPrintQueue([]),
        },
      ],
    );
  };

  const printLabels = async () => {
    if (printQueue.length === 0) {
      Alert.alert('Empty Queue', 'Please add items to the print queue first');
      return;
    }

    Alert.alert(
      'Print Labels',
      `Printing ${printQueue.length} label(s) with ${labelHeight} height`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Print',
          onPress: () => {
            // Mock printing - in real app this would send to printer
            Alert.alert('Success', 'Labels sent to printer successfully!');
            setPrintQueue([]); // Clear queue after printing
          },
        },
      ],
    );
  };

  const renderTabContent = () => {
    const items = activeTab === 'ingredients' ? ingredients : menuItems;
    const filteredItems = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
      <View style={styles.tabContent}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ingredients or menu items..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Items List */}
        <ScrollView style={styles.itemsList}>
          {filteredItems.map(item => {
            const isInQueue = printQueue.some(
              queueItem => queueItem.name === item.name,
            );
            return (
              <View key={item.uid} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, isInQueue && styles.addedButton]}
                  onPress={() => addToPrintQueue(item, activeTab)}>
                  <Text style={styles.addButtonText}>
                    {isInQueue ? 'Added' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderPrintQueue = () => (
    <View style={styles.queueSection}>
      <View style={styles.queueHeader}>
        <Text style={styles.sectionTitle}>Print Queue</Text>
        <View style={styles.queueActions}>
          <TouchableOpacity
            style={styles.printLabelsButton}
            onPress={printLabels}>
            <Text style={styles.printLabelsButtonText}>Print Labels</Text>
          </TouchableOpacity>
          {printQueue.length > 0 && (
            <TouchableOpacity
              style={styles.clearQueueButton}
              onPress={clearPrintQueue}>
              <Text style={styles.clearQueueButtonText}>Clear Queue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {printQueue.length === 0 ? (
        <View style={styles.emptyQueue}>
          <MaterialIcons name="queue" size={48} color="#ccc" />
          <Text style={styles.emptyQueueText}>Your print queue is empty.</Text>
          <Text style={styles.emptyQueueSubtext}>
            Add items to get started!
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.queueList}>
          {printQueue.map(item => (
            <View key={item.uid} style={styles.queueItem}>
              <View style={styles.queueItemInfo}>
                <Text style={styles.queueItemName}>{item.name}</Text>
                <Text style={styles.queueItemExpiry}>
                  Expires: {item.expiryDate}
                </Text>
              </View>

              <View style={styles.queueItemControls}>
                {/* Quantity Input */}
                <TextInput
                  style={styles.quantityInput}
                  value={item.quantity.toString()}
                  onChangeText={(text: string) =>
                    updateQuantity(item.uid, parseInt(text) || 1)
                  }
                  keyboardType="numeric"
                />

                {/* Remove Button */}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromQueue(item.uid)}>
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderLabelHeightChooser = () => (
    <View style={styles.heightChooserSection}>
      <Text style={styles.sectionTitle}>Label Height</Text>
      <View style={styles.heightOptions}>
        {(['31mm', '40mm', '80mm'] as LabelHeight[]).map(height => (
          <TouchableOpacity
            key={height}
            style={[
              styles.heightOption,
              labelHeight === height && styles.heightOptionActive,
            ]}
            onPress={() => setLabelHeight(height)}>
            <Text
              style={[
                styles.heightOptionText,
                labelHeight === height && styles.heightOptionTextActive,
              ]}>
              {height}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.heightOption,
            labelHeight === '40mm' && styles.heightOptionActive,
          ]}
          onPress={() => setLabelHeight('40mm')}>
          <Text
            style={[
              styles.heightOptionText,
              labelHeight === '40mm' && styles.heightOptionTextActive,
            ]}>
            Compact labels
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInitialsSection = () => (
    <View style={styles.initialsSection}>
      <Text style={styles.initialsLabel}>Initials:</Text>
      <View style={styles.initialsInputContainer}>
        <TextInput
          style={styles.initialsInput}
          value={initials}
          onChangeText={setInitials}
          placeholder="Enter initials"
          maxLength={3}
        />
        <MaterialIcons name="keyboard-arrow-down" size={20} color="#666" />
      </View>
    </View>
  );

  const renderLabelPreview = () => (
    <View style={styles.previewSection}>
      <Text style={styles.sectionTitle}>Label Preview</Text>

      {printQueue.length > 0 ? (
        <View style={styles.previewContent}>
          {printQueue.slice(0, 2).map(item => (
            <View key={item.uid} style={styles.previewItem}>
              <Text style={styles.previewItemLabel}>Expiry Date:</Text>
              <View style={styles.expiryInputContainer}>
                <TextInput
                  style={styles.expiryInput}
                  placeholder="dd/mm/yyyy"
                  value={customExpiry[item.uid] || ''}
                  onChangeText={(text: string) =>
                    setCustomExpiry(prev => ({...prev, [item.uid]: text}))
                  }
                />
                <MaterialIcons name="event" size={20} color="#666" />
              </View>
            </View>
          ))}

          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.useFirstButton}>
              <Text style={styles.useFirstButtonText}>USE FIRST</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.defrostButton}>
              <Text style={styles.defrostButtonText}>DEFROST</Text>
            </TouchableOpacity>
          </View>

          {/* Mock Label Previews */}
          {printQueue.slice(0, 2).map(item => (
            <View key={item.uid} style={styles.mockLabel}>
              <Text style={styles.mockLabelText}>{item.name}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.previewPlaceholder}>
          <Text style={styles.previewText}>
            Select items to preview labels.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Status Bar */}
      <View style={styles.statusBar}>
        <MaterialIcons name="wifi" size={16} color="#4CAF50" />
        <Text style={styles.statusText}>Server Connected (0 printers)</Text>
      </View>

      <View style={styles.mainContent}>
        {/* Top Row */}
        <View style={styles.topRow}>
          {/* Label Printer Section */}
          <View style={styles.labelPrinterSection}>
            <Text style={styles.sectionTitle}>Label Printer</Text>

            {/* Available Printers */}
            <View style={styles.printersBox}>
              <Text style={styles.printersText}>No printers detected</Text>
            </View>

            {/* Label Height Options */}
            {renderLabelHeightChooser()}
          </View>

          {/* Initials Section */}
          {renderInitialsSection()}
        </View>

        {/* Middle Row */}
        <View style={styles.middleRow}>
          {/* Ingredients/Menu Items Section */}
          <View style={styles.itemsSection}>
            {/* Tab Navigation */}
            <View style={styles.tabNavigation}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'ingredients' && styles.activeTab,
                ]}
                onPress={() => setActiveTab('ingredients')}>
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'ingredients' && styles.activeTabText,
                  ]}>
                  Ingredients
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'menu' && styles.activeTab]}
                onPress={() => setActiveTab('menu')}>
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'menu' && styles.activeTabText,
                  ]}>
                  Menu Items
                </Text>
              </TouchableOpacity>
            </View>

            {renderTabContent()}
          </View>

          {/* Print Queue Section */}
          {renderPrintQueue()}
        </View>

        {/* Bottom Row */}
        <View style={styles.bottomRow}>{renderLabelPreview()}</View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  topRow: {
    flexDirection: 'row',
    gap: 20,
  },
  labelPrinterSection: {
    flex: 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  printersBox: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  printersText: {
    color: '#6c757d',
    fontSize: 14,
  },
  heightOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heightOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: 'white',
  },
  heightOptionActive: {
    borderColor: '#8A2BE2',
    backgroundColor: '#f8f9ff',
  },
  heightOptionText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  heightOptionTextActive: {
    color: '#8A2BE2',
  },
  initialsSection: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  initialsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  initialsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  initialsInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  middleRow: {
    flexDirection: 'row',
    gap: 20,
  },
  itemsSection: {
    flex: 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#8A2BE2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  activeTabText: {
    color: 'white',
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  itemsList: {
    maxHeight: 300,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: '#6c757d',
  },
  addButton: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addedButton: {
    backgroundColor: '#6c757d',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  queueSection: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queueHeader: {
    marginBottom: 20,
  },
  queueActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  printLabelsButton: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  printLabelsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clearQueueButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8A2BE2',
  },
  clearQueueButtonText: {
    color: '#8A2BE2',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyQueue: {
    alignItems: 'center',
    padding: 40,
  },
  emptyQueueText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
    marginBottom: 5,
  },
  emptyQueueSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  queueList: {
    maxHeight: 300,
  },
  queueItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  queueItemInfo: {
    marginBottom: 10,
  },
  queueItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  queueItemExpiry: {
    fontSize: 14,
    color: '#6c757d',
  },
  queueItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomRow: {
    flex: 1,
  },
  previewSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewContent: {
    gap: 15,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewItemLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  expiryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  expiryInput: {
    width: 100,
    fontSize: 14,
    color: '#333',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  useFirstButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  useFirstButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  defrostButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  defrostButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mockLabel: {
    backgroundColor: '#000',
    borderRadius: 6,
    padding: 15,
    marginTop: 10,
  },
  mockLabelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  previewText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default LabelsPage;
