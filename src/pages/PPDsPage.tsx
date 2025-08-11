import React, {useState, useEffect, useCallback, useRef, Fragment} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';

import Modal from 'react-native-modal';
import {useAuth} from '../contexts/AuthContext';
import {usePrinter} from '../PrinterContext';
import {
  apiService,
  Ingredient,
  MenuItem,
  Allergen,
  PrintQueueItem,
  PrintLabelRequest,
} from '../services/api';
import {
  getAllergensFromIngredients,
  ALLERGEN_ICON_MAP,
} from '../utils/allergenDetection';
import {
  calculateExpiryDate,
  getDefaultExpiryDays,
  generateTSCLabelContent,
  LabelType,
} from '../utils/labelManagement';
import LabelPreview from '../components/LabelPreview';
import LabelSettingsDisplay from '../components/LabelSettingsDisplay';
import {
  Search,
  SearchX,
  List,
  FileText,
  Lock,
  Printer,
  CheckCircle,
  AlertTriangle,
  Wheat,
  Fish,
  Egg,
  Nut,
  Bean,
  Milk,
  Carrot,
  Flame,
  Circle,
  Wine,
  Flower,
  Shell,
  Calendar,
  Plus,
  Minus,
  X,
  Filter,
  SortAsc,
  Clock,
  Tag,
  ShoppingCart,
  Settings,
  Eye,
} from 'lucide-react-native';

// Types for the labels system
type TabType = 'menu'; // Only menu items for PPDS

const isTablet = false; // Simplified for mobile-first design

// Function to render allergen icon
const renderAllergenIcon = (allergen: string, size: number = 12) => {
  // Safety check for undefined/null allergen
  if (!allergen || typeof allergen !== 'string') {
    console.warn('Invalid allergen passed to renderAllergenIcon:', allergen);
    return <AlertTriangle size={size} color="#856404" />;
  }
};

const PPDSPage: React.FC = () => {
  const {isAuthenticated, user} = useAuth();
  const {connectedDevice, isPrinting, printComplexLabel, setIsPrinting} =
    usePrinter();

  // Core data state
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'expiry'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Print settings
  const [customExpiry, setCustomExpiry] = useState<Record<string, string>>({});

  // Label settings from InstaLabel.co API
  const [labelSettings, setLabelSettings] = useState<Record<string, number>>(
    {},
  );
  const [isLoadingLabelSettings, setIsLoadingLabelSettings] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Prompt state
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptMessage, setPromptMessage] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptCallback, setPromptCallback] = useState<
    ((value: string) => void) | null
  >(null);

  // Company name from user context
  const companyName = user?.company_name || 'Your Company';

  // Prompt functions
  const showPrompt = (
    title: string,
    message = '',
    initial = '',
  ): Promise<string | undefined> => {
    return new Promise(resolve => {
      setPromptTitle(title);
      setPromptMessage(message);
      setPromptValue(initial);
      setPromptCallback(() => resolve);
      setPromptVisible(true);
    });
  };

  const handlePromptCancel = () => {
    setPromptVisible(false);
    if (promptCallback) {
      promptCallback('');
    }
  };

  const handlePromptSubmit = () => {
    setPromptVisible(false);
    if (promptCallback) {
      promptCallback(promptValue);
    }
  };

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ingredientsData, menuItemsData, allergensData] = await Promise.all(
        [
          apiService.getIngredients(),
          apiService.getMenuItems(),
          apiService.getAllergens(),
        ],
      );

      setIngredients(ingredientsData);
      setMenuItems(menuItemsData);
      setAllergens(allergensData);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLabelSettings = useCallback(async () => {
    try {
      setIsLoadingLabelSettings(true);
      const settings = await apiService.getLabelSettings();
      const settingsMap: Record<string, number> = {};
      settings.settings.forEach(setting => {
        settingsMap[setting.label_type] = setting.expiry_days;
      });
      setLabelSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching label settings:', error);
    } finally {
      setIsLoadingLabelSettings(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      fetchLabelSettings();
    }
  }, [isAuthenticated, fetchData, fetchLabelSettings]);

  // Print queue management
  const addToPrintQueue = (item: MenuItem, type: TabType) => {
    const existingItem = printQueue.find(
      qItem => qItem.uid === item.menuItemID,
    );

    if (existingItem) {
      // Update quantity if already in queue
      setPrintQueue(prev =>
        prev.map(qItem =>
          qItem.uid === item.menuItemID
            ? {...qItem, quantity: qItem.quantity + 1}
            : qItem,
        ),
      );
      Alert.alert(
        'Updated',
        `${item.menuItemName} quantity increased in queue`,
      );
    } else {
      // Add new item to queue
      const defaultLabelType: LabelType = 'ppds';
      const expiryDays =
        labelSettings[defaultLabelType] ||
        getDefaultExpiryDays(defaultLabelType);
      const expiryDate = calculateExpiryDate(expiryDays);

      const newQueueItem: PrintQueueItem = {
        uid: item.menuItemID,
        name: item.menuItemName,
        type: 'menu',
        quantity: 1,
        labelType: defaultLabelType,
        expiryDate,
        allergens: [],
        ingredients: item.ingredients?.map(i => i.ingredientName) || [],
        labelHeight: '40mm',
      };

      setPrintQueue(prev => [...prev, newQueueItem]);
      Alert.alert('Added', `${item.menuItemName} added to PPDS queue`);
    }
  };

  const removeFromQueue = (uid: string) => {
    setPrintQueue(prev => prev.filter(item => item.uid !== uid));
  };

  const updateQuantity = (uid: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromQueue(uid);
      return;
    }
    setPrintQueue(prev =>
      prev.map(item => (item.uid === uid ? {...item, quantity} : item)),
    );
  };

  const incrementQuantity = (uid: string) => {
    setPrintQueue(prev =>
      prev.map(item =>
        item.uid === uid ? {...item, quantity: item.quantity + 1} : item,
      ),
    );
  };

  const decrementQuantity = (uid: string) => {
    setPrintQueue(prev =>
      prev.map(item =>
        item.uid === uid
          ? {...item, quantity: Math.max(1, item.quantity - 1)}
          : item,
      ),
    );
  };

  const updateLabelType = (uid: string, labelType: LabelType) => {
    setPrintQueue(prev =>
      prev.map(item => (item.uid === uid ? {...item, labelType} : item)),
    );
  };

  const updateCustomExpiry = (uid: string, expiry: string) => {
    setCustomExpiry(prev => ({...prev, [uid]: expiry}));
  };

  const openDatePicker = async (uid: string, currentDate: string) => {
    try {
      const newDate = await showPrompt(
        'Set Custom Expiry Date',
        'Enter expiry date (YYYY-MM-DD):',
        currentDate,
      );
      if (newDate) {
        updateCustomExpiry(uid, newDate);
      }
    } catch (error) {
      console.error('Error setting custom expiry:', error);
    }
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
          onPress: () => {
            setPrintQueue([]);
            setCustomExpiry({});
          },
        },
      ],
    );
  };

  // Printing functionality
  const printLabels = async () => {
    if (!printQueue || printQueue.length === 0) {
      Alert.alert('Empty Queue', 'Please add items to the print queue first');
      return;
    }

    if (!connectedDevice) {
      Alert.alert(
        'No Printer Connected',
        'Please connect a printer first from the Connection page.',
      );
      return;
    }

    try {
      setIsPrinting(true);

      // Print each item in the queue
      for (const item of printQueue) {
        const quantity = item.quantity;

        // Generate the full label content using the same logic as the preview
        let labelContentObj: {
          header: string;
          expiryLine: string;
          printedLine: string;
          ingredientsLine?: string;
          initialsLine?: string;
        };

        // For PPDS page, we only handle menu items
        if (item.type === 'menu') {
          const defaultLabelType = 'ppds'; // Always PPDS for this page
          const expiryDays =
            labelSettings[defaultLabelType] ||
            getDefaultExpiryDays(defaultLabelType);
          const expiryDate = customExpiry[item.uid] || item.expiryDate;

          // Get the full ingredient objects from the stored ingredients array
          const ingredientObjects = item.ingredients
            .map(ingredientName => {
              return ingredients.find(i => i.ingredientName === ingredientName);
            })
            .filter((ing): ing is Ingredient => ing !== undefined);

          labelContentObj = generateTSCLabelContent(
            item.name,
            item.labelType,
            expiryDate,
            ingredientObjects, // Pass full ingredient objects
            item.allergens || [],
            undefined, // printedDate will be generated inside
            undefined, // No initials for PPDS
            companyName, // Pass company name for PPDS labels
          );
        } else {
          // This shouldn't happen on PPDS page, but handle gracefully
          labelContentObj = {
            header: item.name,
            expiryLine: '',
            printedLine: '',
          };
        }

        // Print the specified quantity for this item
        for (let i = 0; i < quantity; i++) {
          await printComplexLabel(labelContentObj);

          // Log the print action
          try {
            await apiService.logPrintAction({
              labelType: item.labelType,
              itemId: item.uid,
              itemName: item.name,
              quantity: 1, // Log each individual print
              expiryDate: customExpiry[item.uid] || item.expiryDate,
              initial: undefined, // No initials for PPDS
              labelHeight: item.labelHeight,
              printerUsed: connectedDevice?.name || 'Unknown Printer',
              sessionId: `print_${Date.now()}`, // Generate unique session ID
            });
          } catch (logError) {
            console.warn('Failed to log print action:', logError);
            // Continue printing even if logging fails
          }

          // Small delay between prints to prevent buffer overflow
          if (i < quantity - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      Alert.alert(
        'Success',
        `${printQueue.length} label types printed successfully!`,
      );
      setPrintQueue([]);
      setCustomExpiry({});
    } catch (error) {
      console.error('Printing error:', error);
      Alert.alert('Error', 'Failed to print labels. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Enhanced tab content with better design
  const renderTabContent = () => {
    const items = menuItems || [];

    // Enhanced filtering and sorting
    let filteredItems = items.filter(item => {
      const name = item.menuItemName;
      if (!name) return false;

      const matchesSearch = name
        .toLowerCase()
        .includes((searchTerm || '').toLowerCase());
      const matchesCategory =
        !showFilters ||
        !searchTerm ||
        item.categoryName?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch && matchesCategory;
    });

    // Apply sorting
    filteredItems.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.menuItemName || '';
          bValue = b.menuItemName || '';
          break;
        case 'category':
          aValue = a.categoryName || '';
          bValue = b.categoryName || '';
          break;
        case 'expiry':
          aValue = a.expiryDays || 0;
          bValue = b.expiryDays || 0;
          break;
        default:
          aValue = a.menuItemName || '';
          bValue = b.menuItemName || '';
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, endIndex);

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8A2BE2" />
          <Text style={styles.loadingText}>Loading menu items...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {/* Enhanced Search and Filter Bar */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search menu items..."
              value={searchTerm || ''}
              onChangeText={(text: string) => setSearchTerm(text || '')}
              placeholderTextColor="#999"
            />
            {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <SearchX size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.filterControls}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                showFilters && styles.filterButtonActive,
              ]}
              onPress={() => setShowFilters(!showFilters)}>
              <Filter size={16} color={showFilters ? '#fff' : '#666'} />
              <Text
                style={[
                  styles.filterButtonText,
                  showFilters && styles.filterButtonTextActive,
                ]}>
                Filters
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortButton}
              onPress={() =>
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
              }>
              <SortAsc
                size={16}
                color="#666"
                style={[
                  sortOrder === 'desc' && {transform: [{rotate: '180deg'}]},
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Options */}
        {showFilters && (
          <View style={styles.filterOptions}>
            <Text style={styles.filterLabel}>Sort by:</Text>
            <View style={styles.sortOptions}>
              {[
                {key: 'name', label: 'Name'},
                {key: 'category', label: 'Category'},
                {key: 'expiry', label: 'Expiry Days'},
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    sortBy === option.key && styles.sortOptionActive,
                  ]}
                  onPress={() => setSortBy(option.key as any)}>
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.key && styles.sortOptionTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Items List */}
        <View style={styles.itemsList}>
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <SearchX size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No menu items found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'No items available'}
              </Text>
            </View>
          ) : (
            <>
              {currentItems.map(item => (
                <TouchableOpacity
                  key={item.menuItemID}
                  style={styles.itemCard}
                  onPress={() => addToPrintQueue(item, 'menu')}>
                  <View style={styles.itemMainInfo}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.menuItemName}</Text>
                      <View style={styles.itemBadges}>
                        <View style={styles.categoryBadge}>
                          <Tag size={12} color="#8A2BE2" />
                          <Text style={styles.categoryText}>
                            {item.categoryName || 'Uncategorized'}
                          </Text>
                        </View>
                        <View style={styles.expiryBadge}>
                          <Clock size={12} color="#FF6B35" />
                          <Text style={styles.expiryText}>
                            {item.expiryDays} days
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Enhanced Ingredients Display */}
                    {item.ingredients && item.ingredients.length > 0 && (
                      <View style={styles.ingredientsSection}>
                        <Text style={styles.ingredientsLabel}>
                          Ingredients:
                        </Text>
                        <View style={styles.ingredientsList}>
                          {item.ingredients
                            .slice(0, 4)
                            .map((ingredient, index) => (
                              <View key={index} style={styles.ingredientTag}>
                                <Text style={styles.ingredientText}>
                                  {ingredient.ingredientName}
                                </Text>
                              </View>
                            ))}
                          {item.ingredients.length > 4 && (
                            <Text style={styles.moreIngredients}>
                              +{item.ingredients.length - 4} more
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => addToPrintQueue(item, 'menu')}>
                      <Plus size={16} color="#fff" />
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <View style={styles.paginationControls}>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === 1 && styles.paginationButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(prev => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}>
                      <Text
                        style={[
                          styles.paginationButtonText,
                          currentPage === 1 &&
                            styles.paginationButtonTextDisabled,
                        ]}>
                        Previous
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfo}>
                      Page {currentPage} of {totalPages}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === totalPages &&
                          styles.paginationButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(prev => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}>
                      <Text
                        style={[
                          styles.paginationButtonText,
                          currentPage === totalPages &&
                            styles.paginationButtonTextDisabled,
                        ]}>
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // Enhanced print queue with better design
  const renderPrintQueue = () => (
    <View style={styles.queueSection}>
      <View style={styles.queueHeader}>
        <View style={styles.queueHeaderLeft}>
          <ShoppingCart size={24} color="#8A2BE2" />
          <Text style={styles.sectionTitle}>PPDS Print Queue</Text>
          <View style={styles.queueCount}>
            <Text style={styles.queueCountText}>
              {printQueue.length} item{printQueue.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.queueHeaderRight}>
          {printQueue.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.clearQueueButton}
                onPress={clearPrintQueue}>
                <X size={16} color="#F44336" />
                <Text style={styles.clearQueueText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.printButton}
                onPress={printLabels}
                disabled={!printQueue || printQueue.length === 0 || isPrinting}>
                <Printer size={16} color="#fff" />
                <Text style={styles.printButtonText}>
                  {isPrinting ? 'Printing...' : 'Print All'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {printQueue.length === 0 ? (
        <View style={styles.emptyQueue}>
          <ShoppingCart size={48} color="#ccc" />
          <Text style={styles.emptyQueueText}>Print queue is empty</Text>
          <Text style={styles.emptyQueueSubtext}>
            Add menu items from above to start printing PPDS labels
          </Text>
        </View>
      ) : (
        <View style={styles.queueItems}>
          {printQueue.map(item => (
            <View key={item.uid} style={styles.queueItem}>
              <View style={styles.queueItemInfo}>
                <Text style={styles.queueItemName}>{item.name}</Text>
                <Text style={styles.queueItemType}>
                  {item.labelType.toUpperCase()} • {item.labelHeight}
                </Text>

                {/* Ingredients in queue */}
                {item.ingredients && item.ingredients.length > 0 && (
                  <View style={styles.queueIngredients}>
                    <Text style={styles.queueIngredientsLabel}>
                      Ingredients:
                    </Text>
                    <View style={styles.queueIngredientsList}>
                      {item.ingredients.slice(0, 3).map((ingredient, index) => (
                        <View key={index} style={styles.queueIngredientTag}>
                          <Text style={styles.queueIngredientText}>
                            {ingredient}
                          </Text>
                        </View>
                      ))}
                      {item.ingredients.length > 3 && (
                        <Text style={styles.moreIngredients}>
                          +{item.ingredients.length - 3} more
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.queueItemControls}>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => decrementQuantity(item.uid)}>
                    <Minus size={16} color="#666" />
                  </TouchableOpacity>

                  <Text style={styles.quantityDisplay}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => incrementQuantity(item.uid)}>
                    <Plus size={16} color="#666" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromQueue(item.uid)}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Enhanced label preview
  const renderLabelPreview = () => {
    if (printQueue.length === 0) {
      return (
        <View style={styles.previewPlaceholder}>
          <Eye size={48} color="#ccc" />
          <Text style={styles.previewText}>
            Select items to preview PPDS labels
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.previewScroll}>
        {printQueue.map(item => (
          <View key={item.uid} style={styles.previewContainer}>
            <LabelPreview
              item={item}
              ingredients={ingredients}
              menuItems={menuItems}
              initials="" // No initials for PPDS
              onUpdateLabelType={updateLabelType}
              labelSettings={labelSettings}
              companyName={companyName}
            />
          </View>
        ))}
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authRequired}>
          <Lock size={64} color="#ccc" />
          <Text style={styles.authRequiredText}>Authentication Required</Text>
          <Text style={styles.authRequiredSubtext}>
            Please log in to access the PPDS labels system.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Prompt Modal */}
      <Modal
        visible={promptVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePromptCancel}>
        <View style={styles.promptOverlay}>
          <View style={styles.promptContainer}>
            <Text style={styles.promptTitle}>{promptTitle}</Text>
            {promptMessage ? (
              <Text style={styles.promptMessage}>{promptMessage}</Text>
            ) : null}
            <TextInput
              value={promptValue}
              onChangeText={setPromptValue}
              style={styles.promptInput}
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.promptButtons}>
              <TouchableOpacity
                onPress={handlePromptCancel}
                style={[styles.promptButton, styles.promptCancel]}>
                <Text style={styles.promptButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePromptSubmit}
                style={[styles.promptButton, styles.promptSubmit]}>
                <Text style={[styles.promptButtonText, {color: 'white'}]}>
                  Set
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }>
        {/* Enhanced PPDS Header */}
        <View style={styles.ppdsHeader}>
          <View style={styles.ppdsHeaderIcon}>
            <FileText size={32} color="#8A2BE2" />
          </View>
          <Text style={styles.ppdsTitle}>PPDS Labels</Text>
          <Text style={styles.ppdsSubtitle}>
            Pre-Packaged for Direct Sale - UK Food Compliance
          </Text>
          <View style={styles.ppdsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{menuItems.length}</Text>
              <Text style={styles.statLabel}>Menu Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{printQueue.length}</Text>
              <Text style={styles.statLabel}>In Queue</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Printer
                size={20}
                color={connectedDevice ? '#4CAF50' : '#F44336'}
              />
              <Text style={styles.statLabel}>
                {connectedDevice ? 'Ready' : 'No Printer'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items Tab Content */}
        {renderTabContent()}

        {/* Print Queue Section */}
        {renderPrintQueue()}

        {/* Label Preview Section */}
        <View style={styles.previewSection}>
          <View style={styles.previewSectionHeader}>
            <Eye size={24} color="#8A2BE2" />
            <Text style={styles.sectionTitle}>PPDS Label Preview</Text>
          </View>
          <Text style={styles.previewSubtitle}>
            Preview shows exactly what will be printed on each PPDS label
          </Text>
          {renderLabelPreview()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authRequiredText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  authRequiredSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  mainScrollView: {
    flex: 1,
  },
  mainContent: {
    padding: 16,
  },

  // Enhanced PPDS Header
  ppdsHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ppdsHeaderIcon: {
    backgroundColor: '#f0f0ff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  ppdsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  ppdsSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  ppdsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8A2BE2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },

  // Enhanced Tab Content
  tabContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Enhanced Search and Filter
  searchFilterContainer: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  filterControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterButtonActive: {
    backgroundColor: '#8A2BE2',
    borderColor: '#8A2BE2',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  sortButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },

  // Filter Options
  filterOptions: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortOption: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sortOptionActive: {
    backgroundColor: '#8A2BE2',
    borderColor: '#8A2BE2',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#fff',
  },

  // Enhanced Items List
  itemsList: {
    width: '100%',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemMainInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemHeader: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 24,
  },
  itemBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#8A2BE2',
    fontWeight: '500',
    marginLeft: 4,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expiryText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
    marginLeft: 4,
  },
  ingredientsSection: {
    marginTop: 8,
  },
  ingredientsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientTag: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  ingredientText: {
    fontSize: 12,
    color: '#666',
  },
  moreIngredients: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    alignSelf: 'center',
    marginTop: 4,
  },
  itemActions: {
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8A2BE2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Enhanced Print Queue
  queueSection: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  queueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  queueHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  queueCount: {
    backgroundColor: '#f0f0ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  queueCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A2BE2',
  },
  clearQueueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#fed7d7',
    gap: 4,
  },
  clearQueueText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyQueue: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyQueueText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyQueueSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  queueItems: {
    gap: 12,
  },
  queueItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  queueItemInfo: {
    marginBottom: 16,
  },
  queueItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  queueItemType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  queueIngredients: {
    marginTop: 8,
  },
  queueIngredientsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  queueIngredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  queueIngredientTag: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  queueIngredientText: {
    fontSize: 11,
    color: '#666',
  },
  queueItemControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quantityButton: {
    padding: 8,
  },
  quantityDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 8,
  },

  // Enhanced Preview Section
  previewSection: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  previewPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  previewText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  previewScroll: {
    width: '100%',
  },
  previewContainer: {
    marginBottom: 16,
  },

  // Enhanced Loading and Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Enhanced Pagination
  paginationContainer: {
    marginTop: 20,
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  paginationButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // Enhanced Section Titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },

  // Modal Styles
  promptOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  promptContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  promptMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
  },
  promptButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 12,
  },
  promptButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  promptCancel: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  promptSubmit: {
    backgroundColor: '#8A2BE2',
  },
  promptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default PPDSPage;
